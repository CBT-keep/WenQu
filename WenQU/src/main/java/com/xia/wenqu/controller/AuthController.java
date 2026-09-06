package com.xia.wenqu.controller;

import com.xia.wenqu.common.Result;
import com.xia.wenqu.model.dto.LoginDTO;
import com.xia.wenqu.model.dto.RefreshTokenDTO;
import com.xia.wenqu.model.dto.RegisterDTO;
import com.xia.wenqu.model.vo.LoginVO;
import com.xia.wenqu.model.vo.UserVO;
import com.xia.wenqu.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户相关接口
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    /**
     * 用户登陆
     */
    @PostMapping("/login")
    public Result<LoginVO> login(@Valid @RequestBody LoginDTO loginDTO) {
        log.info("开始用户登陆，登陆用户为: {}", loginDTO.getUsername());

        // 调用服务层进行登陆
        LoginVO loginVO = authService.login(loginDTO);

        return Result.ok(loginVO);
    }

    /**
     * 无感刷新：refresh token 轮换，返回新的双 token
     */
    @PostMapping("/refresh")
    public Result<LoginVO> refresh(@Valid @RequestBody RefreshTokenDTO dto) {
        return Result.ok(authService.refresh(dto.getRefreshToken()));
    }

    /**
     * 用户注册
     */
    @PostMapping("/register")
    public Result<Void> register(@Valid @RequestBody RegisterDTO registerDTO) {
        log.info("开始用户注册，注册用户为: {}", registerDTO.getUsername());
        authService.register(registerDTO);
        return Result.ok();
    }

    /**
     * 当前用户信息
     */
    @GetMapping("/me")
    public Result<UserVO> me() {
        log.info("获取当前用户信息");
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        return Result.ok(authService.getCurrentUser(username));
    }

    /**
     * 用户登出：access token 进 Redis 黑名单，refresh 会话作废
     */
    @PostMapping("/logout")
    public Result<Void> logout(@RequestHeader(value = "Authorization", required = false) String authHeader,
                               @RequestBody(required = false) RefreshTokenDTO dto) {
        log.info("用户登出");
        String accessToken = authHeader != null && authHeader.startsWith("Bearer ")
                ? authHeader.substring(7)
                : null;
        authService.logout(accessToken, dto == null ? null : dto.getRefreshToken());
        return Result.ok();
    }

    /**
     * 秒踢：立即失效目标用户全部已签发 token（管理员操作）
     */
    @PostMapping("/kick/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public Result<Void> kick(@PathVariable Long userId) {
        log.info("管理员发起秒踢：userId={}", userId);
        authService.kick(userId);
        return Result.ok();
    }
}
