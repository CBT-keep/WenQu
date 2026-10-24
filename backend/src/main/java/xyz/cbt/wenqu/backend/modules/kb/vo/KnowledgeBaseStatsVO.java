package xyz.cbt.wenqu.backend.modules.kb.vo;

import java.time.OffsetDateTime;
import java.util.Map;

public record KnowledgeBaseStatsVO(
        long docCount, 
        long chunkCount, 
        Map<String, Long> docStatus,
        long storageBytes, 
        OffsetDateTime lastIndexedAt, 
        double avgChunkTokens) {
}
