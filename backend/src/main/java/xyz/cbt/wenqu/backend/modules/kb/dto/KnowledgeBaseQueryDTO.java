package xyz.cbt.wenqu.backend.modules.kb.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class KnowledgeBaseQueryDTO {
    @Min(1)
    private int page = 1;

    @Min(1)
    @Max(100)
    private int size = 20;

    private String keyword;

    private String status;

    @Min(1)
    private Long ownerId;
}
