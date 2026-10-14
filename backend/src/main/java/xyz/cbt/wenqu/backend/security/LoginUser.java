package xyz.cbt.wenqu.backend.security;

import org.jspecify.annotations.Nullable;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import xyz.cbt.wenqu.backend.modules.entity.SysUser;

import java.util.Collection;
import java.util.List;

public class LoginUser implements UserDetails {
    private final SysUser sysUser;
    public LoginUser(SysUser sysUser) {
        this.sysUser = sysUser;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(
                new SimpleGrantedAuthority(
                        "ROLE_"+(sysUser.getRole()==null?"USER":sysUser.getRole())
                )
        );
    }

    @Override
    public String getPassword() {
        return sysUser.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return sysUser.getUsername();
    }

    public Long getUserId(){
        return sysUser.getId();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
