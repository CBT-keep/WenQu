package com.xia.wenqu.model.query;

import com.xia.wenqu.model.vo.SourceVO;
import com.xia.wenqu.service.LlmService;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * 聊天问答的中间上下文：prepare 阶段产出（校验、检索、提问落库、prompt 组装），ask 阶段流式消费
 */
@Data
@Builder
public class ChatContext {
    private Long conversationId;
    /** 本次检索到的引用块，随回答一起落库与回传 */
    private List<SourceVO> sources;
    /** 组装好的 LLM 消息序列（system + 近期历史 + 当前问题） */
    private List<LlmService.Message> messages;
}
