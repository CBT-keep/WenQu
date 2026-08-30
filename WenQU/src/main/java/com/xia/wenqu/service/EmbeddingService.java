package com.xia.wenqu.service;

import java.util.List;

/**
 * 向量化接口
 */
public interface EmbeddingService {
    /**
     * 批量文本转向量
     * @param texts 文本列表
     * @return 向量列表
     */
    List<Float[]> embed(List<String> texts);
}
