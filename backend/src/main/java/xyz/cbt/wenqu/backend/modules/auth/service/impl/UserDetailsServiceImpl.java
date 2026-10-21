package xyz.cbt.wenqu.backend.modules.auth.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import xyz.cbt.wenqu.backend.modules.auth.entity.LoginUser;
import xyz.cbt.wenqu.backend.modules.auth.mapper.AuthMapper;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final AuthMapper authMapper;

    // 构建实体用户
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return authMapper.findUserByUsername(username)
                .map(LoginUser::new)
                .orElseThrow(() -> new UsernameNotFoundException("用户不存在:" + username));
    }
}
