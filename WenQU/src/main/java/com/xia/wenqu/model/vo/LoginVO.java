package com.xia.wenqu.model.vo;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginVO {

    /** access token，请求鉴权用，短期 */
    private String token;
    private Long expiresIn;

    /** refresh token，用于无感刷新，长期 */
    private String refreshToken;
    private Long refreshExpiresIn;

    private UserVO user;
}
