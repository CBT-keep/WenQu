package xyz.cbt.wenqu.backend.modules.auth.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import xyz.cbt.wenqu.backend.modules.auth.service.impl.UserDetailsServiceImpl;
import xyz.cbt.wenqu.backend.utils.JwtUtil;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        // 如没有符合条件的请求头，则直接放行
        if(header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 提取token
        String token = header.substring(7);

        // 若没有认证信息，则尝试用token进行认证
        if(SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                String username = jwtUtil.parseToken(token);
                // 必须是 access token：防止拿 refresh token 直接访问业务接口
                if(jwtUtil.validate(token) && jwtUtil.isType(token, JwtUtil.TYPE_ACCESS)) {
                    // 从数据库查
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    // 创建认证信息
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );

                    // 附带请求细节
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // 设置到安全上下文
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            } catch (Exception e) {
                SecurityContextHolder.clearContext();
            }
        }

        // 继续处理请求
        filterChain.doFilter(request, response);
    }
}
