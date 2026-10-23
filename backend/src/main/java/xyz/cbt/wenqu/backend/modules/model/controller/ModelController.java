package xyz.cbt.wenqu.backend.modules.model.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.common.Result;
import xyz.cbt.wenqu.backend.common.log.OpLog;
import xyz.cbt.wenqu.backend.modules.model.dto.ModelQueryDTO;
import xyz.cbt.wenqu.backend.modules.model.mapper.ModelOptionMapper;
import xyz.cbt.wenqu.backend.modules.model.service.ModelListService;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelListVO;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelOptionVO;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/models")
@RequiredArgsConstructor
public class ModelController {
    private static final Set<String> TYPES = Set.of("CHAT", "EMBEDDING", "RERANK");

    private final ModelListService service;
    private final ModelOptionMapper optionMapper;

    /**
     * 查询模型列表
     */
    @OpLog(type = "model", action = "模型列表", recordArgs = false)
    @PreAuthorize("hasRole('SUPERADMIN')")
    @GetMapping
    public Result<List<ModelListVO>> list(@Valid @ModelAttribute ModelQueryDTO query) {
        return Result.ok(service.list(query));
    }

    /**
     * 开放给所有用户的模型下拉选项查询
     */
    @OpLog(type = "model", action = "模型选项", recordArgs = false)
    @GetMapping("/options")
    public Result<List<ModelOptionVO>> options(@RequestParam(required = false) String type) {
        if (type != null && !TYPES.contains(type)) {
            throw BizException.badRequest("模型类型不合法");
        }
        return Result.ok(optionMapper.findEnabled(type));
    }
}
