package xyz.cbt.wenqu.backend.modules.auth.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.common.Result;
import xyz.cbt.wenqu.backend.common.log.OpLog;
import xyz.cbt.wenqu.backend.modules.auth.dto.UpdateProfileDTO;
import xyz.cbt.wenqu.backend.modules.auth.dto.ChangePasswordDTO;
import xyz.cbt.wenqu.backend.modules.auth.dto.LoginDTO;
import xyz.cbt.wenqu.backend.modules.auth.dto.RefreshDTO;
import xyz.cbt.wenqu.backend.modules.auth.entity.LoginUser;
import xyz.cbt.wenqu.backend.modules.auth.service.AuthService;
import xyz.cbt.wenqu.backend.modules.auth.vo.LoginVO;
import xyz.cbt.wenqu.backend.modules.auth.vo.UserVO;

/**
 * 认证接口
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 登录
     */
    @OpLog(type = "Login", action = "登录")
    @PostMapping("/login")
    public Result<LoginVO> login(@Valid @RequestBody LoginDTO dto, HttpServletRequest request) {
        return Result.ok(authService.login(dto, clientIp(request), request.getHeader("User-Agent")));
    }

    /**
     * 刷新令牌
     */
    @OpLog(type = "Refresh", action = "刷新令牌")
    @PostMapping("/refresh")
    public Result<LoginVO> refresh(@Valid @RequestBody RefreshDTO dto) {
        return Result.ok(authService.refresh(dto.getRefreshToken()));
    }

    /**
     * 登出同时吊销refreshToken
     */
    @OpLog(type = "Logout", action = "登出")
    @PostMapping("/logout")
    public Result<Void> logout(Authentication authentication,
                               @RequestBody(required = false) RefreshDTO dto) {
        authService.logout(currentUserId(authentication), dto == null ? null : dto.getRefreshToken());
        return Result.ok(null);
    }

    /**
     * 当前用户信息
     * */
    @OpLog(type = "Get", action = "获取当前用户信息")
    @GetMapping("/me")
    public Result<UserVO> me(Authentication authentication) {
        return Result.ok(authService.me(currentUserId(authentication)));
    }

    /**
     * 修改本人密码
     */
    @OpLog(type = "Update", action = "修改本人密码")
    @PutMapping("/me/password")
    public Result<Void> changePassword(Authentication authentication,
                                       @Valid @RequestBody ChangePasswordDTO dto) {
        authService.changePassword(currentUserId(authentication), dto);
        return Result.ok(null);
    }

    /**
     * 修改本人资料
     */
    @OpLog(type = "Update", action = "修改本人资料", recordArgs = false)
    @PutMapping("/me")
    public Result<UserVO> updateProfile(Authentication authentication, @Valid @RequestBody UpdateProfileDTO dto) {
        return Result.ok(authService.updateProfile(currentUserId(authentication), dto));
    }

    private Long currentUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof LoginUser loginUser) {
            return loginUser.getUserId();
        }
        throw BizException.tokenInvalid();
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
