package xyz.cbt.wenqu.backend.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

/**
 *链路追踪过滤器：提前生成traceId放入MDC
 */
@Component
@Order(Integer.MIN_VALUE)
public class TraceFilter implements Filter {
    public static final String TRACE_ID_KEY="traceId";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain filterChain) throws IOException, ServletException {
        HttpServletRequest httpReq = (HttpServletRequest) request;
        String traceId = httpReq.getHeader(TRACE_ID_KEY);
        if (traceId==null||traceId.isBlank()){
            traceId= UUID.randomUUID().toString().replace("-", "");
        }

        //存入MDC
        MDC.put(TRACE_ID_KEY,traceId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(TRACE_ID_KEY);
        }
    }
}
