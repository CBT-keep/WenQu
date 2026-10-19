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

    /**
     * 初始密码：留空（null / 空串）则由服务端生成随机临时密码并强制首次登录改密；
     * 指定密码则默认无需强制改密（可由 mustChangePassword 显式开启）
     * 长度与强度在服务层 validatePassword 统一校验（留空不校验）
     */
    private String password;

    @Size(max = 64, message = "昵称最长 64 字")
    private String nickname;

    @Email(message = "邮箱格式不正确")
    private String email;

    /**
     * 超管唯一且不可创建：仅允许 USER / ADMIN
     */
    @NotBlank(message = "角色不能为空")
    @Pattern(regexp = "USER|ADMIN", message = "超级管理员账号不可创建，角色仅支持 USER 或 ADMIN")
    private String role;

    /**
     * 首次登录强制改密：留空密码时恒为 true，指定密码时默认 false，可显式开启
     */
    private Boolean mustChangePassword;

    @Pattern(regexp = "ENABLED|DISABLED", message = "状态不合法")
    private String status;
}
