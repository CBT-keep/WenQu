package com.xia.wenqu.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.xia.wenqu.common.PageResult;
import com.xia.wenqu.common.ResultCode;
import com.xia.wenqu.common.exception.BusinessException;
import com.xia.wenqu.mapper.ConversationMapper;
import com.xia.wenqu.mapper.MessageMapper;
import com.xia.wenqu.model.dto.ConversationCreateDTO;
import com.xia.wenqu.model.entity.Conversation;
import com.xia.wenqu.model.entity.Message;
import com.xia.wenqu.model.vo.ConversationVO;
import com.xia.wenqu.model.vo.MessageVO;
import com.xia.wenqu.model.vo.RecycleBatchResultVO;
import com.xia.wenqu.model.vo.RecycleConversationVO;
import com.xia.wenqu.model.vo.SourceVO;
import com.xia.wenqu.service.ConversationService;
import com.xia.wenqu.service.KnowledgeBaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class ConversationServiceImpl implements ConversationService {

    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;
    private final KnowledgeBaseService knowledgeBaseService;

    /**
     * Spring Boot 4 的 Jackson 自动装配面向 Jackson 3（tools.jackson），
     * 容器中没有 com.fasterxml 的 ObjectMapper Bean，这里自建静态实例（readValue 线程安全）
     */
    private static final ObjectMapper JSON = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    /**
     * 创建会话
     */
    @Override
    public ConversationVO create(Long userId, ConversationCreateDTO dto) {
        // 知识库必须存在且属于当前用户
        knowledgeBaseService.validateKnowledgeBase(dto.getKbId(), userId);

        Conversation conv = Conversation.builder()
                .userId(userId)
                .kbId(dto.getKbId())
                .build();
        conversationMapper.insert(conv);
        // title 交给数据库默认值"新对话"，created_at 取库端时间
        return get(conv.getId(), userId);
    }

    /**
     * 会话列表，按最近活跃排序
     */
    @Override
    public PageResult<ConversationVO> list(Long userId, int page, int pageSize) {
        PageHelper.startPage(page, pageSize);
        Page<ConversationVO> pages = conversationMapper.pageQuery(userId, page, pageSize);
        return new PageResult<>(pages.getResult(), pages.getTotal(), page, pageSize);
    }

    /**
     * 会话详情（属主校验）
     */
    @Override
    public ConversationVO get(Long id, Long userId) {
        ConversationVO conv = conversationMapper.selectByIdAndUserId(id, userId);
        if (conv == null) {
            throw new BusinessException(ResultCode.CONVERSATION_NOT_FOUND);
        }
        return conv;
    }

    /**
     * 会话消息列表，时间正序
     */
    @Override
    public PageResult<MessageVO> listMessages(Long id, Long userId, int page, int pageSize) {
        // 先做会话属主校验
        get(id, userId);

        PageHelper.startPage(page, pageSize);
        Page<Message> pages = messageMapper.selectByConversationId(id, page, pageSize);

        List<MessageVO> records = pages.getResult().stream()
                .map(this::toVO)
                .toList();
        return new PageResult<>(records, pages.getTotal(), page, pageSize);
    }

    /**
     * 删除会话（软删除，消息保留）
     */
    @Override
    public void delete(Long id, Long userId) {
        if (conversationMapper.softDelete(id, userId) == 0) {
            throw new BusinessException(ResultCode.CONVERSATION_NOT_FOUND);
        }
    }

    @Override
    public List<RecycleConversationVO> listDeleted(Long userId) {
        return conversationMapper.selectDeletedByUserId(userId);
    }

    @Override
    @Transactional
    public void restore(Long id, Long userId) {
        Conversation conv = conversationMapper.selectDeletedByIdAndUserId(id, userId);
        if (conv == null) {
            throw new BusinessException(ResultCode.CONVERSATION_NOT_FOUND);
        }
        // 所属知识库仍处于软删除状态时不允许单独恢复会话
        try {
            knowledgeBaseService.validateKnowledgeBase(conv.getKbId(), userId);
        } catch (BusinessException e) {
            throw new BusinessException(ResultCode.ILLEGAL_STATE, "所属知识库已删除，请先恢复知识库");
        }
        conversationMapper.restoreById(id);
    }

    @Override
    @Transactional
    public void purge(Long id, Long userId) {
        Conversation conv = conversationMapper.selectDeletedByIdAndUserId(id, userId);
        if (conv == null) {
            throw new BusinessException(ResultCode.CONVERSATION_NOT_FOUND);
        }
        messageMapper.deleteByConversationId(id);
        conversationMapper.deletePhysically(id);
    }

    /**
     * 批量恢复/永久删除：整批共用一个事务，逐条复用单条逻辑并容错跳过
     * （批内为 this 直调，BusinessException 不会触发回滚标记）
     */
    @Override
    @Transactional
    public RecycleBatchResultVO batchRestore(List<Long> ids, Long userId) {
        int success = 0, skipped = 0;
        for (Long id : ids) {
            try {
                restore(id, userId);
                success++;
            } catch (BusinessException e) {
                skipped++;
            }
        }
        return RecycleBatchResultVO.builder().requested(ids.size()).success(success).skipped(skipped).build();
    }

    @Override
    @Transactional
    public RecycleBatchResultVO batchPurge(List<Long> ids, Long userId) {
        int success = 0, skipped = 0;
        for (Long id : ids) {
            try {
                purge(id, userId);
                success++;
            } catch (BusinessException e) {
                skipped++;
            }
        }
        return RecycleBatchResultVO.builder().requested(ids.size()).success(success).skipped(skipped).build();
    }

    /**
     * Message -> MessageVO
     */
    private MessageVO toVO(Message m) {
        return MessageVO.builder()
                .id(m.getId())
                .conversationId(m.getConversationId())
                .role(m.getRole())
                .content(m.getContent())
                .sources(parseSources(m.getSources()))
                .createdAt(m.getCreatedAt() == null
                        ? null
                        : m.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli())
                .build();
    }

    /**
     * sources 列为 JSON 字符串，解析失败不影响消息本体展示
     */
    private List<SourceVO> parseSources(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return JSON.readValue(json, new TypeReference<List<SourceVO>>() {});
        } catch (Exception e) {
            log.warn("sources JSON 解析失败: {}", e.getMessage());
            return null;
        }
    }
}
