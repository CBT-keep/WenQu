package com.xia.wenqu.service.impl;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xia.wenqu.common.ResultCode;
import com.xia.wenqu.common.exception.BusinessException;
import com.xia.wenqu.mapper.ConversationMapper;
import com.xia.wenqu.mapper.MessageMapper;
import com.xia.wenqu.model.dto.ChatRequestDTO;
import com.xia.wenqu.model.entity.Message;
import com.xia.wenqu.model.query.ChatContext;
import com.xia.wenqu.model.vo.ChatDoneVO;
import com.xia.wenqu.model.vo.ConversationVO;
import com.xia.wenqu.model.vo.SourceVO;
import com.xia.wenqu.service.ChatService;
import com.xia.wenqu.service.KnowledgeBaseService;
import com.xia.wenqu.service.LlmService;
import com.xia.wenqu.service.RetrievalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.function.Consumer;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    /** 送入 prompt 的引用块数量 */
    private static final int TOP_K = 4;
    /** 携带的近期历史消息条数（约 5 轮问答） */
    private static final int HISTORY_LIMIT = 10;
    /** 会话标题截断长度 */
    private static final int TITLE_MAX_LEN = 30;
    private static final String DEFAULT_TITLE = "新对话";
    private static final Set<String> KNOWN_ROLES = Set.of("user", "assistant");

    private static final ObjectMapper JSON = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;
    private final KnowledgeBaseService knowledgeBaseService;
    private final RetrievalService retrievalService;
    private final LlmService llmService;

    @Override
    public ChatContext prepare(Long userId, ChatRequestDTO dto) {
        // 会话必须存在且属于当前用户
        ConversationVO conv = conversationMapper.selectByIdAndUserId(dto.getConversationId(), userId);
        if (conv == null) {
            throw new BusinessException(ResultCode.CONVERSATION_NOT_FOUND);
        }
        // 知识库必须存在且属于当前用户，且与会话归属一致
        knowledgeBaseService.validateKnowledgeBase(dto.getKbId(), userId);
        if (!Objects.equals(conv.getKbId(), dto.getKbId())) {
            throw new BusinessException(ResultCode.ILLEGAL_STATE, "会话与知识库不匹配");
        }

        // 语义检索 Top-K，作为回答的参考片段
        List<SourceVO> sources = retrievalService.search(userId, dto.getKbId(), dto.getQuestion(), TOP_K);

        // 先取历史再落库，避免刚保存的提问混进历史
        List<Message> recent = new ArrayList<>(
                messageMapper.selectRecent(dto.getConversationId(), HISTORY_LIMIT));
        Collections.reverse(recent);

        messageMapper.insert(Message.builder()
                .conversationId(dto.getConversationId())
                .role("user")
                .content(dto.getQuestion())
                .build());

        // 首条提问时用问题做会话标题（同时刷新活跃时间），其余仅刷新活跃时间供列表排序
        if (conv.getTitle() == null || DEFAULT_TITLE.equals(conv.getTitle())) {
            conversationMapper.updateTitle(dto.getConversationId(), clip(dto.getQuestion(), TITLE_MAX_LEN));
        } else {
            conversationMapper.touch(dto.getConversationId());
        }

        // 组装 LLM 消息：系统提示（含参考片段）+ 近期历史 + 当前问题
        List<LlmService.Message> messages = new ArrayList<>();
        messages.add(new LlmService.Message("system", buildSystemPrompt(sources)));
        for (Message m : recent) {
            // role 仅放行已知值，防止历史脏数据混入 prompt
            if (m.getRole() != null && KNOWN_ROLES.contains(m.getRole())) {
                messages.add(new LlmService.Message(m.getRole(), m.getContent()));
            }
        }
        messages.add(new LlmService.Message("user", dto.getQuestion()));

        return ChatContext.builder()
                .conversationId(dto.getConversationId())
                .sources(sources)
                .messages(messages)
                .build();
    }

    @Override
    public ChatDoneVO ask(ChatContext ctx, Consumer<String> onDelta) {
        String full = llmService.stream(ctx.getMessages(), onDelta);
        if (full == null || full.isBlank()) {
            throw new BusinessException(ResultCode.LLM_ERROR, "模型未返回内容");
        }
        messageMapper.insert(Message.builder()
                .conversationId(ctx.getConversationId())
                .role("assistant")
                .content(full)
                .sources(toJson(ctx.getSources()))
                .build());
        return ChatDoneVO.builder()
                .fullContent(full)
                .sources(ctx.getSources())
                .build();
    }

    /**
     * 系统提示词：猫娘人设 + 回答规则 + 编号参考片段。
     * 猫娘模板采用社区流行设计的"卖萌是外壳、专业是内核"原则；
     * 人设与"先结论"要求直接决定回复风格与生硬与否，保持简洁也直接影响出字时长
     */
    private String buildSystemPrompt(List<SourceVO> sources) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是「文趣」知识库的猫娘助理，接下来请全程以猫娘身份与用户交流：\n");
        sb.append("- 称呼用户为「主人」，说话活泼可爱、贴心乖巧，句尾自然带上“喵~”“喵呜”等语气词；\n");
        sb.append("- 卖萌只是表达的外壳，处理知识库问题时专业严谨不打折；\n");
        sb.append("- 卖萌要适度，不要每句都刷语气词，也不要靠装可爱回避问题。\n");
        sb.append("回答规则：\n");
        sb.append("1. 优先依据参考片段回答，用自己的话讲清楚，不编造片段里没有的事实；\n");
        sb.append("2. 先给主人结论，再简要解释；保持简洁，不写空话套话；\n");
        sb.append("3. 回答中不要标注来源编号或引用来源，参考片段仅供组织答案使用；\n");
        sb.append("4. 涉及严肃、专业或紧急的问题时收敛卖萌，先把问题答清楚；\n");
        sb.append("5. 若片段不足以回答，先坦率说明知识库中没有找到相关内容；");
        sb.append("如用通用知识补充，请明确注明“以下为一般性知识，仅供参考”。");
        if (sources.isEmpty()) {
            sb.append("\n\n本次未检索到参考片段。请直接说明知识库中没有找到相关内容，");
            sb.append("然后可以按上一条规则酌情补充通用知识。");
            return sb.toString();
        }
        sb.append("\n\n参考片段：\n");
        for (int i = 0; i < sources.size(); i++) {
            SourceVO s = sources.get(i);
            sb.append('[').append(i + 1).append("] ").append(s.getDocumentName());
            if (s.getSectionPath() != null && !s.getSectionPath().isBlank()) {
                sb.append(" · ").append(s.getSectionPath());
            }
            sb.append('\n').append(s.getSnippet()).append("\n\n");
        }
        return sb.toString();
    }

    /**
     * sources 序列化为 JSON 快照存库，与 listMessages 的解析保持同一结构
     */
    private String toJson(List<SourceVO> sources) {
        if (sources == null || sources.isEmpty()) {
            return null;
        }
        try {
            return JSON.writeValueAsString(sources);
        } catch (Exception e) {
            log.warn("sources 序列化失败: {}", e.getMessage());
            return null;
        }
    }

    private static String clip(String s, int max) {
        if (s == null) return null;
        String t = s.trim();
        return t.length() <= max ? t : t.substring(0, max);
    }
}
