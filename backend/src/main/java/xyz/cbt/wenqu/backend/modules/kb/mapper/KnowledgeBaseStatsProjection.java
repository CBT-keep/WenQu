package xyz.cbt.wenqu.backend.modules.kb.mapper;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * 知识库聚合统计投影：一次查询取回文档数、分片数、占用空间、
 * 最近一次索引完成时间、平均分片 token 数与文档状态分布。
 */
public record KnowledgeBaseStatsProjection(
        Integer docCount,
        Integer chunkCount,
        Long storageBytes,
        OffsetDateTime lastIndexedAt,
        BigDecimal avgChunkTokens,
        String docStatusJson) {
}
