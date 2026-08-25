package com.xia.wenqu.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync   // 打开 Spring 的异步开关
public class AsyncConfig {

    @Bean("docTaskExecutor")
    public Executor docTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);      // 常驻线程
        executor.setMaxPoolSize(4);       // 最大线程
        executor.setQueueCapacity(200);   // 排队等待的任务数
        executor.setThreadNamePrefix("doc-parse-");
        executor.initialize();
        return executor;
    }
}