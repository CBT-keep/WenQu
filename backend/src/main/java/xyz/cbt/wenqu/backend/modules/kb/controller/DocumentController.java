package xyz.cbt.wenqu.backend.modules.kb.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import xyz.cbt.wenqu.backend.common.PageResult;
import xyz.cbt.wenqu.backend.common.Result;
import xyz.cbt.wenqu.backend.common.log.OpLog;
import xyz.cbt.wenqu.backend.modules.kb.dto.ChunkQueryDTO;
import xyz.cbt.wenqu.backend.modules.kb.service.KnowledgeBaseService;
import xyz.cbt.wenqu.backend.modules.kb.vo.ChunkVO;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {
    private final KnowledgeBaseService service;

    /**
     * 分页查询文档的内容块
     */
    @OpLog (type = "document", action = "文档内容块列表", recordArgs = false)
    @GetMapping("/{docId}/chunks")
    public Result<PageResult<ChunkVO>> chunks(
        @PathVariable long docId, 
        @ModelAttribute ChunkQueryDTO query,
        Authentication authentication) {
        return Result.ok(service.listChunks(docId, query, authentication));
    }
}
