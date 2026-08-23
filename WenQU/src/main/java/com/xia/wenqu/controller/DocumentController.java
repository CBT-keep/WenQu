package com.xia.wenqu.controller;

import com.xia.wenqu.common.PageResult;
import com.xia.wenqu.common.Result;
import com.xia.wenqu.model.vo.DocumentVO;
import com.xia.wenqu.security.LoginUser;
import com.xia.wenqu.service.DocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * 文档功能控制层
 *
 * @author hbk
 * @version 1.0
 * @date 2026/8/23 15:04
 */
@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    /**
     * 文件上传
     */
    @PostMapping("/kbs/{kbId}/documents")
    public Result<DocumentVO> upload(@PathVariable Long kbId,
                                     @RequestParam("file") MultipartFile file,
                                     @AuthenticationPrincipal LoginUser loginUser) throws IOException {
        log.info("开始进行文件上传，知识库ID：{}", kbId);
        return Result.ok(documentService.upload(kbId, file, loginUser.getUserId()));
    }

    /**
     * 文档列表查询
     */
    @GetMapping("/kbs/{kbId}/documents")
    public Result<PageResult<DocumentVO>> documentList(@PathVariable Long kbId,
                                                       @RequestParam(defaultValue = "1") int page,
                                                       @RequestParam(defaultValue = "10") int pageSize,
                                                       @AuthenticationPrincipal LoginUser loginUser) {
        log.info("开始进行分页查询：{}, {}", page, pageSize);
        PageResult<DocumentVO> documentVOPageResult = documentService.pageQuery(kbId, loginUser.getUserId(), page, pageSize);
        return Result.ok(documentVOPageResult);
    }

    /**
     * 文档详情
     */
    @GetMapping("/documents/{id}")
    public Result<DocumentVO> documentDetail(@PathVariable Long id,
                                             @AuthenticationPrincipal LoginUser loginUser) {
        log.info("查询文档详情：id={}", id);
        return Result.ok(documentService.getDocument(id, loginUser.getUserId()));
    }
}
