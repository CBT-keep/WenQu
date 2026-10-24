package xyz.cbt.wenqu.backend.modules.model.mapper;

import java.math.BigDecimal;

public record ModelUpdate(
        long id, 
        String name, 
        String provider, 
        String baseUrl, 
        String apiKeyCipher,
        String modelName, 
        Integer dimension, 
        BigDecimal temperature, 
        Integer maxTokens,
        int timeoutMs, 
        boolean isDefault, 
        boolean enabled, 
        String extraParamsJson) {
}
