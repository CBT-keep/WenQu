package com.xia.wenqu.service;

import com.xia.wenqu.common.PageResult;
import com.xia.wenqu.model.vo.DocumentVO;
import com.xia.wenqu.model.vo.RecycleBatchResultVO;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * 文档功能接口类
 *
 * @author hbk
 * @version 1.0
 * @date 2026/8/23 15:09
 */
public interface DocumentService {
    /**
     * 文件上传
     */
    DocumentVO upload(Long kbId, MultipartFile file, Long userId) throws IOException;

    /**
     * 文章列表查询
     */
    PageResult<DocumentVO> pageQuery(Long kbId, Long userId, int page, int pageSize);

    /**
     * 文档详情
     */
    DocumentVO getDocument(Long id, Long userId);

    /**
     * 删除文档（软删除，进入回收站，磁盘文件与分块保留）
     */
    void deleteDocument(Long id, Long userId);

    /**
     * 从回收站恢复文档（分块保留时恢复后向量立即可用）
     */
    void restoreDocument(Long id, Long userId);

    /**
     * 永久删除文档：物理删除分块、文档行与磁盘文件
     */
    void purgeDocument(Long id, Long userId);

    /**
     * 批量恢复文档：整批一个事务，无效/不可恢复的条目跳过并计数
     */
    RecycleBatchResultVO batchRestore(List<Long> ids, Long userId);

    /**
     * 批量永久删除文档：整批一个事务，磁盘文件在事务提交后统一清理
     */
    RecycleBatchResultVO batchPurge(List<Long> ids, Long userId);
}
