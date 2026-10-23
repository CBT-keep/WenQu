package xyz.cbt.wenqu.backend.modules.model.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.common.Result;
import xyz.cbt.wenqu.backend.common.log.OpLog;
import xyz.cbt.wenqu.backend.modules.model.dto.ModelQueryDTO;
import xyz.cbt.wenqu.backend.modules.model.mapper.ModelOptionMapper;
import xyz.cbt.wenqu.backend.modules.model.service.ModelListService;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelListVO;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelOptionVO;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelTestVO;
import xyz.cbt.wenqu.backend.modules.model.dto.ModelCreateDTO;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelVO;

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
     * 新增模型
     */
    @OpLog(type = "model", action = "新增模型")
    @PostMapping
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<Result<ModelVO>> add(@Valid @RequestBody ModelCreateDTO dto){
        return ResponseEntity.status(HttpStatus.CREATED).body(Result.ok(service.create(dto)));
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

    /**
     * 连通测试--已保存
     */
    @OpLog(type = "model", action = "模型联通测试", recordArgs = false)
    @PreAuthorize("hasRole('SUPERADMIN')")
    @PostMapping("/{id}/test")
    public Result<ModelTestVO> test(@PathVariable Long id) {
        return Result.ok(service.test(id));
    }

    /**
     * 连通测试--未保存
     */
    @OpLog(type = "model", action = "模型联通测试", recordArgs = false)
    @PreAuthorize("hasRole('SUPERADMIN')")
    @PostMapping("/test")
    public Result<ModelTestVO> testDraft(@Valid @RequestBody ModelCreateDTO dto) {
        return Result.ok(service.testDraft(dto));

    }
}
