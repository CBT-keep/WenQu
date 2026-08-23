package com.xia.wenqu.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
