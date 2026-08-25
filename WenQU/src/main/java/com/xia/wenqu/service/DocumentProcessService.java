package com.xia.wenqu.service;

/**
 * 异步处理接口
 *
 * @author hbk
 * @version 1.0
 * @date 2026/8/25 10:00
 */
public interface DocumentProcessService {
    /**
     * 异步处理单个文档：解析 → 切分 → 入库 → READY/FAILED
     */
    void process(Long documentId);
}
