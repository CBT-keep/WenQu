package com.xia.wenqu.security;

import com.xia.wenqu.utils.JwtUtil;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** 请求属性：token 已过期（供 RestAuthenticationEntryPoint 区分 40100/40101） */
    public static final String ATTR_TOKEN_EXPIRED = "wq_token_expired";

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        // 没有Authorization头，或不是Bearer开头，直接放行
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 提取token
        String token = header.substring(7);

        // 若没有认证信息，尝试用token进行认证
        if(SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                if (jwtUtil.validate(token)) {
                    String username = jwtUtil.parseToken(token);

                    // TODO 每次请求都会从数据库进行查库，后续用Redis缓存用户信息，减少数据库压力
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    // 如果用户被禁用，清空SecurityContext并标记请求属性
                    if (!userDetails.isEnabled()) {
                        SecurityContextHolder.clearContext();
                        request.setAttribute(ATTR_TOKEN_EXPIRED, false);  // 或自定义标记
                        filterChain.doFilter(request, response);
                        return;
                    }

                    // 构造已认证的Authentication对象
                    UsernamePasswordAuthenticationToken authToken =
                            new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities()
                    );

                    // 附带请求细节
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // 设置到SecurityContext中
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            } catch (ExpiredJwtException e) {
                // token 已过期：标记请求，由 RestAuthenticationEntryPoint 返回 40101
                SecurityContextHolder.clearContext();
                request.setAttribute(ATTR_TOKEN_EXPIRED, true);
            } catch (Exception e) {
                // token解析或验证失败，直接放行（无认证信息，后续按匿名处理）
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
