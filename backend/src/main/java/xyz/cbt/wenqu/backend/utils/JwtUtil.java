package xyz.cbt.wenqu.backend.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * JWT 签发与校验
 */
@Slf4j
@Component
public class JwtUtil {

    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    private static final String CLAIM_TYPE = "typ";
    private static final String CLAIM_UID = "uid";
    private static final String CLAIM_ROLE = "role";

    private final SecretKey key;
    private final long accessTtlSeconds;
    private final long refreshTtlSeconds;

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-ttl-seconds}") long accessTtlSeconds,
            @Value("${jwt.refresh-token-ttl-seconds}") long refreshTtlSeconds) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTtlSeconds = accessTtlSeconds;
        this.refreshTtlSeconds = refreshTtlSeconds;
    }

    /**
     * 签发访问令牌
     */
    public String generateAccessToken(Long userId, String username, String role) {
        Date now = new Date();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(username)
                .claim(CLAIM_TYPE, TYPE_ACCESS)
                .claim(CLAIM_UID, userId)
                .claim(CLAIM_ROLE, role)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accessTtlSeconds * 1000))
                .signWith(key)
                .compact();
    }

    /**
     * 签发刷新令牌
     */
    public String generateRefreshToken(String jti, String username) {
        Date now = new Date();
        return Jwts.builder()
                .id(jti)
                .subject(username)
                .claim(CLAIM_TYPE, TYPE_REFRESH)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + refreshTtlSeconds * 1000))
                .signWith(key)
                .compact();
    }

    /**
     * 解析用户名
     */
    public String parseToken(String token) {
        return parseClaims(token).getSubject();
    }

    /**
     * 解析 jti，用于关联 sys_refresh_token 记录
     */
    public String parseJti(String token) {
        return parseClaims(token).getId();
    }

    /**
     * 验证 token 类型
     */
    public boolean isType(String token, String expected) {
        try {
            return expected.equals(parseClaims(token).get(CLAIM_TYPE, String.class));
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 验证 token
     */
    public boolean validate(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            log.debug("JWT 校验失败: {}", e.getMessage());
            return false;
        }
    }

    /**
     * 解析 token
     */
    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long getAccessTtlSeconds() {
        return accessTtlSeconds;
    }

    public long getRefreshTtlSeconds() {
        return refreshTtlSeconds;
    }
}
