package com.xia.wenqu.controller;

import com.xia.wenqu.common.PageResult;
import com.xia.wenqu.common.Result;
import com.xia.wenqu.model.dto.KbCreateDTO;
import com.xia.wenqu.model.vo.KBVO;
import com.xia.wenqu.security.LoginUser;
import com.xia.wenqu.service.KnowledgeBaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 知识库相关接口
 */
@RestController
@RequestMapping("/api/kbs")
@RequiredArgsConstructor
@Slf4j
public class KnowledgeBaseController {

    private final KnowledgeBaseService knowledgeBaseService;

    /**
     * 创建知识库
     */
    @PostMapping
    public Result<KBVO> createKnowledgeBase(@Valid @RequestBody KbCreateDTO kbCreateDTO,
                                            @AuthenticationPrincipal LoginUser loginUser) {
        log.info("创建知识库:{}", kbCreateDTO.getName());

        KBVO kbvo = knowledgeBaseService.createKnowledgeBase(loginUser.getUserId(), kbCreateDTO);
        return Result.ok(kbvo);
    }

    /**
     * 查询知识库列表
     */
    @GetMapping
    public Result<PageResult<KBVO>> listKnowledgeBases(@AuthenticationPrincipal LoginUser loginUser,
                                                       @RequestParam(defaultValue = "1") int page,
                                                       @RequestParam(defaultValue = "10") int pageSize) {
        log.info("查询知识库列表:page={},pageSize={}", page, pageSize);
        PageResult<KBVO> pageResult = knowledgeBaseService.listKnowledgeBases(loginUser.getUserId(), page, pageSize);
        return Result.ok(pageResult);
    }

    /**
     * 知识库详情
     */
    @GetMapping("/{id}")
    public Result<KBVO> getKnowledgeBase(@PathVariable Long id,
                                         @AuthenticationPrincipal LoginUser loginUser) {
        log.info("查询知识库详情:id={}", id);
        KBVO kbvo = knowledgeBaseService.getKnowledgeBase(id, loginUser.getUserId());
        return Result.ok(kbvo);
    }
}
