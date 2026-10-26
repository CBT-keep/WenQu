package xyz.cbt.wenqu.backend.modules.model.client;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.common.ErrorCode;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelTestVO;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * 小样本探测；不重试、不跟随重定向，不向响应或日志透传上游错误正文
 */
@Component
@RequiredArgsConstructor
public class ModelProbeClient {
    private static final int MAX_RESPONSE_BYTES = 1024 * 1024;
    private static final int DEFAULT_CHAT_MAX_TOKENS = 4096;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NEVER).build();

    public ModelTestVO test(ModelConnection model) {
        long start = System.nanoTime();
        URI endpoint = endpoint(model);
        if (model.apiKey() == null || model.apiKey().isBlank()
                || model.apiKey().chars().anyMatch(c -> c < 32 || c == 127)) {
            throw BizException.badRequest("API Key 不能为空或包含控制字符");
        }
        HttpRequest request;
        try {
            request = HttpRequest.newBuilder(endpoint).timeout(Duration.ofMillis(model.timeoutMs()))
                    .header("Authorization", "Bearer " + model.apiKey()).header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload(model)))).build();
        } catch (IllegalArgumentException e) {
            throw BizException.badRequest("模型请求地址、超时或 API Key 格式不合法");
        }

        // 发送请求并处理响应，使用异步方式，设置超时，捕获异常并返回相应的错误信息
        var pending = http.sendAsync(request, ignored -> new LimitedBodySubscriber());
        HttpResponse<byte[]> response;
        try {
            // 包括连接、响应头和完整响应体，防止已收到响应头但正文迟迟不结束。
            response = pending.get(model.timeoutMs(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            pending.cancel(true);
            throw failed("模型服务请求超时，请检查网络或调整超时设置");
        } catch (InterruptedException e) {
            pending.cancel(true);
            Thread.currentThread().interrupt();
            throw failed("模型连通性测试已中断");
        } catch (ExecutionException e) {
            Throwable cause = e.getCause();
            if (cause instanceof java.net.http.HttpTimeoutException) throw failed("模型服务请求超时，请检查网络或调整超时设置");
            if (cause instanceof ResponseTooLargeException) throw failed("模型服务响应过大，无法完成连通性测试");
            throw failed("无法连接模型服务，请检查地址、网络和 TLS 证书");
        }
        if (response.statusCode() < 200 || response.statusCode() >= 300) throw httpFailure(response.statusCode());
        JsonNode result;
        try {
            result = json.readTree(response.body());
        } catch (JacksonException e) {
            throw failed("模型服务未返回合法 JSON, 请检查接口地址和协议");
        }
        if (result == null || !result.isObject() || result.hasNonNull("error")) throw failed("模型服务返回错误或无效响应");
        // 解析结果，验证模型类型和返回内容
        String echo = switch (model.type()) {
            case "CHAT" -> chatEcho(result);
            case "EMBEDDING" -> { validateEmbedding(result, model.dimension()); yield null; }
            case "RERANK" -> { validateRerank(result); yield null; }
            default -> throw BizException.badRequest("不支持的模型类型");
        };
        String detail = switch (model.type()) {
            case "CHAT" -> "Chat 模型连通正常";
            case "EMBEDDING" -> "Embedding 模型连通正常，维度 " + model.dimension();
            default -> "Rerank 模型连通正常，已验证 2 条文档的重排分数";
        };
        return new ModelTestVO(true, TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start),
                redact(model.modelName(), model.apiKey()), redact(echo, model.apiKey()), detail);
    }

    // 构造请求体，根据模型类型和额外参数生成 JSON 对象，包含模型名称、温度、最大 token 数量、消息或输入等字段
    private ObjectNode payload(ModelConnection model) {
        ObjectNode body = json.createObjectNode();
        if ("CHAT".equals(model.type())) {
            body.put("temperature", model.temperature() == null ? new java.math.BigDecimal("0.7") : model.temperature());
            // 思考模型的预算包含思考过程，不能把探测输出强制压到 64 tokens。
            body.put("max_tokens", model.maxTokens() == null ? DEFAULT_CHAT_MAX_TOKENS : model.maxTokens());
        }
        if (model.extraParams() != null && model.extraParams().isObject()) {
            model.extraParams().properties().forEach(entry -> {
                if (!"rerank_path".equals(entry.getKey())) body.set(entry.getKey(), entry.getValue());
            });
        }
        body.put("model", model.modelName());
        switch (model.type()) {
            case "CHAT" -> {
                if (body.has("max_completion_tokens")) body.remove("max_tokens");
                body.put("stream", false);
                body.put("n", 1);
                body.set("messages", json.valueToTree(List.of(java.util.Map.of("role", "user", "content", "say 1"))));
            }
            case "EMBEDDING" -> {
                body.put("input", "ping");
                body.put("encoding_format", "float");
            }
            case "RERANK" -> {
                body.put("query", "ping");
                body.set("documents", json.valueToTree(List.of("ping", "unrelated text")));
                body.put("top_n", 2);
            }
            default -> throw BizException.badRequest("不支持的模型类型");
        }
        return body;
    }

    private URI endpoint(ModelConnection model) {
        String base = model.baseUrl().replaceAll("/+$", "") + "/";
        String path = switch (model.type()) {
            case "CHAT" -> "chat/completions";
            case "EMBEDDING" -> "embeddings";
            case "RERANK" -> "rerank";
            default -> throw BizException.badRequest("不支持的模型类型");
        };
        if ("RERANK".equals(model.type()) && model.extraParams() != null && model.extraParams().has("rerank_path")) {
            JsonNode configured = model.extraParams().get("rerank_path");
            if (!configured.isTextual() || configured.asText().isBlank()) throw BizException.badRequest("rerank_path 必须为非空接口路径");
            path = configured.asText();
        }
        try {
            URI relative = URI.create(path);
            if (relative.isAbsolute() || relative.getRawAuthority() != null || relative.getRawQuery() != null
                    || relative.getRawFragment() != null) throw new IllegalArgumentException();
            return URI.create(base).resolve(relative);
        } catch (IllegalArgumentException e) {
            throw BizException.badRequest("模型接口路径不合法，rerank_path 只能指定同一服务下的路径");
        }
    }

    private String chatEcho(JsonNode result) {
        JsonNode choices = result.path("choices");
        JsonNode choice = choices.path(0);
        JsonNode message = choice.path("message");
        if (!choices.isArray() || choices.isEmpty() || !message.isObject()) {
            throw failed("模型服务响应结构与 Chat Completions 协议不兼容，请检查接口地址和协议");
        }
        // 即使已有部分文本，length 也说明本次生成被截断，不能作为完整回答通过测试。
        if ("length".equals(choice.path("finish_reason").asText())) {
            throw failed("已连接模型服务，但输出预算耗尽，未完成回答，请增加最大 Token（max_tokens 或 max_completion_tokens）");
        }
        JsonNode content = message.path("content");
        if (content.isTextual() && !content.asText().isBlank()) return content.asText();
        JsonNode reasoning = message.path("reasoning_content");
        if (reasoning.isTextual() && !reasoning.asText().isBlank()) {
            throw failed("已连接模型服务，但仅返回思考内容，未返回最终回答，请增加最大 Token 或检查思考模式配置");
        }
        if (!content.isNull() && !content.isTextual()) {
            throw failed("模型服务响应结构与 Chat Completions 协议不兼容，请检查接口地址和协议");
        }
        throw failed("Chat 模型未返回有效文本，请检查模型输出和生成参数");
    }

    private void validateEmbedding(JsonNode result, Integer dimension) {
        JsonNode data = result.path("data");
        JsonNode vector = data.path(0).path("embedding");
        if (!data.isArray() || data.size() != 1 || !vector.isArray() || vector.isEmpty()
                || !vector.valueStream().allMatch(this::finiteNumber)) throw failed("Embedding 模型未返回有效数值向量");
        if (dimension == null || vector.size() != dimension) {
            throw new BizException(ErrorCode.VECTOR_DIMENSION_MISMATCH,
                    "模型返回向量维度 " + vector.size() + " 与配置维度 " + dimension + " 不一致", 200);
        }
    }

    private void validateRerank(JsonNode result) {
        JsonNode results = result.path("results");
        if (!results.isArray() || results.size() != 2) throw failed("Rerank 模型未返回两条文档的有效重排结果，请检查接口协议");
        var indices = new HashSet<Integer>();
        for (JsonNode item : results) {
            JsonNode index = item.path("index");
            if (!index.isIntegralNumber() || !index.canConvertToInt() || index.asInt() < 0 || index.asInt() > 1
                    || !indices.add(index.asInt()) || !finiteNumber(item.path("relevance_score"))) {
                throw failed("Rerank 模型返回的文档序号或重排分数无效");
            }
        }
    }

    private boolean finiteNumber(JsonNode node) {
        return node.isNumber() && Double.isFinite(node.doubleValue());
    }

    private String redact(String value, String apiKey) {
        if (value == null) return null;
        String safe = value.replace(apiKey, "***");
        return safe.length() <= 1024 ? safe : safe.substring(0, 1024) + "…";
    }

    private BizException failed(String message) {
        return new BizException(ErrorCode.MODEL_TEST_FAILED, message, 200);
    }

    private BizException httpFailure(int status) {
        String detail = switch (status) {
            case 401, 403 -> "鉴权失败，请检查 API Key 和模型访问权限";
            case 404 -> "接口或模型不存在，请检查 Base URL、模型名和接口路径";
            case 429 -> "限流或额度不足，请稍后重试或检查账户额度";
            default -> status >= 300 && status < 400 ? "返回重定向，请直接配置最终服务地址" : "拒绝请求，请检查模型配置和服务状态";
        };
        return failed("模型服务" + detail + "(HTTP " + status + ")");
    }

    private static class ResponseTooLargeException extends IOException {
        ResponseTooLargeException() { super("Model probe response exceeds limit"); }
    }

    // 限制响应体大小的 BodySubscriber，超过限制时取消订阅并抛出异常
    private static class LimitedBodySubscriber implements HttpResponse.BodySubscriber<byte[]> {
        private final HttpResponse.BodySubscriber<byte[]> delegate = HttpResponse.BodySubscribers.ofByteArray();
        private Flow.Subscription subscription;
        private long received;

        public CompletionStage<byte[]> getBody() { return delegate.getBody(); }
        public void onSubscribe(Flow.Subscription subscription) {
            this.subscription = subscription;
            delegate.onSubscribe(subscription);
        }
        public void onNext(List<ByteBuffer> buffers) {
            for (ByteBuffer buffer : buffers) received += buffer.remaining();
            if (received > MAX_RESPONSE_BYTES) {
                subscription.cancel();
                delegate.onError(new ResponseTooLargeException());
            } else delegate.onNext(buffers);
        }
        public void onError(Throwable error) { delegate.onError(error); }
        public void onComplete() { delegate.onComplete(); }
    }
}
