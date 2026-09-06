package com.xia.wenqu.service.impl;

import com.xia.wenqu.common.ResultCode;
import com.xia.wenqu.common.exception.BusinessException;
import com.xia.wenqu.mapper.UserMapper;
import com.xia.wenqu.model.dto.LoginDTO;
import com.xia.wenqu.model.dto.RegisterDTO;
import com.xia.wenqu.model.entity.User;
import com.xia.wenqu.model.vo.LoginVO;
import com.xia.wenqu.model.vo.UserVO;
import com.xia.wenqu.security.RedisTokenStore;
import com.xia.wenqu.service.AuthService;
import com.xia.wenqu.utils.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Date;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final RedisTokenStore tokenStore;

    /**
     * 注册邀请码，逗号分隔；留空表示关闭注册
     */
    @Value("${wenqu.register.invite-codes:}")
    private String inviteCodes;

    /**
     * 用户登陆
     */
    @Override
    public LoginVO login(LoginDTO loginDTO) {
        // Spring Security 认证
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginDTO.getUsername(), loginDTO.getPassword()));

        // 认证成功 → 签发双 token
        return issueTokens(authentication.getName());
    }

    /**
     * 无感刷新：校验 refresh 会话存在 → 轮换（旧作废）→ 签发新双 token
     */
    @Override
    public LoginVO refresh(String refreshToken) {
        Claims claims;
        try {
            claims = jwtUtil.parseClaims(refreshToken);
        } catch (ExpiredJwtException e) {
            throw new BusinessException(ResultCode.REFRESH_TOKEN_INVALID, "登录已过期，请重新登录");
        } catch (Exception e) {
            throw new BusinessException(ResultCode.REFRESH_TOKEN_INVALID);
        }
        if (!jwtUtil.isType(claims, JwtUtil.TYPE_REFRESH)) {
            throw new BusinessException(ResultCode.REFRESH_TOKEN_INVALID);
        }

        long userId = JwtUtil.getUserId(claims);
        String jti = claims.getId();
        // Redis 中已不存在：已登出/被踢/轮换过，防重放
        if (!tokenStore.refreshExists(userId, jti)) {
            throw new BusinessException(ResultCode.REFRESH_TOKEN_INVALID, "登录状态已失效，请重新登录");
        }

        // 轮换：旧 refresh 立即作废，防止重放
        tokenStore.deleteRefresh(userId, jti);
        return issueTokens(claims.getSubject());
    }

    /**
     * 签发 access + refresh 并登记 refresh 会话
     */
    private LoginVO issueTokens(String username) {
        User user = userMapper.findByUsername(username);
        if (user == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        if (user.getStatus() == null || user.getStatus() != 1) {
            throw new BusinessException(ResultCode.FORBIDDEN, "账号已被禁用");
        }

        String access = jwtUtil.generateToken(username, user.getId(), JwtUtil.TYPE_ACCESS);
        String refresh = jwtUtil.generateToken(username, user.getId(), JwtUtil.TYPE_REFRESH);
        Claims refreshClaims = jwtUtil.parseClaims(refresh);
        tokenStore.storeRefresh(user.getId(), refreshClaims.getId(), jwtUtil.refreshExpireSeconds());

        return LoginVO.builder()
                .token(access)
                .expiresIn(jwtUtil.accessExpireSeconds())
                .refreshToken(refresh)
                .refreshExpiresIn(jwtUtil.refreshExpireSeconds())
                .user(UserVO.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .nickname(user.getNickname())
                        .role(user.getRole())
                        .build())
                .build();
    }

    /**
     * 用户注册
     */
    @Override
    public void register(RegisterDTO registerDTO) {
        // 邀请码校验：未配置视为关闭注册，配置后必须精确匹配（忽略大小写）
        Set<String> codes = Arrays.stream(inviteCodes.split(","))
                .map(code -> code.trim().toUpperCase(Locale.ROOT))
                .filter(code -> !code.isEmpty())
                .collect(Collectors.toSet());
        if (codes.isEmpty()) {
            throw new BusinessException(ResultCode.INVITE_CODE_INVALID, "当前未开放注册");
        }
        if (registerDTO.getInviteCode() == null
                || !codes.contains(registerDTO.getInviteCode().trim().toUpperCase(Locale.ROOT))) {
            throw new BusinessException(ResultCode.INVITE_CODE_INVALID, "邀请码无效或已失效");
        }

        // 用户名防重
        if (userMapper.countByUsername(registerDTO.getUsername()) > 0) {
            throw new BusinessException(ResultCode.USERNAME_EXISTS);
        }
        // 密码加密后入库
        User user = User.builder()
                .username(registerDTO.getUsername())
                .password(passwordEncoder.encode(registerDTO.getPassword()))  // BCrypt 加密
                .nickname(registerDTO.getNickname())
                .role("USER")
                .status(1)
                .build();
        userMapper.insert(user);
    }

    /**
     * 查询当前用户信息
     */
    @Override
    public UserVO getCurrentUser(String username) {
        User user = userMapper.findByUsername(username);
        if (user == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return UserVO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .role(user.getRole())
                .build();
    }

    /**
     * 退出登录：access 进黑名单（TTL=剩余有效期），refresh 会话作废。
     * 解析失败不报错——登出本身不应因脏 token 失败
     */
    @Override
    public void logout(String accessToken, String refreshToken) {
        if (accessToken != null) {
            try {
                Claims claims = jwtUtil.parseClaims(accessToken);
                long remaining = (claims.getExpiration().getTime() - System.currentTimeMillis()) / 1000;
                tokenStore.blacklist(claims.getId(), remaining);
            } catch (Exception e) {
                log.debug("登出时 access token 解析失败，跳过拉黑: {}", e.getMessage());
            }
        }
        if (refreshToken != null) {
            try {
                Claims claims = jwtUtil.parseClaims(refreshToken);
                if (jwtUtil.isType(claims, JwtUtil.TYPE_REFRESH)) {
                    tokenStore.deleteRefresh(JwtUtil.getUserId(claims), claims.getId());
                }
            } catch (Exception e) {
                log.debug("登出时 refresh token 解析失败，跳过作废: {}", e.getMessage());
            }
        }
        log.info("用户登出成功");
    }

    /**
     * 秒踢：refresh 会话全删 + 记录踢出时间，旧 access token 由过滤器按签发时间拦截
     */
    @Override
    public void kick(Long userId) {
        tokenStore.kick(userId, jwtUtil.refreshExpireSeconds());
        log.info("用户已被秒踢：userId={}", userId);
    }
}
