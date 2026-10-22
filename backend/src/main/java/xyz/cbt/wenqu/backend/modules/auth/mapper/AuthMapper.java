package xyz.cbt.wenqu.backend.modules.auth.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysLoginAttempt;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysRefreshToken;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysSetting;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysUser;

import java.util.Optional;

/**
 * 认证模块的数据访问
 */
@Mapper
public interface AuthMapper {
    Optional<SysUser> findUserByUsername(@Param("username") String username);
    Optional<SysUser> findUserById(@Param("id") Long id);
    int updateProfile(@Param("id") Long id, @Param("nickname") String nickname, @Param("email") String email);
    int updateLastLoginAt(@Param("id") Long id);
    int updatePassword(@Param("id") Long id, @Param("hash") String hash);

    int insertLoginAttempt(SysLoginAttempt attempt);
    long countRecentFailures(@Param("username") String username, @Param("minutes") int minutes);

    Optional<SysRefreshToken> findRefreshTokenByJti(@Param("jti") String jti);
    int insertRefreshToken(SysRefreshToken token);
    int revokeRefreshTokenByJti(@Param("jti") String jti);
    int revokeRefreshTokensByUserId(@Param("userId") Long userId);

    Optional<SysSetting> findSettingByKey(@Param("key") String key);
}
