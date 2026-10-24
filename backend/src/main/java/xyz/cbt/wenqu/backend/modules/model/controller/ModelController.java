package xyz.cbt.wenqu.backend.modules.model.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import xyz.cbt.wenqu.backend.common.Result;
import xyz.cbt.wenqu.backend.common.log.OpLog;
import xyz.cbt.wenqu.backend.modules.model.dto.ModelQueryDTO;
import xyz.cbt.wenqu.backend.modules.model.dto.ModelCreateDTO;
import xyz.cbt.wenqu.backend.modules.model.dto.ModelUpdateDTO;
import xyz.cbt.wenqu.backend.modules.model.service.ModelService;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelListVO;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelOptionVO;

import java.util.List;
/**
 * 模型管理控制器
 */
@RestController
@RequestMapping("/api/v1/models")
@RequiredArgsConstructor
public class ModelController {
    private final ModelService service;

    /** 
     * 设为同类型默认模型，请求体可为空
     */
    @OpLog(type = "model", action = "设为默认模型", recordArgs = false)
    @PreAuthorize("hasRole('SUPERADMIN')")
    @PutMapping("/{id}/default")
    public Result<ModelListVO> setDefault(@PathVariable long id) {
        return Result.ok(service.setDefault(id));
    }

    /**
     * 编辑模型
     */
    @OpLog(type = "model", action = "编辑模型", recordArgs = false)
    @PreAuthorize("hasRole('SUPERADMIN')")
    @PutMapping("/{id}")
    public Result<ModelListVO> update(@PathVariable long id, @Valid @RequestBody ModelUpdateDTO dto) {
        return Result.ok(service.update(id, dto));
    }

    /**
     * 删除模型
     */
    @OpLog(type = "model", action = "删除模型", recordArgs = false)
    @PreAuthorize("hasRole('SUPERADMIN')")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable long id) {
        service.delete(id);
        return Result.ok(null);
    }

    /**
     * 新增模型
     */
    @OpLog(type = "model", action = "新增模型", recordArgs = false)
    @PreAuthorize("hasRole('SUPERADMIN')")
    @PostMapping
    public ResponseEntity<Result<ModelListVO>> create(@Valid @RequestBody ModelCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Result.ok(service.create(dto)));
    }

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
        return Result.ok(service.options(type));
    }
}
