package xyz.cbt.wenqu.backend.utils;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-GCM 加密工具类
 */
@Component
public class CryptoUtil {
    private static final int NONCE_BYTES = 12;
    private static final int TAG_BITS = 128;
    private final SecureRandom random = new SecureRandom();
    private final String configuredKey;

    public CryptoUtil(@Value("${wenqu.crypto.aes-key:}") String configuredKey) {
        this.configuredKey = configuredKey;
    }

    /**
     * 加密明文
     */
    public String encrypt(String plaintext) {
        SecretKeySpec key = key();
        byte[] nonce = new byte[NONCE_BYTES];
        random.nextBytes(nonce);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, nonce));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(nonce.length + encrypted.length)
                    .put(nonce).put(encrypted).array());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("凭据加密失败", e);
        }
    }

    /**
     * 解密密文
     */
    public String decrypt(String encoded) {
        SecretKeySpec key = key();
        try {
            byte[] payload = Base64.getDecoder().decode(encoded);
            if (payload.length < NONCE_BYTES + TAG_BITS / 8) {
                throw new IllegalArgumentException("密文长度不合法");
            }
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, payload, 0, NONCE_BYTES));
            return new String(cipher.doFinal(payload, NONCE_BYTES, payload.length - NONCE_BYTES), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException("凭据解密失败", e);
        }
    }

    /**
     * 获取 AES 密钥
     */
    private SecretKeySpec key() {
        try {
            byte[] decoded = Base64.getDecoder().decode(configuredKey);
            if (decoded.length != 32) throw new IllegalArgumentException();
            return new SecretKeySpec(decoded, "AES");
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("请配置 WENQU_AES_KEY: Base64 编码的 32 字节 AES 密钥");
        }
    }
}
