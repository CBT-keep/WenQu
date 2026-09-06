package com.xia.wenqu.security;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Set;

/**
 * 认证相关的 Redis 状态，键设计（全部带 TTL，重启后随 Redis 持久化保留）：
 * - wq:auth:blacklist:{jti}        access token 黑名单（登出/被踢时拉黑，TTL=剩余有效期）
 * - wq:auth:refresh:{uid}:{jti}    refresh token 会话（刷新时轮换校验，TTL=refresh 有效期）
 * - wq:auth:kick:{uid}             秒踢时间戳（签发时间早于它的 access token 一律拒绝）
 */
@Component
@RequiredArgsConstructor
public class RedisTokenStore {

    private static final String BLACKLIST_KEY = "wq:auth:blacklist:";
    private static final String REFRESH_KEY = "wq:auth:refresh:";
    private static final String KICK_KEY = "wq:auth:kick:";

    private final StringRedisTemplate redis;

    /**
     * 拉黑 token：ttl 传剩余有效期（秒），过期自动清除，避免键无限累积
     */
    public void blacklist(String jti, long ttlSeconds) {
        if (jti == null || ttlSeconds <= 0) {
            return;
        }
        redis.opsForValue().set(BLACKLIST_KEY + jti, "1", Duration.ofSeconds(ttlSeconds));
    }

    public boolean isBlacklisted(String jti) {
        return Boolean.TRUE.equals(redis.hasKey(BLACKLIST_KEY + jti));
    }

    public void storeRefresh(Long userId, String jti, long ttlSeconds) {
        redis.opsForValue().set(REFRESH_KEY + userId + ":" + jti, "1", Duration.ofSeconds(ttlSeconds));
    }

    public boolean refreshExists(Long userId, String jti) {
        return Boolean.TRUE.equals(redis.hasKey(REFRESH_KEY + userId + ":" + jti));
    }

    public void deleteRefresh(Long userId, String jti) {
        redis.delete(REFRESH_KEY + userId + ":" + jti);
    }

    /**
     * 秒踢：删除该用户全部 refresh 会话，并记录踢出时间；
     * 已签发的 access token 签发时间早于此即失效（TTL 与 refresh 一致，保证覆盖整个会话周期）
     */
    public void kick(Long userId, long refreshTtlSeconds) {
        Set<String> keys = redis.keys(REFRESH_KEY + userId + ":*");
        if (keys != null && !keys.isEmpty()) {
            redis.delete(keys);
        }
        redis.opsForValue().set(KICK_KEY + userId, String.valueOf(System.currentTimeMillis()),
                Duration.ofSeconds(refreshTtlSeconds));
    }

    /**
     * 该用户被踢出的时间戳（毫秒）；未踢过返回 null
     */
    public Long getKickAt(Long userId) {
        String v = redis.opsForValue().get(KICK_KEY + userId);
        return v == null ? null : Long.valueOf(v);
    }
}
