package com.xia.wenqu.service;

import com.xia.wenqu.model.dto.ChatRequestDTO;
import com.xia.wenqu.model.query.ChatContext;
import com.xia.wenqu.model.vo.ChatDoneVO;

import java.util.function.Consumer;

/**
 * 知识库问答：语义检索 → 组装 prompt → 流式生成 → 消息落库
 */
public interface ChatService {

    /**
     * 同步准备阶段：校验会话/知识库归属，检索 Top-K，保存用户提问并更新会话标题与活跃时间，
     * 组装 LLM 消息序列。此阶段抛出的 BusinessException 以标准 JSON 响应返回
     */
    ChatContext prepare(Long userId, ChatRequestDTO dto);

    /**
     * 流式生成阶段：调用 LLM，每生成一个片段回调一次 onDelta；
     * 结束后保存助手消息（含引用快照），返回完整回答
     */
    ChatDoneVO ask(ChatContext ctx, Consumer<String> onDelta);
}
