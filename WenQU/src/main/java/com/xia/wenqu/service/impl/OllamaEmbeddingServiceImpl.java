package com.xia.wenqu.service.impl;

import com.xia.wenqu.config.OllamaProperties;
import com.xia.wenqu.service.EmbeddingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class OllamaEmbeddingServiceImpl implements EmbeddingService {

    private final OllamaProperties props;
    private volatile RestClient client;

    @Override
    public List<Float[]> embed(List<String> texts) {
        if (texts == null || texts.isEmpty()) {
            return List.of();
        }
        List<Float[]> all = new ArrayList<>();
        // 按 batchSize 分批，避免单次请求体过大
        for (int i = 0; i < texts.size(); i += props.getBatchSize()) {
            List<String> batch = texts.subList(i,
                    Math.min(i + props.getBatchSize(), texts.size()));
            all.addAll(embedOneBatch(batch));
        }
        return all;
    }

    /**
     * 懒构建单例 client：复用连接，避免每批都新建
     */
    private RestClient client() {
        if (client == null) {
            synchronized (this) {
                if (client == null) {
                    // 连接超时由底层 HttpClient 控制，读超时由 JdkClientHttpRequestFactory 控制
                    HttpClient httpClient = HttpClient.newBuilder()
                            .connectTimeout(Duration.ofSeconds(30))
                            .build();
                    JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
                    factory.setReadTimeout(Duration.ofSeconds(props.getTimeoutSeconds()));
                    client = RestClient.builder()
                            .baseUrl(props.getBaseUrl())
                            .requestFactory(factory)
                            .build();
                }
            }
        }
        return client;
    }

    private List<Float[]> embedOneBatch(List<String> batch) {
        Map<String, Object> body = Map.of(
                "model", props.getModel(),
                "input", batch);

        EmbedResponse resp = client().post()
                .uri("/api/embed")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(EmbedResponse.class);

        if (resp == null || resp.embeddings() == null) {
            throw new IllegalStateException("Ollama 返回为空");
        }
        // 校验返回数量与维度，防止脏数据入库
        if (resp.embeddings().size() != batch.size()) {
            throw new IllegalStateException("Ollama 返回向量数不符，期望 " + batch.size() + " 实际 " + resp.embeddings().size());
        }
        for (List<Float> v : resp.embeddings()) {
            if (v.size() != props.getDimensions()) {
                throw new IllegalStateException("向量维度不符，期望 " + props.getDimensions() + " 实际 " + v.size());
            }
        }
        return resp.embeddings().stream()
                .map(list -> list.toArray(new Float[0]))
                .toList();
    }

    /**
     * 用record反序列化Ollama响应
     */
    record EmbedResponse(List<List<Float>> embeddings) {}
}