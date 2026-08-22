package com.xia.wenqu.service.impl;

import com.xia.wenqu.mapper.UserMapper;
import com.xia.wenqu.model.entity.User;
import com.xia.wenqu.security.LoginUser;
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
        return new LoginUser(user);
    }
}