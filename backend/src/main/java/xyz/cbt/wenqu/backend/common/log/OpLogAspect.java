package xyz.cbt.wenqu.backend.common.log;


import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tools.jackson.databind.ObjectMapper;
import xyz.cbt.wenqu.backend.modules.auth.entity.LoginUser;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysOperationLog;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class OpLogAspect {

    private static final int DETAIL_MAX = 4000;

    // 匹配敏感字段
    private static final Pattern SENSITIVE = Pattern.compile(
            "\"(password|newPassword|oldPassword|token|refreshToken|secret|apiKey)\"\\s*:\\s*\"[^\"]*\"",
            Pattern.CASE_INSENSITIVE);

    private final OpLogWriter opLogWriter;
    private final ObjectMapper objectMapper;

    /**
     * 切面
     */
    @Around("@annotation(opLog)")
    public Object around(ProceedingJoinPoint pjp, OpLog opLog) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            Object ret = pjp.proceed();
            save(pjp, opLog, "SUCCESS", null, System.currentTimeMillis() - start);
            return ret;
        } catch (Throwable e) {
            save(pjp, opLog, "FAILED", e, System.currentTimeMillis() - start);
            throw e;
        }
    }

    /**
     * 保存日志
     */
    private void save(ProceedingJoinPoint pjp, OpLog opLog, String result, Throwable ex, long costMs) {
        try {
            SysOperationLog entry = new SysOperationLog();
            entry.setType(truncate(opLog.type(), 32));
            entry.setAction(truncate(opLog.action(), 128));
            entry.setTarget(truncate(opLog.target(), 255));
            entry.setResult(result);
            entry.setTraceId(MDC.get(TraceIdFilter.TRACE_ID_KEY));
            entry.setCreatedAt(OffsetDateTime.now());

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof LoginUser loginUser) {
                entry.setUserId(loginUser.getUserId());
                entry.setUsername(loginUser.getUsername());
            }

            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                entry.setIp(resolveIp(request));
                entry.setUserAgent(truncate(request.getHeader("User-Agent"), 255));
            }

            entry.setDetail(buildDetail(pjp, opLog, ex, costMs));
            opLogWriter.write(entry);
        } catch (Exception e) {
            log.warn("操作日志采集失败: {}", e.getMessage());
        }
    }

    /**
     * 构建日志详情
     */
    private String buildDetail(ProceedingJoinPoint pjp, OpLog opLog, Throwable ex, long costMs) {
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("method", pjp.getSignature().toShortString());
        detail.put("costMs", costMs);
        if (opLog.recordArgs()) {
            detail.put("args", pjp.getArgs());
        }
        if (ex != null) {
            detail.put("error", ex.getClass().getSimpleName() + ": " + ex.getMessage());
        }
        try {
            String json = objectMapper.writeValueAsString(detail);
            return truncate(SENSITIVE.matcher(json).replaceAll("\"$1\":\"***\""), DETAIL_MAX);
        } catch (Exception e) {
            return truncate(pjp.getSignature().toShortString() + " costMs=" + costMs, DETAIL_MAX);
        }
    }

    /**
     * 解析IP地址
     */
    private String resolveIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return truncate(forwarded.split(",")[0].trim(), 64);
        }
        return truncate(request.getRemoteAddr(), 64);
    }

    /**
     * 截断字符串
     */
    private static String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() <= max ? s : s.substring(0, max);
    }
}
