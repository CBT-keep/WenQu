package xyz.cbt.wenqu.backend.modules.kb.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.AssertFalse;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class KnowledgeBaseCreateDTO {
    @NotBlank
    @Size(max = 128)
    private String name;

    @Size(max = 512)
    private String description;

    @NotNull
    private Long embeddingModelId;
    private Long rerankModelId;
    private Integer chunkSize;
    private Integer chunkOverlap;
    private List<String> separators;
    private String retrievalMode;
    private BigDecimal vectorWeight;
    private BigDecimal bm25Weight;
    private Boolean rerankEnabled;
    private Integer topK;
    private BigDecimal scoreThreshold;
    private String visibility;

    private boolean ownerIdProvided;

    @JsonProperty("ownerId")
    public void setOwnerId(Long ignored) {
        ownerIdProvided = true;
    }

    @AssertFalse(message = "ownerId 由服务端确定")
    public boolean isOwnerIdProvided() {
        return ownerIdProvided;
    }
}
