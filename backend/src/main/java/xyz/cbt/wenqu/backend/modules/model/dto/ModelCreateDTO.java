package xyz.cbt.wenqu.backend.modules.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.ToString;
import tools.jackson.databind.JsonNode;

import java.math.BigDecimal;

/**
 * 新增模型 DTO
 */
@Data
public class ModelCreateDTO {
    @NotBlank(message = "不能为空")
    @Size(max = 64, message = "最多 64 个字符")
    private String name;

    @NotBlank(message = "不能为空")
    @Pattern(regexp = "CHAT|EMBEDDING|RERANK", message = "仅支持 CHAT、EMBEDDING 或 RERANK")
    private String type;

    @NotBlank(message = "不能为空")
    @Pattern(regexp = "openai|dashscope|custom", message = "仅支持 openai、dashscope 或 custom")
    private String provider;

    @NotBlank(message = "不能为空")
    @Size(max = 255, message = "最多 255 个字符")
    private String baseUrl;

    @NotBlank(message = "不能为空")
    @ToString.Exclude
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String apiKey;

    @NotBlank(message = "不能为空")
    @Size(max = 128, message = "最多 128 个字符")
    private String modelName;

    @Positive(message = "必须为正整数")
    private Integer dimension;

    @DecimalMin(value = "0", message = "不能小于 0")
    @DecimalMax(value = "2", message = "不能大于 2")
    @Digits(integer = 1, fraction = 2, message = "最多两位小数")
    private BigDecimal temperature;

    @Positive(message = "必须为正整数")
    private Integer maxTokens;

    @Positive(message = "必须为正整数")
    private Integer timeoutMs;

    private Boolean isDefault;
    private Boolean enabled;
    private JsonNode extraParams;
}
