package com.xia.wenqu.security;

import com.xia.wenqu.common.ResultCode;
import com.xia.wenqu.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 敏感操作（恢复/永久删除）的登录密码校验
 */
@Component
@RequiredArgsConstructor
public class PasswordVerifier {

    private final PasswordEncoder passwordEncoder;

    /**
     * 校验原始密码是否为当前登录用户的密码，失败抛 PASSWORD_ERROR
     */
    public void verify(LoginUser loginUser, String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()
                || !passwordEncoder.matches(rawPassword, loginUser.getPassword())) {
            throw new BusinessException(ResultCode.PASSWORD_ERROR);
        }
    }
}
