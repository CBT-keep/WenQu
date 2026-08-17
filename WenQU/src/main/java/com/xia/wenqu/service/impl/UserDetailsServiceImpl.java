package com.xia.wenqu.service.impl;

import com.xia.wenqu.mapper.UserMapper;
import com.xia.wenqu.model.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserMapper userMapper;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userMapper.findByUsername(username);
        if (user == null) {
            // TODO 抛出错误后续不进行硬编码字符串，而是进行统一的错误码处理
            throw new UsernameNotFoundException("User not found with username: " + username);
        }
        return buildUserDetails(user);
    }

    private UserDetails buildUserDetails(User user) {
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                // TODO 这里的密码需要是加密后的密码，如果是明文密码，需要在注册时进行加密处理
                .password(user.getPassword())
                .disabled(user.getStatus() == null || user.getStatus() != 1)
                .authorities("ROLE_" + (user.getRole() == null ? "USER" : user.getRole()))  // 兜底字段
                .build();
    }
}