package xyz.cbt.wenqu.backend.modules.model.mapper;

import java.math.BigDecimal;

public record ModelConnectionProjection(
    String type, 
    String baseUrl, 
    String modelName, 
    Integer dimension,
    BigDecimal temperature, 
    Integer maxTokens, 
    Integer timeoutMs, 
    Boolean enabled,
    String extraParamsJson, 
    String apiKeyCipher) {
    @Override
    public String toString() {
        return "ModelConnectionProjection[type=" + type + "]";
    }
}
