package com.xia.wenqu.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 回收站批量操作结果
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecycleBatchResultVO {

    /**
     * 请求处理数
     */
    private int requested;

    /**
     * 成功数
     */
    private int success;

    /**
     * 跳过数（不存在/无权/状态不允许）
     */
    private int skipped;
}
