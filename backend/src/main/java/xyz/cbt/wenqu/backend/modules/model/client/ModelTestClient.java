package xyz.cbt.wenqu.backend.modules.model.client;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.modules.model.entity.Model;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelTestVO;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 模型连通性测试客户端（OpenAI 兼容协议）
 *
 * <ul>
 *   <li>CHAT：发送 "ping"，期望返回文本</li>
 *   <li>EMBEDDING：对 "ping" 求向量，校验返回维度 == 配置维度，否则 40006</li>
 *   <li>RERANK：固定 query + 2 条文档重排，校验可返回分数</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class ModelTestClient {
    private static final String TEST_TEXT = "ping";
    private static final String ECHO_TEXT = "pong";
    private static final String RERANK_QUERY = "什么是向量检索？";
    private static final String[] RERANK_DOCS = {
            "向量检索通过嵌入向量的相似度来召回相关文档。",
            "今天天气晴朗，适合出门散步。"
    };

    private static final int MAX_MESSAGE_LEN = 300;

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final JsonMapper jsonMapper;

    /**
     * 连通性测试
     */
    public ModelTestVO test(ClientTestConfig model){
        String type = model.getType() == null ? "" : model.getType().toUpperCase();
        long start = System.currentTimeMillis();
        Probe probe;
        try {
            probe = switch (type) {
                case "CHAT" -> testChat(model);
                case "EMBEDDING" -> testEmbedding(model);
                case "RERANK" -> testRerank(model);
                default -> throw BizException.badRequest("模型类型不合法");
            };
        }  catch (Exception e) {
            throw BizException.modelConnectTestFailed();
        }
        long latencyMs = System.currentTimeMillis() - start;

        ModelTestVO vo = new ModelTestVO();
        vo.setSuccess(true);
        vo.setLatencyMs(latencyMs);
        vo.setModelName(model.getModelName());
        vo.setEcho(probe.echo());
        vo.setDetail(probe.detail());
        return vo;
    }

    /**
     * CHAT：发送 "ping"，期望返回文本
     */
    private Probe testChat(ClientTestConfig model) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("model", model.getModelName());
        List<Map<String, Object>> messages = new ArrayList<>();
        Map<String, Object> oneMsg = new HashMap<>();
        oneMsg.put("role", "user");
        oneMsg.put("content", TEST_TEXT);
        messages.add(oneMsg);
        body.put("messages", messages);

        if (model.getTemperature() != null) {
            body.put("temperature", model.getTemperature().doubleValue());
        }
        if (model.getMaxTokens() != null) {
            body.put("max_tokens", model.getMaxTokens());
        }
        String jsonStr = jsonMapper.writeValueAsString(body);
        JsonNode resp = postJson(model, "/chat/completions", body);
        JsonNode content = resp.path("choices").path(0).path("message").path("content");
        if (!content.isTextual() || content.asText().isBlank()) {
            throw BizException.badRequest("Chat 模型未返回文本内容");
        }
        return new Probe(ECHO_TEXT, "Chat 模型连通正常");
    }

    private Probe testEmbedding(ClientTestConfig model) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("model", model.getModelName());
        body.put("input", TEST_TEXT);

        JsonNode resp = postJson(model, "/embeddings", body);
        JsonNode embedding = resp.path("data").path(0).path("embedding");
        if (!embedding.isArray() || embedding.isEmpty()) {
            throw BizException.badRequest( "Embedding 模型未返回向量");
        }
        int dim = embedding.size();
        if (model.getDimension() != null && dim != model.getDimension()) {
            throw BizException.badRequest("向量维度不匹配：返回 " + dim + "，配置 " + model.getDimension());
        }
        return new Probe(ECHO_TEXT, "Embedding 模型连通正常，维度 " + dim);
    }


    private Probe testRerank(ClientTestConfig model) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("model", model.getModelName());
        body.put("query", RERANK_QUERY);
        List<String> documents = new ArrayList<>();
        for (String doc : RERANK_DOCS) {
            documents.add(doc);
        }
        body.put("documents", documents);

        JsonNode resp = postJson(model, "/rerank", body);
        JsonNode results = resp.path("results");
        if (!results.isArray() || results.size() < RERANK_DOCS.length) {
            throw BizException.badRequest("Rerank 模型未返回完整排序结果");
        }
        for (JsonNode item : results) {
            if (!item.has("relevance_score") && !item.has("score")) {
                throw BizException.badRequest("Rerank 返回结果缺少分数字段");
            }
        }
        return new Probe(ECHO_TEXT, "Rerank 模型连通正常，返回 " + results.size() + " 个分数");
    }


    //map--json
    private JsonNode postJson(ClientTestConfig model, String path, Map<String, Object> body) throws Exception {
        // 拼接完整地址 baseUrl + path
        String url = trimTrailingSlash(model.getBaseUrl()) + path;
        // 取超时时间，默认 15000ms
        int timeoutMs = model.getTimeoutMs() == null ? 15000 : model.getTimeoutMs();

        //把拼好的 Map 转成 JSON 字符串
        String jsonBody = jsonMapper.writeValueAsString(body);

        try {
            // 构建http请求
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofMillis(timeoutMs))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json");

            // 带上 Authorization Bearer token（apiKey）
            String apiKey = model.getApiKey();
            if (apiKey != null && !apiKey.isBlank()) {
                builder.header("Authorization", "Bearer " + apiKey);
            }

            // POST 请求
            HttpRequest request = builder
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            // 发送请求，拿到响应
            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

            // 判断 http 状态码，不是2xx就抛异常（失败 30002）
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw BizException.badRequest("模型测试失败");
            }
            // 把返回的 json字符串 解析成 JsonNode，返回给 testChat / testEmbedding 去读取内容
            return jsonMapper.readTree(response.body());
        } catch (InterruptedException e) {//联通测试被中断
            Thread.currentThread().interrupt();
            throw BizException.modelConnectTestFailed();
        } catch (Exception e) {
            throw BizException.modelConnectTestFailed();
        }
    }

    private static String trimTrailingSlash(String baseUrl) {
        if (baseUrl == null || baseUrl.isEmpty()) {
            return "";
        }
        while (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        return baseUrl;
    }


    private record Probe(String echo, String detail) {
    }
}
