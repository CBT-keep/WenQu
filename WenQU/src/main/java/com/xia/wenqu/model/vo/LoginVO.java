package com.xia.wenqu.model.vo;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginVO {

    private String token;
    private Long expiresIn;
    private UserVO user;
}
