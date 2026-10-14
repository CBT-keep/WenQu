package xyz.cbt.wenqu.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import xyz.cbt.wenqu.backend.enumeration.AuthResultCode;
import xyz.cbt.wenqu.backend.mapper.UserMapper;
import xyz.cbt.wenqu.backend.modules.entity.SysUser;
import xyz.cbt.wenqu.backend.security.LoginUser;

@Service
@RequiredArgsConstructor
public class AuthUserDetailsService implements UserDetailsService {
    private final UserMapper userMapper;
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        SysUser sysUser = userMapper.selectByUsername(username);
        if (sysUser == null) {
            throw new UsernameNotFoundException(AuthResultCode.BAD_CREDENTIALS.getMessage());
        }
        return new LoginUser(sysUser);
    }
}
