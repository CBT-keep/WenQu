package com.xia.wenqu.controller;

import com.xia.wenqu.common.Result;
import com.xia.wenqu.model.vo.RecycleConversationVO;
import com.xia.wenqu.model.vo.RecycleDocVO;
import com.xia.wenqu.model.vo.RecycleKbVO;
import com.xia.wenqu.security.LoginUser;
import com.xia.wenqu.service.ConversationService;
import com.xia.wenqu.service.RecycleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 回收站控制层：软删除的文档、知识库与会话查询
 */
@Slf4j
@RestController
@RequestMapping("/api/recycle")
@RequiredArgsConstructor
public class RecycleController {

    private final RecycleService recycleService;
    private final ConversationService conversationService;

    /**
     * 回收站文档列表
     */
    @GetMapping("/documents")
    public Result<List<RecycleDocVO>> deletedDocuments(@AuthenticationPrincipal LoginUser loginUser) {
        return Result.ok(recycleService.listDeletedDocuments(loginUser.getUserId()));
    }

    /**
     * 回收站知识库列表
     */
    @GetMapping("/kbs")
    public Result<List<RecycleKbVO>> deletedKnowledgeBases(@AuthenticationPrincipal LoginUser loginUser) {
        return Result.ok(recycleService.listDeletedKnowledgeBases(loginUser.getUserId()));
    }

    /**
     * 回收站会话列表（与文档/知识库分列表、分查询，避免混在一起量大时卡顿）
     */
    @GetMapping("/conversations")
    public Result<List<RecycleConversationVO>> deletedConversations(@AuthenticationPrincipal LoginUser loginUser) {
        return Result.ok(conversationService.listDeleted(loginUser.getUserId()));
    }
}
