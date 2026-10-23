package xyz.cbt.wenqu.backend.modules.model.vo;

import tools.jackson.databind.JsonNode;
import xyz.cbt.wenqu.backend.modules.model.mapper.ModelListProjection;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ModelListVO(
        Long id, 
        String name, 
        String type, 
        String provider, 
        String baseUrl,
        String apiKeyMasked, 
        String modelName, 
        Integer dimension, 
        BigDecimal temperature,
        Integer maxTokens, 
        Integer timeoutMs, 
        Boolean isDefault, 
        Boolean enabled,
        JsonNode extraParams, 
        OffsetDateTime createdAt) {

    public static ModelListVO from(ModelListProjection row, JsonNode extraParams) {
        // 密钥仅以密文存储；列表不查询密文，也不从密文推导前后缀。
        return new ModelListVO(row.id(), row.name(), row.type(), row.provider(), row.baseUrl(),
                "****", row.modelName(), row.dimension(), row.temperature(), row.maxTokens(),
                row.timeoutMs(), row.isDefault(), row.enabled(), extraParams, row.createdAt());
    }
}
