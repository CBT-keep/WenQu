package xyz.cbt.wenqu.backend.modules.models.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import xyz.cbt.wenqu.backend.modules.models.dto.ModelQueryDTO;
import xyz.cbt.wenqu.backend.modules.models.mapper.ModelsMapper;
import xyz.cbt.wenqu.backend.modules.models.service.ModelsService;
import xyz.cbt.wenqu.backend.modules.models.vo.ModelVO;
import xyz.cbt.wenqu.backend.utils.CryptoUtil;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 模型管理服务实现类
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ModelsServiceImpl implements ModelsService {
    private final ModelsMapper modelsMapper;
    private final ObjectMapper objectMapper;
    private final CryptoUtil cryptoUtil;

    @Override
    @Transactional(readOnly = true)
    public List<ModelVO> list(ModelQueryDTO query) {
        String type = (query.getType() == null || query.getType().isBlank())
                ? null : query.getType().trim();
        return modelsMapper.search(type,query.getEnabled())
                .stream()
                .map(m -> ModelVO.from(m,
                        cryptoUtil.decryptQuietly(m.getApiKeyCipher()),
                        parseExtraParams(m.getExtraParams())))
                .toList();
    }

    /**
     * jsonb 原文 → Map
     */
    @SuppressWarnings("unchecked")
    private Map<String,Object> parseExtraParams(String jsonb){
        if (jsonb==null || jsonb.isBlank()){
            return new HashMap<>();
        }
        try {
            Map<String,Object> map = objectMapper.readValue(jsonb, Map.class);
            return map == null ? new HashMap<>() : map;
        } catch (Exception e) {
            log.warn("extraParams 解析失败: {}", jsonb, e);
            return new HashMap<>();
        }
    }
}
