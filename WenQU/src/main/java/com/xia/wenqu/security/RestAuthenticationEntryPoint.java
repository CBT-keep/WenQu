package com.xia.wenqu.security;

import com.xia.wenqu.common.ResultCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * 未认证/认证失败时返回 JSON 401（与接口文档 §3.1 映射约定一致）
 * token 已过期（JwtAuthenticationFilter 标记）时返回 40101，否则 40100
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        boolean expired = Boolean.TRUE.equals(request.getAttribute(JwtAuthenticationFilter.ATTR_TOKEN_EXPIRED));
        ResultCode rc = expired ? ResultCode.TOKEN_EXPIRED : ResultCode.UNAUTHORIZED;
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(buildBody(rc));
    }

    private String buildBody(ResultCode rc) {
        return "{\"code\":" + rc.getCode() + ",\"message\":\"" + rc.getMessage()
                + "\",\"data\":null,\"timestamp\":" + System.currentTimeMillis() + "}";
    }
}