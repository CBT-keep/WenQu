package xyz.cbt.wenqu.backend.modules.kb.mapper;

/**
 * 知识库创建/校验用到的模型只读投影
 */
public record LlmModelProjection(Long id, String name, String type, Integer dimension, Boolean enabled) {
}
