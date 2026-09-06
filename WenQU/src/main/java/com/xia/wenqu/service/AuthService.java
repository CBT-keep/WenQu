package com.xia.wenqu.service;

import com.xia.wenqu.model.dto.LoginDTO;
import com.xia.wenqu.model.dto.RegisterDTO;
import com.xia.wenqu.model.vo.LoginVO;
import com.xia.wenqu.model.vo.UserVO;

public interface AuthService {
    /**
     * 登录，签发 access + refresh 双 token（refresh 会话登记到 Redis）
     */
    LoginVO login(LoginDTO loginDTO);

    /**
     * 用 refresh token 换取新的双 token（轮换：旧 refresh 作废）
     */
    LoginVO refresh(String refreshToken);

    /**
     * 注册
     */
    void register(RegisterDTO registerDTO);

    /**
     * 查询当前用户信息（token 中用户名 → 查库）
     */
    UserVO getCurrentUser(String username);

    /**
     * 退出登录：access token 进 Redis 黑名单，refresh 会话作废
     */
    void logout(String accessToken, String refreshToken);

    /**
     * 秒踢：删除该用户全部 refresh 会话并记录踢出时间，
     * 其所有已签发 access token 立即失效（管理员操作）
     */
    void kick(Long userId);
}
