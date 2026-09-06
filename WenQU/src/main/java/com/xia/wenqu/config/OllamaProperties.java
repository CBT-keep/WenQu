package com.xia.wenqu.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "ollama")
public class OllamaProperties {
    private String baseUrl = "http://localhost:11434";
    /** 向量化模型（文档分块与问题向量化） */
    private String model = "nomic-embed-text";
    private int dimensions = 768;
    private int batchSize = 16;
    private int timeoutSeconds = 120;
}
