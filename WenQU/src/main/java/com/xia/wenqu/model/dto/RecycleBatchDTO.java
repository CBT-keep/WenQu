package com.xia.wenqu.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/**
 * 回收站批量操作（批量恢复/批量永久删除）参数
 */
@Data
public class RecycleBatchDTO {

    /**
     * 目标文档/知识库 ID 列表
     */
    @NotEmpty(message = "ID 列表不能为空")
    private List<Long> ids;

    /**
     * 当前登录用户的密码，整批只校验一次
     */
    @NotBlank(message = "密码不能为空")
    private String password;
}
