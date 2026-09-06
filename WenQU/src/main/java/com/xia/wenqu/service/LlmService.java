package com.xia.wenqu.service;

import java.util.List;
import java.util.function.Consumer;

/**
 * LLM 生成服务：流式调用对话模型，逐段回调输出，返回完整回答
 */
public interface LlmService {

    /**
     * 流式生成
     * @param messages 对话消息（system/user/assistant 按序）
     * @param onDelta  每生成一个可输出片段就回调一次（已剔除思考内容）
     * @return 完整回答文本
     */
    String stream(List<Message> messages, Consumer<String> onDelta);

    /**
     * 对话消息，role 取值 system/user/assistant
     */
    record Message(String role, String content) {}
}
