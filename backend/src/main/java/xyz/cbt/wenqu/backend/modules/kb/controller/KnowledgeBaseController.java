package xyz.cbt.wenqu.backend.modules.kb.controller;

import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import xyz.cbt.wenqu.backend.common.PageResult;
import xyz.cbt.wenqu.backend.common.Result;
import xyz.cbt.wenqu.backend.common.log.OpLog;
import xyz.cbt.wenqu.backend.modules.kb.dto.DocumentListQueryDTO;
import xyz.cbt.wenqu.backend.modules.kb.dto.KnowledgeBaseCreateDTO;
import xyz.cbt.wenqu.backend.modules.kb.dto.KnowledgeBaseQueryDTO;
import xyz.cbt.wenqu.backend.modules.kb.service.KnowledgeBaseService;
import xyz.cbt.wenqu.backend.modules.kb.vo.DocumentListVO;
import xyz.cbt.wenqu.backend.modules.kb.vo.KnowledgeBaseListVO;
import xyz.cbt.wenqu.backend.modules.kb.vo.KnowledgeBaseOptionVO;

import java.util.List;
import tools.jackson.databind.JsonNode;
import xyz.cbt.wenqu.backend.modules.kb.vo.KnowledgeBaseDetailVO;
import xyz.cbt.wenqu.backend.modules.kb.vo.KnowledgeBaseStatsVO;

/**
 * 知识库相关业务控制器
 */
@RestController
@RequestMapping("/api/v1/knowledge-bases")
@RequiredArgsConstructor
public class KnowledgeBaseController {

    private final KnowledgeBaseService service;

    /** 
     * 知识库下拉选项
     */
    @OpLog(type = "knowledge-base", action = "知识库选项", recordArgs = false)
    @GetMapping("/options")
    public Result<List<KnowledgeBaseOptionVO>> options(Authentication authentication) {
        return Result.ok(service.listOptions(authentication));
    }

    /**
     * 创建知识库
     */
    @OpLog(type = "knowledge-base", action = "创建知识库")
    @PostMapping
    public ResponseEntity<Result<KnowledgeBaseListVO>> createKnowledgeBase(
            @Valid @RequestBody KnowledgeBaseCreateDTO dto, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Result.ok(service.createKnowledgeBase(dto, authentication)));
    }

    /** 
     * 知识库列表 
     */
    @OpLog(type = "knowledge-base", action = "知识库列表", recordArgs = false)
    @GetMapping
    public Result<PageResult<KnowledgeBaseListVO>> listKnowledgeBases(
            @Valid @ModelAttribute KnowledgeBaseQueryDTO query, Authentication authentication) {
        return Result.ok(service.listKnowledgeBases(query, authentication));
    }

    /**
     * 知识库详情
     */
    @OpLog(type = "knowledge-base", action = "知识库详情", recordArgs = false)
    @GetMapping("/{kbId}")
    public Result<KnowledgeBaseDetailVO> detail(@PathVariable long kbId, Authentication authentication) {
        return Result.ok(service.detail(kbId, authentication));
    }

    /**
     * 编辑知识库
     */
    @OpLog(type = "knowledge-base", action = "编辑知识库")
    @PutMapping("/{kbId}")
    public Result<KnowledgeBaseDetailVO> update(@PathVariable long kbId, @RequestBody JsonNode patch,
                                               Authentication authentication) {
        return Result.ok(service.update(kbId, patch, authentication));
    }

    /**
     * 知识库统计
     */
    @OpLog(type = "knowledge-base", action = "知识库统计", recordArgs = false)
    @GetMapping("/{kbId}/stats")
    public Result<KnowledgeBaseStatsVO> stats(@PathVariable long kbId, Authentication authentication) {
        return Result.ok(service.stats(kbId, authentication));
    }

    /**
     * 文档列表
     */
    @OpLog(type = "knowledge-base", action = "文档列表", recordArgs = false)
    @GetMapping("/{kbId}/documents")
    public Result<PageResult<DocumentListVO>> listDocuments(@PathVariable long kbId,
            @ModelAttribute DocumentListQueryDTO documentListQueryDTO,
            Authentication authentication) {
        return Result.ok(service.listDocuments(kbId, documentListQueryDTO, authentication));
    }
}
