package com.xia.wenqu.service.impl;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.xia.wenqu.common.PageResult;
import com.xia.wenqu.common.ResultCode;
import com.xia.wenqu.common.exception.BusinessException;
import com.xia.wenqu.mapper.DocumentMapper;
import com.xia.wenqu.model.entity.Document;
import com.xia.wenqu.model.enums.DocumentStatus;
import com.xia.wenqu.model.vo.DocumentVO;
import com.xia.wenqu.service.DocumentService;
import com.xia.wenqu.service.KnowledgeBaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
@RequiredArgsConstructor
public class DocumentServiceImpl implements DocumentService {

    private final KnowledgeBaseService knowledgeBaseService;
    private final DocumentMapper documentMapper;

    /**
     * 文件上传根目录
     */
    @Value("${wenqu.upload-dir:./uploads}")
    private String uploadDir;

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

        if(!Set.of("txt", "md", "docx", "pdf").contains(ext)) {
            throw new BusinessException(ResultCode.UNSUPPORTED_FILE_TYPE);
        }

        if(file.getSize() > 20L * 1024 * 1024) {
            throw new BusinessException(ResultCode.FILE_TOO_LARGE);
        }

        // 1. 文件落盘：./uploads/{userId}/{kbId}/{时间戳}_{原文件名}
        Path dir = Paths.get(uploadDir, String.valueOf(userId), String.valueOf(kbId));
        Files.createDirectories(dir);
        Path target = dir.resolve(System.currentTimeMillis() + "_" + name).toAbsolutePath();
        file.transferTo(target);

        // 2. 写入 MySQL，存文件路径
        Document doc = Document.builder()
                .kbId(kbId)
                .userId(userId)
                .name(name)
                .type(ext)
                .size(file.getSize())
                .filePath(target.toString())
                .status(DocumentStatus.UPLOADED)
                .build();
        documentMapper.insert(doc);

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
}
