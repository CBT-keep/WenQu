package xyz.cbt.wenqu.backend.modules.kb.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 更新知识库（doc/04 §5.3）：字段同创建均可选，不传表示不修改。
 * 按 doc/04 §1.4 约定独立声明，不与创建 DTO 合并、不抽公共父类。
 */
@Data
public class KnowledgeBaseUpdateDTO {

    @Size(max = 128, message = "名称最长 128 字")
    private String name;

    @Size(max = 512, message = "描述最长 512 字")
    private String description;

    /**
     * 必须是 EMBEDDING 类型且维度等于全局维度，否则 40006
     */
    @Min(value = 1, message = "embeddingModelId 必须为正数")
    private Long embeddingModelId;

    @Min(value = 1, message = "rerankModelId 必须为正数")
    private Long rerankModelId;

    @Min(value = 1)
    private Integer chunkSize;

    @Min(value = 0, message = "chunkOverlap 不能小于 0")
    private Integer chunkOverlap;

    private List<String> separators;

    @Pattern(regexp = "VECTOR|BM25|HYBRID", message = "仅支持 VECTOR / BM25 / HYBRID")
    private String retrievalMode;

    @DecimalMin(value = "0", message = "vectorWeight 需在 0-1 之间")
    @DecimalMax(value = "1", message = "vectorWeight 需在 0-1 之间")
    private BigDecimal vectorWeight;

    @DecimalMin(value = "0", message = "bm25Weight 需在 0-1 之间")
    @DecimalMax(value = "1", message = "bm25Weight 需在 0-1 之间")
    private BigDecimal bm25Weight;

    private Boolean rerankEnabled;

    @Min(value = 1, message = "topK 必须大于 0")
    @Max(value = 100, message = "topK 最大为 100")
    private Integer topK;

    @DecimalMin(value = "0", message = "scoreThreshold 需在 0-1 之间")
    @DecimalMax(value = "1", message = "scoreThreshold 需在 0-1 之间")
    private BigDecimal scoreThreshold;

    @Pattern(regexp = "PRIVATE|PUBLIC", message = "仅支持 PRIVATE / PUBLIC")
    private String visibility;
}
