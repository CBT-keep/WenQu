package xyz.cbt.wenqu.backend.modules.user.service;

import xyz.cbt.wenqu.backend.common.PageResult;
import xyz.cbt.wenqu.backend.modules.auth.vo.UserVO;
import xyz.cbt.wenqu.backend.modules.user.dto.UserCreateDTO;
import xyz.cbt.wenqu.backend.modules.user.dto.UserUpdateDTO;
import xyz.cbt.wenqu.backend.modules.user.vo.ResetPasswordVO;
import xyz.cbt.wenqu.backend.modules.user.vo.UserCreateVO;
import xyz.cbt.wenqu.backend.modules.user.vo.UserOptionVO;

import java.util.List;

public interface UserService {

    PageResult<UserVO> page(String keyword, String role, String status, int page, int size);

    /**
     * 创建用户；超管唯一不可创建（仅 USER / ADMIN）
     * 初始密码留空 → 生成随机临时密码（明文只返回一次）并强制首登改密；
     * 指定密码 → 默认不强制改密（可由 dto.mustChangePassword 显式开启）
     */
    UserCreateVO create(UserCreateDTO dto);

    UserVO detail(Long id);

    UserVO update(Long id, UserUpdateDTO dto);

    /**
     * 物理删除；关联数据靠各业务表 FK CASCADE
     */
    void delete(Long id);

    /**
     * 启用/禁用；禁用同时吊销该用户全部 refresh token（秒踢）
     */
    UserVO changeStatus(Long id, String status);

    /**
     * 重置密码：newPassword 为空则生成随机临时密码；重置后强制首登改密并秒踢
     * 防自锁：不可重置自己的密码，也不可重置 SUPERADMIN 的密码（走「修改密码」）
     */
    ResetPasswordVO resetPassword(Long id, String newPassword);

    /**
     * 供筛选下拉的精简列表
     */
    List<UserOptionVO> options();
}
