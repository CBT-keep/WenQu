package xyz.cbt.wenqu.backend.modules.kb.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import xyz.cbt.wenqu.backend.common.PageResult;
import xyz.cbt.wenqu.backend.common.Result;
import xyz.cbt.wenqu.backend.modules.kb.dto.DocumentListQueryDTO;
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
    @GetMapping
    public Result<PageResult<KnowledgeBaseListVO>> listKnowledgeBases(
            @ModelAttribute KnowledgeBaseListQueryDTO query,
            Authentication authentication) {
        return Result.ok(service.listKnowledgeBases(query, authentication));
    }

    /**
     * 文档列表
     */
    @GetMapping("/{kbId}/documents")
    public Result<PageResult<DocumentListVO>> list(@PathVariable long kbId,
            @ModelAttribute DocumentListQueryDTO documentListQueryDTO,
            Authentication authentication) {
        return Result.ok(service.list(kbId, documentListQueryDTO, authentication));
    }
}
