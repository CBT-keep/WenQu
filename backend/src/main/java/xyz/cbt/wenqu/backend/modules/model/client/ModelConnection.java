package xyz.cbt.wenqu.backend.modules.model.client;

import tools.jackson.databind.JsonNode;
import java.math.BigDecimal;

/**
 * 单次调用快照，明文凭据只在调用期间使用
 */
public record ModelConnection(
    String type, 
    String baseUrl, 
    String modelName, 
    String apiKey, 
    Integer dimension,
    BigDecimal temperature, 
    Integer maxTokens, 
    int timeoutMs, 
    JsonNode extraParams) {
    @Override
    public String toString() {
        return "ModelConnection[type=" + type + "]";
    }
}
