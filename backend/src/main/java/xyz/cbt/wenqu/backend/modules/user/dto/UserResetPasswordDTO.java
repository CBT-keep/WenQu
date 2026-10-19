package xyz.cbt.wenqu.backend.modules.user.dto;

import lombok.Data;

/**
 * 重置密码：newPassword 可空 —— 留空（null / 空串）则由服务端生成随机临时密码（明文只返回一次）
 * 长度与强度在服务层 validatePassword 统一校验（留空不校验）
 */
@Data
public class UserResetPasswordDTO {

    private String newPassword;
}
