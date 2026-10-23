package xyz.cbt.wenqu.backend.modules.auth.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.modules.auth.dto.UpdateProfileDTO;
import xyz.cbt.wenqu.backend.modules.auth.dto.ChangePasswordDTO;
import xyz.cbt.wenqu.backend.modules.auth.dto.LoginDTO;
import xyz.cbt.wenqu.backend.modules.auth.entity.LoginUser;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysLoginAttempt;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysRefreshToken;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysUser;
import xyz.cbt.wenqu.backend.modules.auth.mapper.AuthMapper;
import xyz.cbt.wenqu.backend.modules.auth.service.AuthService;
import xyz.cbt.wenqu.backend.modules.auth.vo.LoginVO;
import xyz.cbt.wenqu.backend.modules.auth.vo.UserVO;
import xyz.cbt.wenqu.backend.utils.JwtUtil;

import java.time.OffsetDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final int DEFAULT_MAX_FAILURES = 5;
    private static final int DEFAULT_LOCK_MINUTES = 30;
    private static final int MAX_USER_AGENT_LEN = 255;

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final AuthMapper authMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    @Transactional
    public LoginVO login(LoginDTO dto, String ip, String userAgent) {
        String username = dto.getUsername().trim();

        int lockMinutes = intSetting("security.lock-minutes", DEFAULT_LOCK_MINUTES);
        int maxFailures = intSetting("security.max-login-failures", DEFAULT_MAX_FAILURES);

        // 连续失败达到最大允许重试次数即锁定
        if (authMapper.countRecentFailures(username, lockMinutes) >= maxFailures) {
            throw BizException.accountLocked(lockMinutes);
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, dto.getPassword()));
            LoginUser loginUser = (LoginUser) authentication.getPrincipal();

            recordAttempt(username, ip, true);
            authMapper.updateLastLoginAt(loginUser.getUserId());
            // 同步内存对象，否则本次登录响应里的 lastLoginAt 还是上一次的值
            loginUser.getUser().setLastLoginAt(OffsetDateTime.now());
            return issueTokens(loginUser, ip, userAgent);
        } catch (DisabledException e) {
            // 账号被禁用时抛出20002
            throw BizException.accountDisabled();
        } catch (LockedException e) {
            throw BizException.accountLocked(lockMinutes);
        } catch (BadCredentialsException e) {
            recordAttempt(username, ip, false);
            throw BizException.badCredentials();
        }
    }

    /**
     * 刷新访问令牌
     * @param refreshToken
     * @return
     */
    @Override
    @Transactional
    public LoginVO refresh(String refreshToken) {
        if (!jwtUtil.validate(refreshToken) || !jwtUtil.isType(refreshToken, JwtUtil.TYPE_REFRESH)) {
            throw BizException.refreshInvalid();
        }

        String jti = jwtUtil.parseJti(refreshToken);
        SysRefreshToken stored = authMapper.findRefreshTokenByJti(jti)
                .orElseThrow(BizException::refreshInvalid);

        if (Boolean.TRUE.equals(stored.getRevoked())
                || stored.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw BizException.refreshInvalid();
        }

        LoginUser loginUser;
        try {
            loginUser = (LoginUser) userDetailsService.loadUserByUsername(jwtUtil.parseToken(refreshToken));
        } catch (UsernameNotFoundException e) {
            throw BizException.refreshInvalid();
        }
        if (!loginUser.isEnabled()) {
            throw BizException.accountDisabled();
        }

        SysUser user = loginUser.getUser();
        // 不轮换refresh token，设计上采用7天内可反复用它换取新的access token
        return LoginVO.builder()
                .tokenType("Bearer")
                .accessToken(jwtUtil.generateAccessToken(user.getId(), user.getUsername(), user.getRole()))
                .refreshToken(refreshToken)
                .expiresIn(jwtUtil.getAccessTtlSeconds())
                .mustChangePassword(loginUser.isMustChangePassword())
                .build();
    }

    /**
     * 注销登录
     * @param userId
     * @param refreshToken
     */
    @Override
    @Transactional
    public void logout(Long userId, String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()
                && jwtUtil.validate(refreshToken)
                && jwtUtil.isType(refreshToken, JwtUtil.TYPE_REFRESH)) {
            String jti = jwtUtil.parseJti(refreshToken);
            authMapper.findRefreshTokenByJti(jti).ifPresent(stored -> {
                if (userId.equals(stored.getUserId())) {
                    authMapper.revokeRefreshTokenByJti(jti);
                }
            });
            return;
        }
        // 未指定 token → 吊销该用户全部令牌
        authMapper.revokeRefreshTokensByUserId(userId);
    }

    @Override
    public UserVO me(Long userId) {
        return authMapper.findUserById(userId).map(this::toUserVO).orElseThrow(BizException::tokenInvalid);
    }

    /**
     * 更新用户资料
     */
    @Override
    @Transactional
    public UserVO updateProfile(Long userId, UpdateProfileDTO dto) {
        authMapper.findUserById(userId).orElseThrow(BizException::tokenInvalid);
        authMapper.updateProfile(userId, dto.getNickname(), dto.getEmail());
        return me(userId);
    }

    /**
     * 修改密码
     */
    @Override
    @Transactional
    public void changePassword(Long userId, ChangePasswordDTO dto) {
        SysUser user = authMapper.findUserById(userId).orElseThrow(BizException::tokenInvalid);

        if (!passwordEncoder.matches(dto.getOldPassword(), user.getPasswordHash())) {
            throw BizException.oldPasswordWrong();
        }

        authMapper.updatePassword(userId, passwordEncoder.encode(dto.getNewPassword()));
        // 更改密码或管理员封禁秒踢
        authMapper.revokeRefreshTokensByUserId(userId);
    }

    /**
     * 发行访问令牌和刷新令牌
     */
    private LoginVO issueTokens(LoginUser loginUser, String ip, String userAgent) {
        String jti = UUID.randomUUID().toString();

        SysRefreshToken record = new SysRefreshToken();
        record.setUserId(loginUser.getUserId());
        record.setJti(jti);
        record.setExpiresAt(OffsetDateTime.now().plusSeconds(jwtUtil.getRefreshTtlSeconds()));
        record.setRevoked(false);
        record.setIp(ip);
        record.setUserAgent(truncate(userAgent, MAX_USER_AGENT_LEN));
        // INSERT 显式传入创建时间
        record.setCreatedAt(OffsetDateTime.now());
        authMapper.insertRefreshToken(record);

        SysUser user = loginUser.getUser();
        return LoginVO.builder()
                .tokenType("Bearer")
                .accessToken(jwtUtil.generateAccessToken(user.getId(), user.getUsername(), user.getRole()))
                .refreshToken(jwtUtil.generateRefreshToken(jti, user.getUsername()))
                .expiresIn(jwtUtil.getAccessTtlSeconds())
                .mustChangePassword(loginUser.isMustChangePassword())
                .user(toUserVO(user))
                .build();
    }

    /**
     * 记录登录尝试
     */
    private void recordAttempt(String username, String ip, boolean success) {
        SysLoginAttempt attempt = new SysLoginAttempt();
        attempt.setUsername(username);
        attempt.setIp(ip);
        attempt.setSuccess(success);
        attempt.setAttemptedAt(OffsetDateTime.now());
        authMapper.insertLoginAttempt(attempt);
    }

    /**
     * 获取系统参数的 int 值，如果不存在则返回默认值
     */
    private int intSetting(String key, int fallback) {
        return authMapper.findSettingByKey(key)
                .map(setting -> {
                    try {
                        return Integer.parseInt(setting.getValue().trim());
                    } catch (Exception e) {
                        log.warn("系统参数 {} 不是整数，使用默认值 {}", key, fallback);
                        return fallback;
                    }
                })
                .orElse(fallback);
    }

    /**
     * 转换成VO
     */
    private UserVO toUserVO(SysUser user) {
        return UserVO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .mustChangePassword(user.getMustChangePassword())
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .build();
    }

    /**
     * 截断字符串
     */
    private String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
