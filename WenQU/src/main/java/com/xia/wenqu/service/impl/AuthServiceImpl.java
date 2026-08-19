package com.xia.wenqu.service.impl;

import com.xia.wenqu.common.ResultCode;
import com.xia.wenqu.common.exception.BusinessException;
import com.xia.wenqu.mapper.UserMapper;
import com.xia.wenqu.model.dto.LoginDTO;
import com.xia.wenqu.model.dto.RegisterDTO;
import com.xia.wenqu.model.entity.User;
import com.xia.wenqu.model.vo.LoginVO;
import com.xia.wenqu.model.vo.UserVO;
import com.xia.wenqu.service.AuthService;
import com.xia.wenqu.utils.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    /**
     * 用户登陆
     */
    @Override
    public LoginVO login(LoginDTO loginDTO) {
        // 1. Spring Security 认证（查用户 + 状态检查 + 密码比对）
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginDTO.getUsername(), loginDTO.getPassword()));

        // 2. 认证成功 → 生成 token
        String token = jwtUtil.generateToken(authentication.getName());

        // 3. 查库拿完整用户信息（token 里只有用户名）
        // TODO 这里可以考虑把用户信息缓存到 Redis，减少数据库查询
        User user = userMapper.findByUsername(authentication.getName());

        // 4. 组装返回结果
        return LoginVO.builder()
                .token(token)
                .expiresIn(jwtUtil.getExpireSeconds())
                .user(UserVO.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .nickname(user.getNickname())
                        .role(user.getRole())
                        .build())
                .build();
    }

    /**
     * 用户注册
     */
    @Override
    public void register(RegisterDTO registerDTO) {
        // 1. 用户名防重
        if (userMapper.countByUsername(registerDTO.getUsername()) > 0) {
            throw new BusinessException(ResultCode.USERNAME_EXISTS);
        }
        // 2. 密码加密后入库
        User user = User.builder()
                .username(registerDTO.getUsername())
                .password(passwordEncoder.encode(registerDTO.getPassword()))  // ← BCrypt 加密
                .nickname(registerDTO.getNickname())
                .role("USER")
                .status(1)
                .build();
        userMapper.insert(user);
    }

    /**
     * 查询当前用户信息（token 中用户名 → 查库）
     */
    @Override
    public UserVO getCurrentUser(String username) {
        User user = userMapper.findByUsername(username);
        if (user == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return UserVO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .role(user.getRole())
                .build();
    }

    /**
     * 退出登录
     */
    @Override
    public void logout() {
        // Spring Security 默认不维护会话，这里不需要做任何操作
        // TODO 后续引入Redis后，在这里把 token 加入黑名单，防止被继续使用
        log.info("用户登出成功");
    }
}
