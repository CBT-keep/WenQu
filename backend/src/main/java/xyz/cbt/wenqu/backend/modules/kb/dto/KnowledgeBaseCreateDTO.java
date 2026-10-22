package xyz.cbt.wenqu.backend.modules.kb.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 创建知识库参数
 */
@Data
public class KnowledgeBaseCreateDTO {

    @NotBlank(message = "知识库名称不能为空")
    @Size(max = 128, message = "知识库名称最长 128 字")
    private String name;

    @Size(max = 512, message = "知识库描述最长 512 字")
    private String description;

    @NotNull(message = "向量模型不能为空")
    private Long embeddingModelId;

    private Long rerankModelId;

    @Min(value = 1, message = "分片大小必须大于 0")
    private Integer chunkSize;

    @Min(value = 0, message = "分片重叠不能小于 0")
    private Integer chunkOverlap;

    /** 覆盖默认分隔符；不传使用 doc/03 中 kb_knowledge_base.separators 的默认值 */
    private List<String> separators;

    @Pattern(regexp = "HYBRID|VECTOR|BM25", message = "检索模式仅支持 HYBRID、VECTOR、BM25")
    private String retrievalMode;

    @DecimalMin(value = "0", message = "向量权重不能小于 0")
    @DecimalMax(value = "1", message = "向量权重不能大于 1")
    private BigDecimal vectorWeight;

    @DecimalMin(value = "0", message = "BM25 权重不能小于 0")
    @DecimalMax(value = "1", message = "BM25 权重不能大于 1")
    private BigDecimal bm25Weight;

    private Boolean rerankEnabled;

    @Min(value = 1, message = "topK 必须大于 0")
    private Integer topK;

    @DecimalMin(value = "0", message = "相似度阈值不能小于 0")
    @DecimalMax(value = "1", message = "相似度阈值不能大于 1")
    private BigDecimal scoreThreshold;

    @Pattern(regexp = "PRIVATE|PUBLIC", message = "可见性仅支持 PRIVATE、PUBLIC")
    private String visibility;
}
