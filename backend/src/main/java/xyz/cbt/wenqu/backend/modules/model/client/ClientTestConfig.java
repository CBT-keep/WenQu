package xyz.cbt.wenqu.backend.modules.model.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ClientTestConfig {
    private String type;
    private String modelName;
    private String baseUrl;
    private String apiKey;
    private BigDecimal temperature;
    private Integer maxTokens;
    private Integer timeoutMs;
    private Integer dimension;
}
