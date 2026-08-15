package com.xia.wenqu.model.vo;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class KBVO {

    private Long id;
    private String name;
    private String description;
    private Integer chunkSize;
    private Integer overlap;
    private Long docCount;
    private Long chunkCount;
    private Long createdAt;
}
