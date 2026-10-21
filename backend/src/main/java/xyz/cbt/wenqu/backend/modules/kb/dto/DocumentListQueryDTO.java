package xyz.cbt.wenqu.backend.modules.kb.dto;

import lombok.Data;

@Data
public class DocumentListQueryDTO {
    private int page = 1;
    private int size = 20;
    private String keyword;
    private String status;
}
