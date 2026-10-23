package xyz.cbt.wenqu.backend.modules.model.mapper;

import lombok.Data;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ModelListProjection(
        Long id, 
        String name, 
        String type, 
        String provider, 
        String baseUrl,
        String modelName, 
        Integer dimension, 
        BigDecimal temperature, 
        Integer maxTokens,
        Integer timeoutMs, 
        Boolean isDefault, 
        Boolean enabled, 
        String extraParamsJson,
        OffsetDateTime createdAt) {
}
