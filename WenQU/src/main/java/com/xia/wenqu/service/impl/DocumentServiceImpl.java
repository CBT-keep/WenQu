package com.xia.wenqu.service.impl;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.xia.wenqu.common.PageResult;
import com.xia.wenqu.common.ResultCode;
import com.xia.wenqu.common.exception.BusinessException;
import com.xia.wenqu.mapper.DocChunkMapper;
import com.xia.wenqu.mapper.DocumentMapper;
import com.xia.wenqu.model.entity.Document;
import com.xia.wenqu.model.enums.DocumentStatus;
import com.xia.wenqu.model.vo.DocumentVO;
import com.xia.wenqu.model.vo.RecycleBatchResultVO;
import com.xia.wenqu.service.DocumentProcessService;
import com.xia.wenqu.service.DocumentService;
import com.xia.wenqu.service.KnowledgeBaseService;
import com.xia.wenqu.service.extractor.TextExtractor;
import com.xia.wenqu.service.extractor.TextExtractorFactory;
import com.xia.wenqu.utils.UploadFileCleaner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * 文档功能实现类
 *
 * @author hbk
 * @version 1.0
 * @date 2026/8/23 15:09
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class DocumentServiceImpl implements DocumentService {

    private final KnowledgeBaseService knowledgeBaseService;
    private final DocumentMapper documentMapper;
    private final DocChunkMapper docChunkMapper;
    private final UploadFileCleaner uploadFileCleaner;
    private final TextExtractorFactory extractorFactory;
    private final DocumentProcessService documentProcessService;

    /**
     * 文件上传根目录
     */
    @Value("${wenqu.upload-dir:./uploads}")
    private String uploadDir;

    /**
     * 异步处理中的状态：这些状态下不允许删除文档，避免与解析流水线竞态
     */
    private static final Set<DocumentStatus> PROCESSING_STATUS =
            Set.of(DocumentStatus.PARSING, DocumentStatus.CHUNKING, DocumentStatus.EMBEDDING);

    /**
     * 文件上传：文件落盘，MySQL 只存文件路径
     */
    @Override
    @Transactional
    public DocumentVO upload(Long kbId, MultipartFile file, Long userId) throws IOException {
        // 查库是否存在并校验身份
        knowledgeBaseService.getKnowledgeBase(kbId, userId);

        // 校验文件
        if(file == null || file.isEmpty()) {
            throw new BusinessException(ResultCode.FILE_EMPTY);
        }

        String name = Objects.requireNonNull(file.getOriginalFilename());
        String ext = name.contains(".") ? name.substring(name.lastIndexOf(".") + 1).toLowerCase() : "";

        if(!Set.of("txt", "md", "doc", "docx", "pdf",
                "xls", "xlsx", "ppt", "pptx",
                "html", "csv", "epub").contains(ext)) {
            throw new BusinessException(ResultCode.UNSUPPORTED_FILE_TYPE);
        }

        if(file.getSize() > 20L * 1024 * 1024) {
            throw new BusinessException(ResultCode.FILE_TOO_LARGE);
        }

        // 先落盘：./uploads/{userId}/{kbId}/{时间戳}_{原文件名}
        Path dir = Paths.get(uploadDir, String.valueOf(userId), String.valueOf(kbId));
        Files.createDirectories(dir);
        Path target = dir.resolve(System.currentTimeMillis() + "_" + name).toAbsolutePath();

        try {
            file.transferTo(target);

            // 写库
            Document doc = Document.builder()
                    .kbId(kbId)
                    .userId(userId)
                    .name(name)
                    .type(ext)
                    .size(file.getSize())
                    .status(DocumentStatus.UPLOADING) // 设置成中间状态
                    .build();
            documentMapper.insert(doc);

            // 更新文件路径和状态
            doc.setFilePath(target.toString());
            doc.setStatus(DocumentStatus.UPLOADED);
            documentMapper.updateFilePath(doc);

            // 触发后台异步处理：解析 → 切分 → 入库
            // 必须在事务提交后触发，否则异步线程查不到刚插入的文档
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    documentProcessService.process(doc.getId());
                }
            });

            // 返回VO对象
            return DocumentVO.builder()
                    .id(doc.getId())
                    .kbId(kbId)
                    .name(name)
                    .type(ext)
                    .size(doc.getSize())
                    .status(DocumentStatus.UPLOADED)
                    .chunkCount(0L)
                    .createdAt(System.currentTimeMillis())
                    .build();
        } catch (Exception e) {
            // 文件已落盘但 DB 写入失败 → 删除文件，避免孤儿文件
            Files.deleteIfExists(target);
            throw e;
        }
    }

    /**
     * 文章列表查询
     */
    @Override
    public PageResult<DocumentVO> pageQuery(Long kbId, Long userId, int page, int pageSize) {
        // 校验知识库存在且属于当前用户
        knowledgeBaseService.validateKnowledgeBase(kbId, userId);

        // 开启分页查询
        PageHelper.startPage(page, pageSize);

        // 调mapper层查询
        Page<DocumentVO> pages = documentMapper.query(kbId, page, pageSize);

        Long total = pages.getTotal();
        List<DocumentVO> records = pages.getResult();
        return new PageResult<>(records, total, page, pageSize);
    }

    /**
     * 文档详情：先查文档，再校验所属知识库归属
     */
    @Override
    public DocumentVO getDocument(Long id, Long userId) {
        DocumentVO doc = documentMapper.selectById(id);
        if (doc == null) {
            throw new BusinessException(ResultCode.DOCUMENT_NOT_FOUND);
        }
        // 校验所属知识库存在且属于当前用户
        knowledgeBaseService.validateKnowledgeBase(doc.getKbId(), userId);
        return doc;
    }

    /**
     * 删除文档（软删除）：磁盘文件与分块保留，进入回收站可恢复
     */
    @Override
    @Transactional
    public void deleteDocument(Long id, Long userId) {
        Document doc = documentMapper.selectEntityById(id);
        if (doc == null || !doc.getUserId().equals(userId)) {
            throw new BusinessException(ResultCode.DOCUMENT_NOT_FOUND);
        }
        // 处理中的文档不允许删除，避免异步流水线写库与删除竞态
        if (PROCESSING_STATUS.contains(doc.getStatus())) {
            throw new BusinessException(ResultCode.ILLEGAL_STATE, "文档正在处理中，请稍后再删除");
        }
        documentMapper.softDelete(id);
    }

    /**
     * 恢复文档：分块保留时恢复后向量立即可用，无需重新处理
     */
    @Override
    @Transactional
    public void restoreDocument(Long id, Long userId) {
        Document doc = documentMapper.selectDeletedEntityById(id);
        if (doc == null || !doc.getUserId().equals(userId)) {
            throw new BusinessException(ResultCode.DOCUMENT_NOT_FOUND);
        }
        // 所属知识库仍处于软删除状态时不允许单独恢复文档
        try {
            knowledgeBaseService.validateKnowledgeBase(doc.getKbId(), userId);
        } catch (BusinessException e) {
            throw new BusinessException(ResultCode.ILLEGAL_STATE, "所属知识库已删除，请先恢复知识库");
        }
        documentMapper.restoreById(id);
    }

    /**
     * 永久删除文档：物理删除分块、文档行，事务提交后清理磁盘文件
     */
    @Override
    @Transactional
    public void purgeDocument(Long id, Long userId) {
        Document doc = documentMapper.selectDeletedEntityById(id);
        if (doc == null || !doc.getUserId().equals(userId)) {
            throw new BusinessException(ResultCode.DOCUMENT_NOT_FOUND);
        }

        docChunkMapper.deleteByDocumentId(id);
        documentMapper.deletePhysically(id);

        // 事务提交后再删磁盘文件，DB 回滚时不丢文件
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                uploadFileCleaner.deleteQuietly(doc.getFilePath());
            }
        });
    }

    /**
     * 批量恢复/永久删除：整批共用一个事务，逐条复用单条逻辑并容错跳过
     * （批内为 this 直调，BusinessException 不会触发回滚标记）
     */
    @Override
    @Transactional
    public RecycleBatchResultVO batchRestore(List<Long> ids, Long userId) {
        int success = 0, skipped = 0;
        for (Long id : ids) {
            try {
                restoreDocument(id, userId);
                success++;
            } catch (BusinessException e) {
                skipped++;
            }
        }
        return RecycleBatchResultVO.builder().requested(ids.size()).success(success).skipped(skipped).build();
    }

    @Override
    @Transactional
    public RecycleBatchResultVO batchPurge(List<Long> ids, Long userId) {
        int success = 0, skipped = 0;
        for (Long id : ids) {
            try {
                purgeDocument(id, userId);
                success++;
            } catch (BusinessException e) {
                skipped++;
            }
        }
        return RecycleBatchResultVO.builder().requested(ids.size()).success(success).skipped(skipped).build();
    }
}
