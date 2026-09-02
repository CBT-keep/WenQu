package com.xia.wenqu.controller;

import com.xia.wenqu.common.PageResult;
import com.xia.wenqu.common.Result;
import com.xia.wenqu.model.dto.ConversationCreateDTO;
import com.xia.wenqu.model.dto.PasswordConfirmDTO;
import com.xia.wenqu.model.dto.RecycleBatchDTO;
import com.xia.wenqu.model.vo.ConversationVO;
import com.xia.wenqu.model.vo.MessageVO;
import com.xia.wenqu.model.vo.RecycleBatchResultVO;
import com.xia.wenqu.security.LoginUser;
import com.xia.wenqu.security.PasswordVerifier;
import com.xia.wenqu.service.ConversationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;
    private final PasswordVerifier passwordVerifier;

    /**
     * 创建会话
     */
    @PostMapping("/conversations")
    public Result<ConversationVO> create(@Valid @RequestBody ConversationCreateDTO dto,
                                         @AuthenticationPrincipal LoginUser loginUser) {
        log.info("创建会话：kbId={}, userId={}", dto.getKbId(), loginUser.getUserId());
        return Result.ok(conversationService.create(loginUser.getUserId(), dto));
    }

    /**
     * 会话列表（按最近活跃排序）
     */
    @GetMapping("/conversations")
    public Result<PageResult<ConversationVO>> list(@RequestParam(defaultValue = "1") int page,
                                                   @RequestParam(defaultValue = "10") int pageSize,
                                                   @AuthenticationPrincipal LoginUser loginUser) {
        return Result.ok(conversationService.list(loginUser.getUserId(), page, pageSize));
    }

    /**
     * 会话详情
     */
    @GetMapping("/conversations/{id}")
    public Result<ConversationVO> detail(@PathVariable Long id,
                                         @AuthenticationPrincipal LoginUser loginUser) {
        return Result.ok(conversationService.get(id, loginUser.getUserId()));
    }

    /**
     * 会话消息列表（时间正序）
     */
    @GetMapping("/conversations/{id}/messages")
    public Result<PageResult<MessageVO>> messages(@PathVariable Long id,
                                                  @RequestParam(defaultValue = "1") int page,
                                                  @RequestParam(defaultValue = "50") int pageSize,
                                                  @AuthenticationPrincipal LoginUser loginUser) {
        return Result.ok(conversationService.listMessages(id, loginUser.getUserId(), page, pageSize));
    }

    /**
     * 删除会话（软删除，进回收站可恢复）
     */
    @DeleteMapping("/conversations/{id}")
    public Result<Void> delete(@PathVariable Long id,
                               @AuthenticationPrincipal LoginUser loginUser) {
        log.info("删除会话：id={}", id);
        conversationService.delete(id, loginUser.getUserId());
        return Result.ok();
    }

    /**
     * 从回收站恢复会话（需密码认证）
     */
    @PostMapping("/conversations/{id}/restore")
    public Result<Void> restore(@PathVariable Long id,
                                @Valid @RequestBody PasswordConfirmDTO dto,
                                @AuthenticationPrincipal LoginUser loginUser) {
        log.info("恢复会话：id={}", id);
        passwordVerifier.verify(loginUser, dto.getPassword());
        conversationService.restore(id, loginUser.getUserId());
        return Result.ok();
    }

    /**
     * 永久删除会话：物理删除消息与会话行（需密码认证）
     */
    @PostMapping("/conversations/{id}/purge")
    public Result<Void> purge(@PathVariable Long id,
                              @Valid @RequestBody PasswordConfirmDTO dto,
                              @AuthenticationPrincipal LoginUser loginUser) {
        log.info("永久删除会话：id={}", id);
        passwordVerifier.verify(loginUser, dto.getPassword());
        conversationService.purge(id, loginUser.getUserId());
        return Result.ok();
    }

    /**
     * 批量恢复会话（整批一次密码认证）
     */
    @PostMapping("/conversations/batch-restore")
    public Result<RecycleBatchResultVO> batchRestore(@Valid @RequestBody RecycleBatchDTO dto,
                                                     @AuthenticationPrincipal LoginUser loginUser) {
        log.info("批量恢复会话：{} 项", dto.getIds().size());
        passwordVerifier.verify(loginUser, dto.getPassword());
        return Result.ok(conversationService.batchRestore(dto.getIds(), loginUser.getUserId()));
    }

    /**
     * 批量永久删除会话（整批一次密码认证）
     */
    @PostMapping("/conversations/batch-purge")
    public Result<RecycleBatchResultVO> batchPurge(@Valid @RequestBody RecycleBatchDTO dto,
                                                   @AuthenticationPrincipal LoginUser loginUser) {
        log.info("批量永久删除会话：{} 项", dto.getIds().size());
        passwordVerifier.verify(loginUser, dto.getPassword());
        return Result.ok(conversationService.batchPurge(dto.getIds(), loginUser.getUserId()));
    }
}
