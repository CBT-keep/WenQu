package xyz.cbt.wenqu.backend.modules.model.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.modules.model.dto.ModelQueryDTO;
import xyz.cbt.wenqu.backend.modules.model.mapper.ModelListMapper;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelListVO;

import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ModelListService {
    private static final Set<String> TYPES = Set.of("CHAT", "EMBEDDING", "RERANK");

    private final ModelListMapper mapper;
    private final ObjectMapper objectMapper;

    /**
     * 查询模型列表
     */
    @Transactional(readOnly = true)
    public List<ModelListVO> list(ModelQueryDTO query) {
        String type = query.getType() == null || query.getType().isBlank()
                ? null : query.getType().trim().toUpperCase(Locale.ROOT);
        if (type != null && !TYPES.contains(type)) {
            throw BizException.badRequest("模型类型不合法");
        }
        return mapper.search(type, query.getEnabled()).stream()
                .map(row -> ModelListVO.from(row, objectMapper.readTree(row.extraParamsJson())))
                .toList();
    }
}
