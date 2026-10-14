package xyz.cbt.wenqu.backend.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
@Getter
public class JwtUtil {
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    private final SecretKey secretKey;
    private final Long accessExpiration;
    private final Long refreshExpiration;
    public JwtUtil(@Value("${jwt.secretKey}") String secretKey,
                   @Value("${jwt.access-expiration:7200}")Long accessExpiration,
                   @Value("${jwt.refresh-expiration:604800}") Long refreshExpiration) {
        //密钥不能为空
        if (secretKey == null||secretKey.isBlank()) {
            throw new IllegalArgumentException("Secret key cannot be null");
        }
        this.secretKey = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
        this.accessExpiration = accessExpiration;
        this.refreshExpiration = refreshExpiration;
    }

    /**
     * 生成token
     * @param username
     * @param userId
     * @param type
     * @return
     */
    public String generateToken(String username,Long userId,String type){
        //确定类型--过期时间
        Long ttl = TYPE_REFRESH.equals(type) ? refreshExpiration : accessExpiration;
        Date now = new Date();
        Date exp = new Date(now.getTime() + ttl * 1000);
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(username)
                .claim("uid",userId)
                .claim("typ",type)
                .issuedAt(now)
                .expiration(exp)
                .compact();
    }

    /**
     * 解析token,得到claims
     * @param token
     * @return
     */

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * 类型判断：at/rt
     * @param claims
     * @param type
     * @return
     */
    public boolean isType(Claims claims, String type) {
        return type.equals(claims.get("typ", String.class));
    }
}
