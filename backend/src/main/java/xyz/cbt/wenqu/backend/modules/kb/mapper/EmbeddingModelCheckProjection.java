package xyz.cbt.wenqu.backend.modules.kb.mapper;


 //embedding 模型校验投影：一次取回模型类型、维度与全局维度，供知识库校验「必须是 EMBEDDING 且维度匹配」
public record EmbeddingModelCheckProjection(String type, Integer dimension, Integer globalDimension) {
}
