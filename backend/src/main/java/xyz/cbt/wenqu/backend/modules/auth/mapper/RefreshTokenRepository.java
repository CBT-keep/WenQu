package xyz.cbt.wenqu.backend.modules.auth.mapper;

import org.springframework.data.jdbc.repository.query.Modifying;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysRefreshToken;

import java.util.Optional;

/**
 * 操作数据库中的刷新令牌
 */
public interface RefreshTokenRepository extends CrudRepository<SysRefreshToken, Long> {

    @Query("SELECT * FROM sys_refresh_token WHERE jti = :jti")
    Optional<SysRefreshToken> findByJti(@Param("jti") String jti);

    @Modifying
    @Query("UPDATE sys_refresh_token SET revoked = true WHERE jti = :jti")
    int revokeByJti(@Param("jti") String jti);

    /**
     * 改密码或者禁用账号时吊销该用户全部令牌
     */
    @Modifying
    @Query("UPDATE sys_refresh_token SET revoked = true WHERE user_id = :userId AND revoked = false")
    int revokeAllByUserId(@Param("userId") Long userId);
}
