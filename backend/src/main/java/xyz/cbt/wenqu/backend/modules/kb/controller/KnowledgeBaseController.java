package xyz.cbt.wenqu.backend.modules.kb.controller;

import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import xyz.cbt.wenqu.backend.common.PageResult;
import xyz.cbt.wenqu.backend.common.Result;
import xyz.cbt.wenqu.backend.common.log.OpLog;
import xyz.cbt.wenqu.backend.modules.kb.dto.DocumentListQueryDTO;
import xyz.cbt.wenqu.backend.modules.kb.dto.KnowledgeBaseQueryDTO;
import xyz.cbt.wenqu.backend.modules.kb.service.KnowledgeBaseService;
import xyz.cbt.wenqu.backend.modules.kb.vo.DocumentListVO;
import xyz.cbt.wenqu.backend.modules.kb.vo.KnowledgeBaseListVO;

/**
 * 数据库相关业务控制器
 */
@RestController
@RequestMapping("/api/v1/knowledge-bases")
@RequiredArgsConstructor
public class KnowledgeBaseController {

    private final KnowledgeBaseService service;

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
