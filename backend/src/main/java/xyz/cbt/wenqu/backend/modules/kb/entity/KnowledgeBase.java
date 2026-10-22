package xyz.cbt.wenqu.backend.modules.kb.entity;

import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * 知识库实体（kb_knowledge_base）
 * 实体仅内部使用，对外统一用 vo 包下的响应对象。
 */
@Data
public class KnowledgeBase {

    private Long id;
    private String name;
    private String description;
    private Long embeddingModelId;
    private Long rerankModelId;
    private Integer chunkSize;
    private Integer chunkOverlap;
    /** jsonb 数组，MyBatis 侧以字符串读取，需要时由 Service 解析 */
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
