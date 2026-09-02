package com.xia.wenqu.controller;

import com.xia.wenqu.common.PageResult;
import com.xia.wenqu.common.Result;
import com.xia.wenqu.model.dto.PasswordConfirmDTO;
import com.xia.wenqu.model.dto.RecycleBatchDTO;
import com.xia.wenqu.model.vo.DocumentVO;
import com.xia.wenqu.model.vo.RecycleBatchResultVO;
import com.xia.wenqu.security.LoginUser;
import com.xia.wenqu.security.PasswordVerifier;
import com.xia.wenqu.service.DocumentService;
import jakarta.validation.Valid;
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
    private final PasswordVerifier passwordVerifier;

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

    /**
     * 删除文档（软删除，进入回收站）
     */
    @DeleteMapping("/documents/{id}")
    public Result<Void> deleteDocument(@PathVariable Long id,
                                       @AuthenticationPrincipal LoginUser loginUser) {
        log.info("删除文档：id={}", id);
        documentService.deleteDocument(id, loginUser.getUserId());
        return Result.ok();
    }

    /**
     * 从回收站恢复文档（需密码认证）
     */
    @PostMapping("/documents/{id}/restore")
    public Result<Void> restoreDocument(@PathVariable Long id,
                                        @Valid @RequestBody PasswordConfirmDTO dto,
                                        @AuthenticationPrincipal LoginUser loginUser) {
        log.info("恢复文档：id={}", id);
        passwordVerifier.verify(loginUser, dto.getPassword());
        documentService.restoreDocument(id, loginUser.getUserId());
        return Result.ok();
    }

    /**
     * 永久删除文档（需密码认证）
     */
    @PostMapping("/documents/{id}/purge")
    public Result<Void> purgeDocument(@PathVariable Long id,
                                      @Valid @RequestBody PasswordConfirmDTO dto,
                                      @AuthenticationPrincipal LoginUser loginUser) {
        log.info("永久删除文档：id={}", id);
        passwordVerifier.verify(loginUser, dto.getPassword());
        documentService.purgeDocument(id, loginUser.getUserId());
        return Result.ok();
    }

    /**
     * 批量恢复文档（整批一次密码认证）
     */
    @PostMapping("/documents/batch-restore")
    public Result<RecycleBatchResultVO> batchRestoreDocuments(@Valid @RequestBody RecycleBatchDTO dto,
                                                              @AuthenticationPrincipal LoginUser loginUser) {
        log.info("批量恢复文档：{} 项", dto.getIds().size());
        passwordVerifier.verify(loginUser, dto.getPassword());
        return Result.ok(documentService.batchRestore(dto.getIds(), loginUser.getUserId()));
    }

    /**
     * 批量永久删除文档（整批一次密码认证）
     */
    @PostMapping("/documents/batch-purge")
    public Result<RecycleBatchResultVO> batchPurgeDocuments(@Valid @RequestBody RecycleBatchDTO dto,
                                                            @AuthenticationPrincipal LoginUser loginUser) {
        log.info("批量永久删除文档：{} 项", dto.getIds().size());
        passwordVerifier.verify(loginUser, dto.getPassword());
        return Result.ok(documentService.batchPurge(dto.getIds(), loginUser.getUserId()));
    }

    /**
     * 重处理文档
     */
    @PostMapping("/documents/{id}/reprocess")
    public Result<Void> reprocessDocument(@PathVariable Long id,
                                          @AuthenticationPrincipal LoginUser loginUser) {
        log.info("重新处理文档：id={}", id);
        documentService.reprocessDocument(id, loginUser.getUserId());
        return Result.ok();
    }
}
