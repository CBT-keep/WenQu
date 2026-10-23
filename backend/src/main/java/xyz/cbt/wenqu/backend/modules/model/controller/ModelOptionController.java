package xyz.cbt.wenqu.backend.modules.model.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.common.Result;
import xyz.cbt.wenqu.backend.modules.model.mapper.ModelOptionMapper;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelOptionVO;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/models")
@RequiredArgsConstructor
public class ModelOptionController {
    private static final Set<String> TYPES = Set.of("CHAT", "EMBEDDING", "RERANK");
    private final ModelOptionMapper mapper;

    @GetMapping("/options")
    public Result<List<ModelOptionVO>> options(@RequestParam(required = false) String type) {
        if (type != null && !TYPES.contains(type)) throw BizException.badRequest("模型类型不合法");
        return Result.ok(mapper.findEnabled(type));
    }
}
