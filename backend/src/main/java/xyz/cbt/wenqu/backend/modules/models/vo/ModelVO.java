package xyz.cbt.wenqu.backend.modules.models.vo;

import lombok.Builder;
import lombok.Data;
import xyz.cbt.wenqu.backend.modules.models.entity.LlmModel;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;

@Data
@Builder
public class ModelVO {
    private Long id;
    private String name;
    private String type;
    private String provider;
    private String baseUrl;
    private String apiKeyMasked;
    private String modelName;
    private Integer dimension;
    private BigDecimal temperature;
    private Integer maxTokens;
    private Integer timeoutMs;
    private Boolean isDefault;
    private Boolean enabled;
    private Map<String, Object> extraParams;
    private OffsetDateTime createdAt;

    public static ModelVO from(LlmModel m, String apiKeyRaw, Map<String, Object> extraParams) {
        return ModelVO.builder()
                .id(m.getId())
                .name(m.getName())
                .type(m.getType())
                .provider(m.getProvider())
                .baseUrl(m.getBaseUrl())
                .apiKeyMasked(maskApiKey(apiKeyRaw))
                .modelName(m.getModelName())
                .dimension(m.getDimension())
                .temperature(m.getTemperature())
                .maxTokens(m.getMaxTokens())
                .timeoutMs(m.getTimeoutMs())
                .isDefault(m.getIsDefault())
                .enabled(m.getEnabled())
                .extraParams(extraParams)
                .createdAt(m.getCreatedAt())
                .build();
    }

    /**
     *掩码：前3位+后4位，如：sk-****abcd
     */
    private static String maskApiKey(String apiKey) {
        if (apiKey==null||apiKey.isBlank()){
            return null;
        }
        //解密失败：
        if ("[DECRYPT_FAIL]".equals(apiKey)) {
            return "[解密失败]";
        }
        String key = apiKey.trim();
        if (key.length()<=8){
            return "****";
        }
        return key.substring(0,3)+"****"+key.substring(key.length()-4);
    }
}
