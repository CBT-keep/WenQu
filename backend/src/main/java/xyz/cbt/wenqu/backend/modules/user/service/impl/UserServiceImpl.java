package xyz.cbt.wenqu.backend.modules.user.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.common.PageResult;
import xyz.cbt.wenqu.backend.modules.auth.entity.LoginUser;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysOperationLog;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysUser;
import xyz.cbt.wenqu.backend.modules.auth.mapper.OperationLogRepository;
import xyz.cbt.wenqu.backend.modules.auth.mapper.RefreshTokenRepository;
import xyz.cbt.wenqu.backend.modules.auth.vo.UserVO;
import xyz.cbt.wenqu.backend.modules.user.dto.UserCreateDTO;
import xyz.cbt.wenqu.backend.modules.user.dto.UserUpdateDTO;
import xyz.cbt.wenqu.backend.modules.user.mapper.UserManageMapper;
import xyz.cbt.wenqu.backend.modules.user.service.UserService;
import xyz.cbt.wenqu.backend.modules.user.vo.ResetPasswordVO;
import xyz.cbt.wenqu.backend.modules.user.vo.UserOptionVO;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserManageMapper userManageMapper;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OperationLogRepository operationLogRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public PageResult<UserVO> page(String keyword, String role, String status, int page, int size) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 100);
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
        long total = userManageMapper.count(kw, role, status);
        List<UserVO> records = userManageMapper
                .search(kw, role, status, safeSize, (safePage - 1) * safeSize)
                .stream()
                .map(UserVO::from)
                .toList();
        return PageResult.of(safePage, safeSize, total, records);
    }

    @Override
    @Transactional
    public UserVO create(UserCreateDTO dto) {
        userManageMapper.findByUsername(dto.getUsername())
                .ifPresent(u -> {
                    throw BizException.usernameTaken();
                });
        validatePassword(dto.getPassword());

        SysUser user = new SysUser();
        user.setUsername(dto.getUsername());
        user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        user.setNickname(dto.getNickname());
        user.setEmail(dto.getEmail());
        user.setRole(dto.getRole());
        user.setStatus(dto.getStatus() != null ? dto.getStatus() : "ENABLED");
        // 管理员建号 → 首次登录强制改密（与种子 admin 一致）
        user.setMustChangePassword(true);
        user.setCreatedBy(currentUserId());
        // NOT NULL DEFAULT now() 的列必须显式赋值（Spring Data JDBC 会把 null 写进 INSERT 顶掉默认值）
        user.setCreatedAt(OffsetDateTime.now());
        user.setUpdatedAt(OffsetDateTime.now());

        SysUser saved = userManageMapper.save(user);
        audit("USER_CREATE", saved.getUsername(), "创建用户，角色 " + saved.getRole());
        return UserVO.from(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public UserVO detail(Long id) {
        return UserVO.from(userManageMapper.findById(id).orElseThrow(BizException::userNotFound));
    }

    @Override
    @Transactional
    public UserVO update(Long id, UserUpdateDTO dto) {
        SysUser user = userManageMapper.findById(id).orElseThrow(BizException::userNotFound);

        if (dto.getNickname() != null) {
            user.setNickname(dto.getNickname());
        }
        if (dto.getEmail() != null) {
            user.setEmail(dto.getEmail());
        }
        if (dto.getRole() != null && !dto.getRole().equals(user.getRole())) {
            // 防自锁：把自己降级成非 SUPERADMIN 会立刻失去用户管理入口
            if (id.equals(currentUserId()) && !"SUPERADMIN".equals(dto.getRole())) {
                throw BizException.badRequest("不能变更自己的角色");
            }
            user.setRole(dto.getRole());
        }
        if (dto.getStatus() != null && !dto.getStatus().equals(user.getStatus())) {
            applyStatus(user, dto.getStatus());
        }
        user.setUpdatedAt(OffsetDateTime.now());

        SysUser saved = userManageMapper.save(user);
        audit("USER_UPDATE", saved.getUsername(), "编辑用户资料");
        return UserVO.from(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (id.equals(currentUserId())) {
            throw BizException.cannotDeleteSelf();
        }
        SysUser user = userManageMapper.findById(id).orElseThrow(BizException::userNotFound);
        userManageMapper.deleteById(id);
        audit("USER_DELETE", user.getUsername(), "删除用户");
    }

    @Override
    @Transactional
    public UserVO changeStatus(Long id, String status) {
        if (id.equals(currentUserId()) && "DISABLED".equals(status)) {
            throw BizException.badRequest("不能禁用自己的账号");
        }
        SysUser user = userManageMapper.findById(id).orElseThrow(BizException::userNotFound);
        applyStatus(user, status);
        user.setUpdatedAt(OffsetDateTime.now());

        SysUser saved = userManageMapper.save(user);
        audit("USER_STATUS", saved.getUsername(), "状态变更为 " + status);
        return UserVO.from(saved);
    }

    @Override
    @Transactional
    public ResetPasswordVO resetPassword(Long id, String newPassword) {
        SysUser user = userManageMapper.findById(id).orElseThrow(BizException::userNotFound);
        String plain = (newPassword == null || newPassword.isBlank())
                ? generateTempPassword()
                : newPassword;
        validatePassword(plain);

        user.setPasswordHash(passwordEncoder.encode(plain));
        user.setMustChangePassword(true);
        user.setUpdatedAt(OffsetDateTime.now());
        userManageMapper.save(user);
        // 改密 / 封禁秒踢：吊销该用户全部 refresh token
        refreshTokenRepository.revokeAllByUserId(id);

        audit("USER_RESET_PASSWORD", user.getUsername(), "重置密码");
        return new ResetPasswordVO(user.getId(), user.getUsername(), plain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserOptionVO> options() {
        List<UserOptionVO> out = new ArrayList<>();
        userManageMapper.findAllOrdered().forEach(u -> out.add(UserOptionVO.from(u)));
        return out;
    }

    // ------------------------------------------------------------ 内部方法

    private void applyStatus(SysUser user, String status) {
        user.setStatus(status);
        if ("DISABLED".equals(status)) {
            refreshTokenRepository.revokeAllByUserId(user.getId());
        }
    }

    /** doc/04 §3.8：8-64 位，且需同时包含字母与数字 */
    private void validatePassword(String raw) {
        boolean hasLetter = raw.chars().anyMatch(Character::isLetter);
        boolean hasDigit = raw.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            throw BizException.badRequest("密码需同时包含字母与数字");
        }
    }

    /** 10 位随机临时密码：字母 + 数字，避开易混淆字符 */
    private String generateTempPassword() {
        String letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
        String digits = "23456789";
        SecureRandom rnd = new SecureRandom();
        StringBuilder sb = new StringBuilder("Wq");
        for (int i = 0; i < 6; i++) {
            sb.append(letters.charAt(rnd.nextInt(letters.length())));
        }
        for (int i = 0; i < 3; i++) {
            sb.append(digits.charAt(rnd.nextInt(digits.length())));
        }
        return sb.toString();
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof LoginUser loginUser) {
            return loginUser.getUserId();
        }
        return null;
    }

    /** 审计落库；失败只记日志，绝不拖垮主流程 */
    private void audit(String action, String target, String detail) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            SysOperationLog entry = new SysOperationLog();
            entry.setUserId(currentUserId());
            entry.setUsername(auth != null && auth.getPrincipal() instanceof LoginUser lu
                    ? lu.getUsername() : null);
            entry.setType("SYSTEM");
            entry.setAction(action);
            entry.setTarget(target);
            entry.setDetail(detail);
            entry.setResult("SUCCESS");
            entry.setCreatedAt(OffsetDateTime.now());
            operationLogRepository.save(entry);
        } catch (Exception e) {
            log.warn("审计日志写入失败：{}", action, e);
        }
    }
}
