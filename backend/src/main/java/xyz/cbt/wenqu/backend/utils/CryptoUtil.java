package xyz.cbt.wenqu.backend.utils;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.common.ErrorCode;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-GCM 加密工具
 * 加密apiKey
 */
@Slf4j
@Component
public class CryptoUtil {
    private static final int IV_LENGTH = 12;
    private static final int TAG_BITS = 128;

    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public CryptoUtil(@Value("${crypto.aes-key:CHANGE-ME-placeholder-secret}") String secret) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(secret.getBytes(StandardCharsets.UTF_8));
            this.key = new SecretKeySpec(digest, "AES");
        } catch (Exception e) {
            log.error("AES密钥初始化失败", e);
            throw BizException.badRequest("AES密钥初始化失败");
        }
    }

    /**
     * AES-GCM 加密
     * 返回 base64 字符串，结构：[12字节IV][密文+tag]
     */
    public String encrypt(String plain) {
        try {
            //生成随机IV
            byte[] iv = new byte[IV_LENGTH];
            random.nextBytes(iv);
            //获取AES-GCM加密器
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            // 3. 配置加密模式 + IV
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            // 4. 加密
            byte[] ct = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            // 5. 拼接IV + 密文
            byte[] out = new byte[iv.length + ct.length];
            System.arraycopy(iv, 0, out, 0, iv.length);
            System.arraycopy(ct, 0, out, iv.length, ct.length);
            return Base64.getEncoder().encodeToString(out);
        } catch (Exception e) {
            log.error("AES加密失败", e);
            throw BizException.badRequest("加密失败");
        }
    }

    /**
     * AES-GCM 解密
     */
    public String decrypt(String cipherText) {
        try {
            //1.Base64解码
            byte[] raw = Base64.getDecoder().decode(cipherText);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            // 2.取出IV，构造GCM参数
            GCMParameterSpec spec = new GCMParameterSpec(TAG_BITS, raw, 0, IV_LENGTH);
            // 3. 配置解密模式 + IV
            cipher.init(Cipher.DECRYPT_MODE, key, spec);
            // 4. 解密
            byte[] plain = cipher.doFinal(raw, IV_LENGTH, raw.length - IV_LENGTH);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("AES解密失败", e);
            throw BizException.badRequest("参数异常");
        }
    }


}
