package com.xia.wenqu.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 回收站文档项
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecycleDocVO {

    private Long id;
    private Long kbId;
    private String kbName;
    private String name;
    private String type;
    private Long size;
    private Long chunkCount;
    private Long deletedAt;
}
