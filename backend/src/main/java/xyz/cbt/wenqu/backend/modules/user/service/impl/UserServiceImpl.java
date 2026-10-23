package xyz.cbt.wenqu.backend.modules.user.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
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
import xyz.cbt.wenqu.backend.modules.auth.mapper.OperationLogMapper;
import xyz.cbt.wenqu.backend.modules.auth.mapper.AuthMapper;
import xyz.cbt.wenqu.backend.modules.auth.vo.UserVO;
import xyz.cbt.wenqu.backend.modules.user.dto.UserCreateDTO;
import xyz.cbt.wenqu.backend.modules.user.dto.UserUpdateDTO;
import xyz.cbt.wenqu.backend.modules.user.mapper.UserManageMapper;
import xyz.cbt.wenqu.backend.modules.user.service.UserService;
import xyz.cbt.wenqu.backend.modules.user.vo.ResetPasswordVO;
import xyz.cbt.wenqu.backend.modules.user.vo.UserCreateVO;
import xyz.cbt.wenqu.backend.modules.user.vo.UserOptionVO;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 用户管理服务实现类
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserManageMapper userManageMapper;
    private final AuthMapper authMapper;
    private final OperationLogMapper operationLogMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public PageResult<UserVO> page(String keyword, String role, String status, int page, int size) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 100);
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
        long total = userManageMapper.count(kw, role, status);
        List<UserVO> records = userManageMapper
                .search(kw, role, status, safeSize, (long) (safePage - 1) * safeSize)
                .stream()
                .map(UserVO::from)
                .toList();
        return PageResult.of(safePage, safeSize, total, records);
    }

    @Override
    @Transactional
    public UserCreateVO create(UserCreateDTO dto) {
        // 超管唯一且不可创建
        if ("SUPERADMIN".equals(dto.getRole())) {
            throw BizException.badRequest("超级管理员账号不可创建，角色仅支持 USER 或 ADMIN");
        }
        userManageMapper.findByUsername(dto.getUsername())
                .ifPresent(u -> {
                    throw BizException.usernameTaken();
                });

        // 初始密码：留空 → 随机临时密码（明文只返回一次）并强制首登改密；指定 → 默认不强制（可显式开启）
        boolean passwordProvided = dto.getPassword() != null && !dto.getPassword().isBlank();
        String plain = passwordProvided ? dto.getPassword() : generateTempPassword();
        if (passwordProvided) {
            validatePassword(plain);
        }
        boolean mustChange = !passwordProvided || Boolean.TRUE.equals(dto.getMustChangePassword());

        SysUser user = new SysUser();
        user.setUsername(dto.getUsername());
        user.setPasswordHash(passwordEncoder.encode(plain));
        user.setNickname(dto.getNickname());
        user.setEmail(dto.getEmail());
        user.setRole(dto.getRole());
        user.setStatus(dto.getStatus() != null ? dto.getStatus() : "ENABLED");
        user.setMustChangePassword(mustChange);
        user.setCreatedBy(currentUserId());
        // INSERT 显式传入时间，保持返回对象与持久化数据一致
        user.setCreatedAt(OffsetDateTime.now());
        user.setUpdatedAt(OffsetDateTime.now());

        try {
            userManageMapper.insert(user);
        } catch (DuplicateKeyException e) {
            // 预查只能改善提示，数据库唯一约束仍需覆盖并发创建。
            throw BizException.usernameTaken();
        }
        SysUser saved = user;
        audit("USER_CREATE", saved.getUsername(), "创建用户，角色 " + saved.getRole());
        return new UserCreateVO(UserVO.from(saved), passwordProvided ? null : plain);
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
            // 超管唯一且不可晋升：角色只允许 USER / ADMIN
            if ("SUPERADMIN".equals(dto.getRole())) {
                throw BizException.badRequest("超级管理员账号不可创建，角色仅支持 USER 或 ADMIN");
            }
            // 防自锁：自己的角色不可变更（既不能降级，也不能以任何方式变更）
            if (id.equals(currentUserId())) {
                throw BizException.operationNotAllowed("不能变更自己的角色");
            }
            user.setRole(dto.getRole());
        }
        if (dto.getStatus() != null && !dto.getStatus().equals(user.getStatus())) {
            // 与 changeStatus 同一套自锁保护，防止从编辑接口绕过
            assertNotSelfDisabled(id, dto.getStatus());
            applyStatus(user, dto.getStatus());
        }
        user.setUpdatedAt(OffsetDateTime.now());

        userManageMapper.update(user);
        SysUser saved = user;
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
        try {
            if (userManageMapper.deleteById(id) == 0) throw BizException.userNotFound();
        } catch (DataIntegrityViolationException e) {
            throw BizException.operationNotAllowed("用户仍被其他资源引用，请先清理关联资源");
        }
        audit("USER_DELETE", user.getUsername(), "删除用户");
    }

    @Override
    @Transactional
    public UserVO changeStatus(Long id, String status) {
        assertNotSelfDisabled(id, status);
        SysUser user = userManageMapper.findById(id).orElseThrow(BizException::userNotFound);
        applyStatus(user, status);
        user.setUpdatedAt(OffsetDateTime.now());

        userManageMapper.update(user);
        SysUser saved = user;
        audit("USER_STATUS", saved.getUsername(), "状态变更为 " + status);
        return UserVO.from(saved);
    }

    @Override
    @Transactional
    public ResetPasswordVO resetPassword(Long id, String newPassword) {
        if (id.equals(currentUserId())) {
            throw BizException.operationNotAllowed("不能重置自己的密码，请在「修改密码」中自行修改");
        }
        SysUser user = userManageMapper.findById(id).orElseThrow(BizException::userNotFound);
        if ("SUPERADMIN".equals(user.getRole())) {
            throw BizException.operationNotAllowed("超级管理员密码不可重置，请其本人在「修改密码」中修改");
        }
        String plain = (newPassword == null || newPassword.isBlank())
                ? generateTempPassword()
                : newPassword;
        validatePassword(plain);

        user.setPasswordHash(passwordEncoder.encode(plain));
        user.setMustChangePassword(true);
        user.setUpdatedAt(OffsetDateTime.now());
        userManageMapper.update(user);
        // 改密 / 封禁秒踢：吊销该用户全部 refresh token
        authMapper.revokeRefreshTokensByUserId(id);

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

    /**
     * 自锁保护：不能禁用自己的账号，防止误操作
     */
    private void assertNotSelfDisabled(Long id, String status) {
        if ("DISABLED".equals(status) && id.equals(currentUserId())) {
            throw BizException.operationNotAllowed("不能禁用自己的账号");
        }
    }

    private void applyStatus(SysUser user, String status) {
        user.setStatus(status);
        if ("DISABLED".equals(status)) {
            authMapper.revokeRefreshTokensByUserId(user.getId());
        }
    }

    /**
     * 8-64 位，且需同时包含字母与数字（留空不校验，由调用方决定是否随机生成）
     */
    private void validatePassword(String raw) {
        if (raw.length() < 8 || raw.length() > 64) {
            throw BizException.badRequest("密码长度需为 8-64 位");
        }
        boolean hasLetter = raw.chars().anyMatch(Character::isLetter);
        boolean hasDigit = raw.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            throw BizException.badRequest("密码需同时包含字母与数字");
        }
    }

    /**
     * 10 位随机临时密码：字母 + 数字，避开易混淆字符
     */
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

    /**
     * 审计落库；失败只记日志，绝不拖垮主流程
     */
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
            operationLogMapper.insert(entry);
        } catch (Exception e) {
            log.warn("审计日志写入失败：{}", action, e);
        }
    }
}
