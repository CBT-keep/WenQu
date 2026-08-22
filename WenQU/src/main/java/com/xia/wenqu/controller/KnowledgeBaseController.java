package com.xia.wenqu.controller;

import com.xia.wenqu.common.Result;
import com.xia.wenqu.model.dto.KbCreateDTO;
import com.xia.wenqu.model.vo.KBVO;
import com.xia.wenqu.security.LoginUser;
import com.xia.wenqu.service.KnowledgeBaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
