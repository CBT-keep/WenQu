package xyz.cbt.wenqu.backend.modules.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserCreateDTO {

    @NotBlank(message = "用户名不能为空")
    @Pattern(regexp = "^[a-zA-Z0-9_]{4,64}$", message = "用户名需为 4-64 位字母、数字或下划线")
    private String username;

    @NotBlank(message = "密码不能为空")
    @Size(min = 8, max = 64, message = "密码长度需为 8-64 位")
    private String password;

    @Size(max = 64, message = "昵称最长 64 字")
    private String nickname;

    @Email(message = "邮箱格式不正确")
    private String email;

    @NotBlank(message = "角色不能为空")
    @Pattern(regexp = "USER|ADMIN|SUPERADMIN", message = "角色不合法")
    private String role;

    @Pattern(regexp = "ENABLED|DISABLED", message = "状态不合法")
    private String status;
}
