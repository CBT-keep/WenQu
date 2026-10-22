package xyz.cbt.wenqu.backend.modules.kb.entity;

import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * 知识库实体（对应 kb_knowledge_base）
 */
@Data
public class KbKnowledgeBase {
    private Long id;
    private String name;
    private String description;
    private Long embeddingModelId;
    private Long rerankModelId;
    private Integer chunkSize;
    private Integer chunkOverlap;
    /** jsonb 列，存 JSON 数组字符串，由 Service 序列化后写入 */
    private String separators;
    private String retrievalMode;
    private BigDecimal vectorWeight;
    private BigDecimal bm25Weight;
    private Integer topK;
    private BigDecimal scoreThreshold;
    private Boolean rerankEnabled;
    private Long ownerId;
    private String visibility;
    private String status;
    private Integer docCount;
    private Integer chunkCount;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
