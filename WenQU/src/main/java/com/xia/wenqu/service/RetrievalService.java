package com.xia.wenqu.service;

import com.xia.wenqu.model.vo.SourceVO;

import java.util.List;

/**
 * 向量检索服务：把用户问题向量化，与知识库分块算相似度，返回最相关的 Top-K
 */
public interface RetrievalService {

    /**
     * 语义检索
     * @param userId 用户 id，用于知识库归属校验
     * @param kbId   知识库 id
     * @param query  用户问题
     * @param topK   返回最相关的 K 条
     * @return 按相似度降序排列的引用块，snippet 为分块原文（后续拼 prompt 也用它）
     */
    List<SourceVO> search(Long userId, Long kbId, String query, int topK);
}
