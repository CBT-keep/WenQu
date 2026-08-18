package com.xia.wenqu.service;

import com.xia.wenqu.model.dto.LoginDTO;
import com.xia.wenqu.model.dto.RegisterDTO;
import com.xia.wenqu.model.vo.LoginVO;
import com.xia.wenqu.model.vo.UserVO;

public interface AuthService {
    /**
     * 登录
     */
    LoginVO login(LoginDTO loginDTO);

    /**
     * 注册
     */
    void register(RegisterDTO registerDTO);

    /**
     * 查询当前用户信息（token 中用户名 → 查库）
     */
    UserVO getCurrentUser(String username);

    /**
     * 退出登录
     */
    void logout();
}
