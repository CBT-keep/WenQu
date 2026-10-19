package xyz.cbt.wenqu.backend.modules.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 编辑用户：username 不可改、无 password（改密走 /password 接口）
 */
@Data
public class UserUpdateDTO {

    @Size(max = 64, message = "昵称最长 64 字")
    private String nickname;

    @Email(message = "邮箱格式不正确")
    private String email;

    /**
     * 超管唯一且不可晋升：仅允许 USER / ADMIN
     */
    @Pattern(regexp = "USER|ADMIN", message = "超级管理员账号不可创建，角色仅支持 USER 或 ADMIN")
    private String role;

    @Pattern(regexp = "ENABLED|DISABLED", message = "状态不合法")
    private String status;
}
