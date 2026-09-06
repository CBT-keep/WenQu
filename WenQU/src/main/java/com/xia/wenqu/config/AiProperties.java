package com.xia.wenqu.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 云端 LLM 接入配置（OpenAI 兼容协议），仅用于聊天问答；
 * 向量化走本地 Ollama（见 OllamaProperties）
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "ai")
public class AiProperties {
    /** OpenAI 兼容根地址，例：https://open.bigmodel.cn/api/paas/v4 */
    private String baseUrl;
    /** 访问密钥，建议通过环境变量注入，避免明文提交仓库 */
    private String apiKey;
    /** 对话生成模型，例：glm-4.6、Qwen/Qwen3-8B、gpt-4o-mini */
    private String chatModel;
    /** 生成温度，0~2；过低回答机械生硬，聊天场景 0.7 左右自然 */
    private Double temperature = 0.7;
    /** 单次回答最大输出 token 数，控制等待时长与费用；留空用服务商默认 */
    private Integer maxTokens;
    /** 调用超时（秒） */
    private int timeoutSeconds = 120;
}
