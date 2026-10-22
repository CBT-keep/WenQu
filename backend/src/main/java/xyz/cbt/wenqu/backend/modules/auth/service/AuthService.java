package xyz.cbt.wenqu.backend.modules.auth.service;

import xyz.cbt.wenqu.backend.modules.auth.dto.UpdateProfileDTO;
import xyz.cbt.wenqu.backend.modules.auth.dto.ChangePasswordDTO;
import xyz.cbt.wenqu.backend.modules.auth.dto.LoginDTO;
import xyz.cbt.wenqu.backend.modules.auth.vo.LoginVO;
import xyz.cbt.wenqu.backend.modules.auth.vo.UserVO;

public interface AuthService {

    /**
     * 登录
     */
    LoginVO login(LoginDTO dto, String ip, String userAgent);

    /**
     * 刷新 token
     */
    LoginVO refresh(String refreshToken);

    /**
     * 登出
     */
    void logout(Long userId, String refreshToken);

    /**
     * 当前用户信息
     */
    UserVO me(Long userId);

    /**
     * 修改本人资料
     */
    UserVO updateProfile(Long userId, UpdateProfileDTO dto);

    /**
     * 修改本人密码
     */
    void changePassword(Long userId, ChangePasswordDTO dto);
}
