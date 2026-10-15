package xyz.cbt.wenqu.backend.modules.auth.vo;

import lombok.Builder;
import lombok.Data;

/**
 * 登录 / 刷新令牌的响应体
 */
@Data
@Builder
public class LoginVO {
    private String tokenType;
    private String accessToken;
    private String refreshToken;
    private long expiresIn;
    private boolean mustChangePassword;
    private UserVO user;
}
