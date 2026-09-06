package com.xia.wenqu.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * 双 token（access/refresh）签发与解析：
 * access 短期、用于请求鉴权；refresh 长期、仅用于换取新 token 对。
 * 每个带 jti，配合 Redis 实现黑名单、refresh 会话管理与秒踢
 */
@Component
public class JwtUtil {

    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    private final SecretKey key;
    private final long accessExpiration;
    private final long refreshExpiration;

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-expiration:1800}") long accessExpiration,
            @Value("${jwt.refresh-expiration:604800}") long refreshExpiration) {
        // 公开仓库里 secret 默认为空，缺失时给出可定位的启动报错而不是晦涩的签名异常
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "JWT 密钥未配置：请在项目根目录 application-local.yaml 填写 jwt.secret，或设置环境变量 JWT_SECRET");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpiration = accessExpiration;
        this.refreshExpiration = refreshExpiration;
    }

    // 生成 token，type 区分 access/refresh
    public String generateToken(String username, Long userId, String type) {
        long ttl = TYPE_REFRESH.equals(type) ? refreshExpiration : accessExpiration;
        Date now = new Date();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())   // jti：黑名单与 refresh 会话的定位键
                .subject(username)
                .claim("uid", userId)
                .claim("typ", type)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + ttl * 1000))   // expiration 单位为秒
                .signWith(key)    // HS256算法签名
                .compact(); // 返回生成的token
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isType(Claims claims, String type) {
        return type.equals(claims.get("typ", String.class));
    }

    /**
     * uid claim：JSON 数字可能反序列化为 Integer 或 Long，统一转 long
     */
    public static long getUserId(Claims claims) {
        Object uid = claims.get("uid");
        return uid instanceof Number ? ((Number) uid).longValue() : 0L;
    }

    public long accessExpireSeconds() {
        return accessExpiration;
    }

    public long refreshExpireSeconds() {
        return refreshExpiration;
    }
}
