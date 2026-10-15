package xyz.cbt.wenqu.backend.modules.user.service;

import xyz.cbt.wenqu.backend.common.PageResult;
import xyz.cbt.wenqu.backend.modules.auth.vo.UserVO;
import xyz.cbt.wenqu.backend.modules.user.dto.UserCreateDTO;
import xyz.cbt.wenqu.backend.modules.user.dto.UserUpdateDTO;
import xyz.cbt.wenqu.backend.modules.user.vo.ResetPasswordVO;
import xyz.cbt.wenqu.backend.modules.user.vo.UserOptionVO;

import java.util.List;

public interface UserService {

    PageResult<UserVO> page(String keyword, String role, String status, int page, int size);

    /**
     * 创建用户；管理员建号一律 must_change_password=true
     */
    UserVO create(UserCreateDTO dto);

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
     */
    ResetPasswordVO resetPassword(Long id, String newPassword);

    /**
     * 供筛选下拉的精简列表
     */
    List<UserOptionVO> options();
}
