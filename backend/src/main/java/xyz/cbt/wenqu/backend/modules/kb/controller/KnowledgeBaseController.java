package xyz.cbt.wenqu.backend.modules.kb.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import xyz.cbt.wenqu.backend.common.PageResult;
import xyz.cbt.wenqu.backend.common.Result;
import xyz.cbt.wenqu.backend.common.log.OpLog;
import xyz.cbt.wenqu.backend.modules.kb.dto.DocumentListQueryDTO;
import xyz.cbt.wenqu.backend.modules.kb.dto.KnowledgeBaseCreateDTO;
import xyz.cbt.wenqu.backend.modules.kb.dto.KnowledgeBaseListQueryDTO;
import xyz.cbt.wenqu.backend.modules.kb.service.KnowledgeBaseService;
import xyz.cbt.wenqu.backend.modules.kb.vo.DocumentListVO;
import xyz.cbt.wenqu.backend.modules.kb.vo.KnowledgeBaseListVO;

/**
 * 知识库业务控制器
 */
@RestController
@RequestMapping("/api/v1/knowledge-bases")
@RequiredArgsConstructor
public class KnowledgeBaseController {

    private final KnowledgeBaseService service;

    /**
     * 知识库列表
     */
    @OpLog(type = "kb",action = "知识库列表查询")
    @GetMapping
    public Result<PageResult<KnowledgeBaseListVO>> listKnowledgeBases(
            @ModelAttribute KnowledgeBaseListQueryDTO query,
            Authentication authentication) {
        return Result.ok(service.listKnowledgeBases(query, authentication));
    }

    /**
     * 创建知识库
     */
    @OpLog(type = "kb", action = "创建知识库")
    @PostMapping
    public ResponseEntity<Result<KnowledgeBaseListVO>> createKnowledgeBase(
            @Valid @RequestBody KnowledgeBaseCreateDTO dto,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Result.ok(service.createKnowledgeBase(dto, authentication)));
    }

    /**
     * 文档列表
     */
    @OpLog(type = "kb", action = "文档列表查询")
    @GetMapping("/{kbId}/documents")
    public Result<PageResult<DocumentListVO>> list(@PathVariable long kbId,
            @ModelAttribute DocumentListQueryDTO documentListQueryDTO,
            Authentication authentication) {
        return Result.ok(service.list(kbId, documentListQueryDTO, authentication));
    }
}
