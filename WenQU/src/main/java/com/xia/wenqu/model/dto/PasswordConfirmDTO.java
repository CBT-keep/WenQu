package com.xia.wenqu.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 回收站最终操作（恢复/永久删除）的密码确认参数
 */
@Data
public class PasswordConfirmDTO {

    /**
     * 当前登录用户的密码，后端 BCrypt 校验
     */
    @NotBlank(message = "密码不能为空")
    private String password;
}
