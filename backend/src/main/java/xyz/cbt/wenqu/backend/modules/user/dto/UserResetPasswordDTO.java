package xyz.cbt.wenqu.backend.modules.user.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 重置密码：newPassword 可空 —— 留空则由服务端生成随机临时密码（明文只返回一次）
 */
@Data
public class UserResetPasswordDTO {

    @Size(min = 8, max = 64, message = "密码长度需为 8-64 位")
    private String newPassword;
}
