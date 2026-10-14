package xyz.cbt.wenqu.backend.modules.vo;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginVO {
    private String tokenType;//Bearer
    private String accessToken;
    private String refreshToken;
    private Long expiresIn;
    private boolean mustChangePassword;
    private UserVO user;
}
