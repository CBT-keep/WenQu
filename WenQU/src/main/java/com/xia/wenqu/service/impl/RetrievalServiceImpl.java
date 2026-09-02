package com.xia.wenqu.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xia.wenqu.common.ResultCode;
import com.xia.wenqu.common.exception.BusinessException;
import com.xia.wenqu.mapper.DocChunkMapper;
import com.xia.wenqu.mapper.KnowledgeBaseMapper;
import com.xia.wenqu.model.entity.KnowledgeBase;
import com.xia.wenqu.model.query.ChunkCandidate;
import com.xia.wenqu.model.vo.SourceVO;
import com.xia.wenqu.service.EmbeddingService;
import com.xia.wenqu.service.RetrievalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RetrievalServiceImpl implements RetrievalService {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final DocChunkMapper docChunkMapper;
    private final KnowledgeBaseMapper knowledgeBaseMapper;
    private final EmbeddingService embeddingService;

    // 语义检索：问题向量化 → 余弦相似度 → Top-K
    @Override
    public List<SourceVO> search(Long userId, Long kbId, String query, int topK) {
        // 参数收口
        if (query == null || query.isBlank()) {
            throw new BusinessException(ResultCode.PARAM_ERROR);
        }
        int k = Math.min(Math.max(topK, 1), 20);

        // 归属校验
        KnowledgeBase kb = knowledgeBaseMapper.selectConfigByIdAndUserId(kbId, userId);
        if (kb == null) {
            throw new BusinessException(ResultCode.KB_NOT_FOUND);
        }

        // 问题向量化
        Float[] queryVector = embeddingService.embed(List.of(query)).get(0);

        // 取候选分块
        List<ChunkCandidate> candidates = docChunkMapper.selectCandidatesByKbId(kbId);
        if (candidates.isEmpty()) {
            return List.of();
        }

        /**
         * 余弦相似度计算：两向量夹角的余弦值，1 最相关，0 无关
         */
        record Scored(ChunkCandidate chunk, double score) {}
        List<Scored> scored = new ArrayList<>(candidates.size());
        for (ChunkCandidate c : candidates) {
            float[] vec = parseVector(c.getEmbedding());
            if (vec == null) {
                log.warn("分块 {} 向量解析失败，跳过", c.getId());
                continue;
            }
            scored.add(new Scored(c, cosine(queryVector, vec)));
        }
        scored.sort(Comparator.comparingDouble(Scored::score).reversed());

        return scored.stream()
                .limit(k)
                .map(s -> SourceVO.builder()
                        .documentId(s.chunk().getDocumentId())
                        .documentName(s.chunk().getDocumentName())
                        .sectionPath(s.chunk().getSectionPath())
                        .snippet(s.chunk().getContent())
                        .similarity(round4(s.score()))
                        .build())
                .toList();
    }

    /**
     * 余弦相似度：两向量夹角的余弦值，1 最相关，0 无关
     * 只比方向不比长度，天然对文本长短不敏感
     */
    private double cosine(Float[] a, float[] b) {
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            double x = a[i];
            double y = b[i];
            dot += x * y;
            normA += x * x;
            normB += y * y;
        }
        if (normA == 0 || normB == 0) {
            return 0;
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * 解析入库时手动拼接的 JSON 向量数组
     */
    private float[] parseVector(String json) {
        try {
            return JSON.readValue(json, float[].class);
        } catch (Exception e) {
            return null;
        }
    }

    private double round4(double v) {
        return Math.round(v * 10000) / 10000.0;
    }
}