package com.xia.wenqu.model.vo;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SourceVO {

    private Long documentId;
    private String documentName;
    private String sectionPath;
    private String snippet;
    private Double similarity;
}
