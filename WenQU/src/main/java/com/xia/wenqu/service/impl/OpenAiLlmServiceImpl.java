package com.xia.wenqu.service.impl;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xia.wenqu.common.ResultCode;
import com.xia.wenqu.common.exception.BusinessException;
import com.xia.wenqu.config.AiProperties;
import com.xia.wenqu.service.LlmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.stream.Stream;

/**
 * OpenAI 兼容 /chat/completions 流式调用（SSE：data: {...} 行，data: [DONE] 结束）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OpenAiLlmServiceImpl implements LlmService {

    private static final ObjectMapper JSON = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private final AiProperties props;
    private volatile HttpClient client;

    @Override
    public String stream(List<Message> messages, Consumer<String> onDelta) {
        if (isBlank(props.getBaseUrl()) || isBlank(props.getApiKey()) || isBlank(props.getChatModel())) {
            throw new BusinessException(ResultCode.LLM_ERROR,
                    "云端 AI 未配置完整，请在 application.yaml 填写 ai.base-url、ai.chat-model，并设置环境变量 AI_API_KEY");
        }

        Map<String, Object> body = new HashMap<>();
        body.put("model", props.getChatModel());
        body.put("messages", messages);
        body.put("stream", true);
        // 可选生成参数：不设置时保持服务商默认
        if (props.getTemperature() != null) {
            body.put("temperature", props.getTemperature());
        }
        if (props.getMaxTokens() != null) {
            body.put("max_tokens", props.getMaxTokens());
        }

        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(props.getBaseUrl() + "/chat/completions"))
                    .timeout(Duration.ofSeconds(props.getTimeoutSeconds()))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + props.getApiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body)))
                    .build();

            HttpResponse<Stream<String>> resp = client().send(request, HttpResponse.BodyHandlers.ofLines());
            if (resp.statusCode() != 200) {
                throw new BusinessException(ResultCode.LLM_ERROR,
                        "云端 AI 返回 HTTP " + resp.statusCode() + "：" + clip(readError(resp.body()), 300));
            }
            return drain(resp.body(), onDelta);
        } catch (HttpTimeoutException e) {
            throw new BusinessException(ResultCode.EXTERNAL_TIMEOUT);
        } catch (UncheckedIOException e) {
            // 前端中断连接等情况，保留原始类型，交由上层判断
            throw e;
        } catch (IOException e) {
            log.warn("云端 AI 连接失败: {}", e.getMessage());
            throw new BusinessException(ResultCode.LLM_ERROR, "无法连接云端 AI 服务，请检查 ai.base-url 与网络");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ResultCode.LLM_ERROR, "生成被中断");
        }
    }

    /**
     * 逐行消费 SSE：解析 delta.content 并回调；reasoning_content 与空行跳过；
     * data: [DONE] 为结束标记；流内 error 字段视为失败
     */
    private String drain(Stream<String> lines, Consumer<String> onDelta) {
        ThinkStripper stripper = new ThinkStripper();
        StringBuilder full = new StringBuilder();
        String[] streamError = {null};
        lines.forEach(line -> {
            if (line == null || line.isBlank()) {
                return;
            }
            String trimmed = line.trim();
            if (!trimmed.startsWith("data:")) {
                return;
            }
            String payload = trimmed.substring(5).trim();
            if ("[DONE]".equals(payload)) {
                return;
            }
            ChatChunk chunk;
            try {
                chunk = JSON.readValue(payload, ChatChunk.class);
            } catch (Exception e) {
                log.warn("云端 AI 响应行解析失败: {}", payload);
                return;
            }
            if (chunk.error() != null) {
                String msg = chunk.error().message() != null ? chunk.error().message() : payload;
                streamError[0] = msg;
                return;
            }
            if (chunk.choices() == null || chunk.choices().isEmpty()) {
                return;
            }
            Delta delta = chunk.choices().get(0).delta();
            if (delta == null || delta.content() == null || delta.content().isEmpty()) {
                return;
            }
            String piece = stripper.push(delta.content());
            if (!piece.isEmpty()) {
                full.append(piece);
                onDelta.accept(piece);
            }
        });
        if (streamError[0] != null) {
            throw new BusinessException(ResultCode.LLM_ERROR, clip(streamError[0], 300));
        }
        String tail = stripper.flush();
        if (!tail.isEmpty()) {
            full.append(tail);
            onDelta.accept(tail);
        }
        return full.toString();
    }

    private String readError(Stream<String> lines) {
        StringBuilder sb = new StringBuilder();
        lines.forEach(l -> {
            if (l != null && sb.length() < 500) {
                sb.append(l.trim());
            }
        });
        return sb.toString();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String clip(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }

    private HttpClient client() {
        HttpClient c = client;
        if (c == null) {
            synchronized (this) {
                if (client == null) {
                    client = HttpClient.newBuilder()
                            .connectTimeout(Duration.ofSeconds(30))
                            .build();
                }
                c = client;
            }
        }
        return c;
    }

    record ChatChunk(List<Choice> choices, ErrorBody error) {}
    record Choice(Delta delta) {}
    record Delta(String content) {}
    record ErrorBody(String message) {}

    /**
     * 流式过滤器：剔除思考模型的 <think>…</think> 片段（部分模型经 API 仍可能带出），
     * 兼容标签被分块截断的情况——无法判定的尾部先扣留，与下一片拼接后再判定
     */
    static class ThinkStripper {
        // 字符数组构造，避免源码字面量受编辑器/过滤器影响
        private static final String OPEN = tag('<', "think");
        private static final String CLOSE = tag('/', "think");
        private boolean inThink;
        private boolean trimNext;
        private String carry = "";

        String push(String chunk) {
            String buf = carry + chunk;
            carry = "";
            StringBuilder out = new StringBuilder();
            while (!buf.isEmpty()) {
                if (!inThink) {
                    int open = buf.indexOf(OPEN);
                    if (open < 0) {
                        int keep = partialSuffixLen(buf, OPEN);
                        if (buf.length() > keep) {
                            out.append(emit(buf.substring(0, buf.length() - keep)));
                        }
                        carry = buf.substring(buf.length() - keep);
                        buf = "";
                    } else {
                        out.append(emit(buf.substring(0, open)));
                        buf = buf.substring(open + OPEN.length());
                        inThink = true;
                    }
                } else {
                    int close = buf.indexOf(CLOSE);
                    if (close < 0) {
                        int keep = partialSuffixLen(buf, CLOSE);
                        carry = buf.substring(buf.length() - keep);
                        buf = "";
                    } else {
                        buf = buf.substring(close + CLOSE.length());
                        inThink = false;
                        trimNext = true; // 思考结束后跳过紧随的空行
                    }
                }
            }
            return out.toString();
        }

        /** 流结束时剩余的可输出内容（思考未闭合则丢弃） */
        String flush() {
            return inThink ? "" : carry;
        }

        /** 思考刚结束时跳过片段的前导空白，避免回答开头多出空行 */
        private String emit(String text) {
            if (trimNext) {
                text = text.replaceAll("^\\s+", "");
                if (!text.isEmpty()) {
                    trimNext = false;
                }
            }
            return text;
        }

        private static String tag(char first, String name) {
            return String.valueOf(new char[]{first}) + name + String.valueOf(new char[]{'>'});
        }

        /** 找出 buf 末尾可能是半个标签前缀的最长长度 */
        private static int partialSuffixLen(String buf, String tag) {
            int max = Math.min(tag.length() - 1, buf.length());
            for (int k = max; k > 0; k--) {
                if (buf.endsWith(tag.substring(0, k))) {
                    return k;
                }
            }
            return 0;
        }
    }
}
