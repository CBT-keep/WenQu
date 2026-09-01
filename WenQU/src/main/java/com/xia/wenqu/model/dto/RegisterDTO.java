package com.xia.wenqu.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterDTO {

    @NotBlank(message = "用户名不能为空")
    @Pattern(regexp = "^[A-Za-z0-9_]{2,20}$", message = "用户名格式不合法，长度 2~20，字母数字下划线")
    private String username;

    @NotBlank(message = "密码不能为空")
    @Size(min = 6, max = 32, message = "密码长度需在 6~32 之间")
    private String password;

    /**
     * 注册邀请码，服务端配置校验，防批量注册
     */
    @NotBlank(message = "邀请码不能为空")
    private String inviteCode;

    @Size(max = 32)
    private String nickname;
}
