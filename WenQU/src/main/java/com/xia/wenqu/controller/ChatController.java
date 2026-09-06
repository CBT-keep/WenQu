package com.xia.wenqu.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xia.wenqu.common.ResultCode;
import com.xia.wenqu.common.exception.BusinessException;
import com.xia.wenqu.model.dto.ChatRequestDTO;
import com.xia.wenqu.model.query.ChatContext;
import com.xia.wenqu.model.vo.ChatDoneVO;
import com.xia.wenqu.security.LoginUser;
import com.xia.wenqu.service.ChatService;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * 聊天问答（SSE 流式）
 * 前端按 "event: xxx\ndata: {...}\n\n" 解析（冒号后必须带空格，与 Spring SseEmitter 的
 * 无空格格式不同，故直接手写线协议）。事件序列：
 *   meta  → {conversationId}
 *   delta → {content}
 *   done  → {fullContent, sources}
 *   error → {message}
 */
@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ChatController {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final ChatService chatService;

    @PostMapping("/chat/stream")
    public void chat(@Valid @RequestBody ChatRequestDTO dto,
                     @AuthenticationPrincipal LoginUser loginUser,
                     HttpServletResponse response) throws IOException {
        // 同步阶段（校验/检索/提问落库）：失败直接走全局异常处理，返回标准 JSON
        ChatContext ctx = chatService.prepare(loginUser.getUserId(), dto);

        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("text/event-stream;charset=UTF-8");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("X-Accel-Buffering", "no");

        ServletOutputStream out = response.getOutputStream();
        try {
            writeEvent(out, "meta", Map.of("conversationId", ctx.getConversationId()));
            ChatDoneVO done = chatService.ask(ctx, delta -> {
                try {
                    writeEvent(out, "delta", Map.of("content", delta));
                } catch (IOException e) {
                    // 客户端断开时中断生成
                    throw new UncheckedIOException(e);
                }
            });
            writeEvent(out, "done", done);
        } catch (BusinessException e) {
            log.warn("聊天生成失败: code={}, message={}", e.getCode(), e.getMessage());
            writeQuietly(out, "error", Map.of("code", e.getCode(), "message", e.getMessage()));
        } catch (UncheckedIOException e) {
            log.debug("客户端断开，聊天流中止", e);
        } catch (Exception e) {
            log.error("聊天流式生成异常", e);
            writeQuietly(out, "error", Map.of("message", ResultCode.INTERNAL_ERROR.getMessage()));
        }
        out.flush();
    }

    /**
     * 手写 SSE 事件：event 与 data 冒号后必须带一个空格，data 必须为单行 JSON
     */
    private void writeEvent(ServletOutputStream out, String event, Object data) throws IOException {
        out.write(("event: " + event + "\ndata: " + JSON.writeValueAsString(data) + "\n\n")
                .getBytes(StandardCharsets.UTF_8));
        out.flush();
    }

    private void writeQuietly(ServletOutputStream out, String event, Object data) {
        try {
            writeEvent(out, event, data);
        } catch (Exception ignored) {
        }
    }
}
