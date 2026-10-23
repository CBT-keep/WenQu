package xyz.cbt.wenqu.backend.modules.model.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Model {
    private Long id;
    private String name;
    private String type;
    private String provider;
    private String baseUrl;
    private String apiKeyCipher;//明文API Key，仅内部调用模型时使用，返回掩码
    private String modelName;
    private Integer dimension;
    private BigDecimal temperature;
    private Integer maxTokens;
    private Integer timeoutMs;
    private Boolean isDefault;
    private Boolean enabled;
    private String extraParams;//map
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
