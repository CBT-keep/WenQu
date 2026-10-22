package xyz.cbt.wenqu.backend.modules.models.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
public class ModelCreateDTO {
    @NotBlank(message = "name不能为空")
    @Size(max = 64, message = "name长度不能超过64")
    private String name;

    @NotBlank(message = "type不能为空")
    @Pattern(regexp = "CHAT|EMBEDDING|RERANK", message = "models的type仅支持CHAT或EMBEDDING或RERANK")
    private String type;

    @Pattern(regexp = "openai|dashscope|custom", message = "provider仅支持openai或dashscope或custom")
    private String provider;

    @NotBlank(message = "baseUrl不能为空")
    @Size(max = 255, message = "baseUrl长度不能超过255")
    private String baseUrl;

    @NotBlank(message = "apiKey不能为空")
    @Size(max = 512, message = "apiKey长度不能超过512")
    private String apiKey;

    @NotBlank(message = "modelName不能为空")
    @Size(max = 128, message = "modelName长度不能超过128")
    private String modelName;

    /* EMBEDDING 必填：向量维度 */
    private Integer dimension;

    /* 默认 0.7（CHAT） */
    @DecimalMin(value = "0", message = "temperature不能小于0")
    @DecimalMax(value = "2", message = "temperature不能大于2")
    private BigDecimal temperature;

    /* 默认 4096（CHAT） */
    @Min(value = 1, message = "maxTokens必须大于0")
    private Integer maxTokens;

    /* 默认 60000 */
    @Min(value = 1, message = "timeoutMs必须大于0")
    private Integer timeoutMs;

    /* 默认 false */
    private Boolean isDefault;

    private Boolean enabled;

    /* 供应商特有参数 */
    private Map<String, Object> extraParams;
}
