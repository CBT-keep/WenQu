package xyz.cbt.wenqu.backend.modules.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import xyz.cbt.wenqu.backend.common.PageResult;
import xyz.cbt.wenqu.backend.common.Result;
import xyz.cbt.wenqu.backend.modules.auth.vo.UserVO;
import xyz.cbt.wenqu.backend.modules.user.dto.UserCreateDTO;
import xyz.cbt.wenqu.backend.modules.user.dto.UserResetPasswordDTO;
import xyz.cbt.wenqu.backend.modules.user.dto.UserStatusDTO;
import xyz.cbt.wenqu.backend.modules.user.dto.UserUpdateDTO;
import xyz.cbt.wenqu.backend.modules.user.service.UserService;
import xyz.cbt.wenqu.backend.modules.user.vo.ResetPasswordVO;
import xyz.cbt.wenqu.backend.modules.user.vo.UserOptionVO;

import java.util.List;

/**
 * 用户管理
 * 类级限制 SUPERADMIN；仅 /options 放宽到 ADMIN（方法级覆盖类级）。
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPERADMIN')")
public class UserController {

    private final UserService userService;

    @GetMapping
    public Result<PageResult<UserVO>> page(@RequestParam(defaultValue = "1") int page,
                                           @RequestParam(defaultValue = "20") int size,
                                           @RequestParam(required = false) String keyword,
                                           @RequestParam(required = false) String role,
                                           @RequestParam(required = false) String status) {
        return Result.ok(userService.page(keyword, role, status, page, size));
    }

    /**
     * 创建成功返回 201
     */
    @PostMapping
    public ResponseEntity<Result<UserVO>> create(@Valid @RequestBody UserCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Result.ok(userService.create(dto)));
    }

    @GetMapping("/{id}")
    public Result<UserVO> detail(@PathVariable Long id) {
        return Result.ok(userService.detail(id));
    }

    @PutMapping("/{id}")
    public Result<UserVO> update(@PathVariable Long id, @Valid @RequestBody UserUpdateDTO dto) {
        return Result.ok(userService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return Result.ok(null);
    }

    @PutMapping("/{id}/status")
    public Result<UserVO> changeStatus(@PathVariable Long id, @Valid @RequestBody UserStatusDTO dto) {
        return Result.ok(userService.changeStatus(id, dto.getStatus()));
    }

    /**
     * 重置密码：body 可空（留空由服务端生成临时密码），新密码明文只返回这一次
     */
    @PutMapping("/{id}/password")
    public Result<ResetPasswordVO> resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) UserResetPasswordDTO dto) {
        return Result.ok(userService.resetPassword(id, dto == null ? null : dto.getNewPassword()));
    }

    /**
     * 供筛选下拉的精简列表：ADMIN 及以上可用
     */
    @GetMapping("/options")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    public Result<List<UserOptionVO>> options() {
        return Result.ok(userService.options());
    }
}
