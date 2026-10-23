package xyz.cbt.wenqu.backend.modules.models.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import xyz.cbt.wenqu.backend.common.Result;
import xyz.cbt.wenqu.backend.common.log.OpLog;
import xyz.cbt.wenqu.backend.modules.models.dto.ModelCreateDTO;
import xyz.cbt.wenqu.backend.modules.models.dto.ModelQueryDTO;
import xyz.cbt.wenqu.backend.modules.models.service.ModelsService;
import xyz.cbt.wenqu.backend.modules.models.vo.ModelVO;

import java.util.List;

/**
 * 模型管理
 */
@RestController
@RequestMapping("/api/v1/models")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPERADMIN')")
public class ModelsController {
    private final ModelsService modelsService;

    /**
     * 模型列表
     */
    @OpLog(type = "models", action = "模型列表")
    @GetMapping
    public Result<List<ModelVO>> list(@Valid @ModelAttribute ModelQueryDTO query){
        return Result.ok(modelsService.list(query));
    }

    /**
     * 新增模型
     */
    @OpLog(type = "models", action = "新增模型")
    @PostMapping
    public ResponseEntity<Result<ModelVO>> add(@Valid @RequestBody ModelCreateDTO dto){
        return ResponseEntity.status(HttpStatus.CREATED).body(Result.ok(modelsService.create(dto)));
    }

    /**
     * 删除
     */
    @OpLog(type = "models", action = "删除")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id){
        modelsService.delete(id);
        return Result.ok(null);
    }

    /**
     *
     */
}
