package com.xia.wenqu.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 回收站知识库项
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecycleKbVO {

    private Long id;
    private String name;
    private String description;
    private Long docCount;
    private Long deletedAt;
}
