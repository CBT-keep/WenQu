package xyz.cbt.wenqu.backend.modules.kb.vo;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * 知识库统计
 */
@Data
@Builder
public class KnowledgeBaseStatsVO {
    private Integer docCount;
    private Integer chunkCount;
    private Map<String, Integer> docStatus;
    private Long storageBytes;
    private OffsetDateTime lastIndexedAt;
    private Integer avgChunkTokens;
}
