package xyz.cbt.wenqu.backend.modules.models.service;

import jakarta.validation.Valid;
import xyz.cbt.wenqu.backend.modules.models.dto.ModelQueryDTO;
import xyz.cbt.wenqu.backend.modules.models.vo.ModelVO;

import java.util.List;

public interface ModelsService {

    /**
     * 模型列表
     */
    List<ModelVO> list(@Valid ModelQueryDTO query);
}
