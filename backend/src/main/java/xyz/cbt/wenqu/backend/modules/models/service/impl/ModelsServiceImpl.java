package xyz.cbt.wenqu.backend.modules.models.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.modules.auth.entity.LoginUser;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysOperationLog;
import xyz.cbt.wenqu.backend.modules.auth.mapper.OperationLogMapper;
import xyz.cbt.wenqu.backend.modules.models.dto.ModelCreateDTO;
import xyz.cbt.wenqu.backend.modules.models.dto.ModelQueryDTO;
import xyz.cbt.wenqu.backend.modules.models.entity.LlmModel;
import xyz.cbt.wenqu.backend.modules.models.mapper.ModelsMapper;
import xyz.cbt.wenqu.backend.modules.models.service.ModelsService;
import xyz.cbt.wenqu.backend.modules.models.vo.ModelVO;
import xyz.cbt.wenqu.backend.utils.CryptoUtil;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
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
    private final OperationLogMapper operationLogMapper;

    @Override
    @Transactional(readOnly = true)
    public List<ModelVO> list(ModelQueryDTO query) {
        String type = (query.getType() == null || query.getType().isBlank()) ? null : query.getType().trim();
        return modelsMapper.search(type, query.getEnabled())
                .stream()
                .map(m -> ModelVO.from(m, cryptoUtil.decryptQuietly(m.getApiKeyCipher()), parseExtraParams(m.getExtraParams())))
                .toList();
    }

    @Override
    @Transactional
    public ModelVO create(ModelCreateDTO dto) {
        String name = dto.getName().trim();
        String type = dto.getType().trim();

        // 模型名称不能重复
        if (modelsMapper.countByName(name) > 0) {
            throw BizException.resourceConflict();
        }

        // EMBEDDING 类型必须指定向量维度 dimension且必须为 1024
        if ("EMBEDDING".equals(type)) {
            if (dto.getDimension() == null) {
                throw BizException.badRequest("EMBEDDING 类型必须指定向量维度 dimension");
            }
            if (!Integer.valueOf(1024).equals(dto.getDimension())) {
                throw BizException.badRequest("向量维度必须为 1024");
            }
        }

        // 同类型不能同时有多个默认模型
        boolean isDefault = Boolean.TRUE.equals(dto.getIsDefault());
        if (isDefault && modelsMapper.countDefaultByType(type) > 0) {
            throw BizException.modelDefaultExists();
        }

        LlmModel model = new LlmModel();
        model.setName(name);
        model.setType(type);
        model.setProvider(dto.getProvider() == null || dto.getProvider().isBlank() ? "openai" : dto.getProvider().trim());
        model.setBaseUrl(dto.getBaseUrl().trim());
        String apiKeyRaw = dto.getApiKey().trim();
        model.setApiKeyCipher(cryptoUtil.encrypt(apiKeyRaw));//密文
        model.setModelName(dto.getModelName().trim());
        model.setDimension("EMBEDDING".equals(type) ? dto.getDimension() : null);
        model.setTemperature(dto.getTemperature() != null ? dto.getTemperature() : ("CHAT".equals(type) ? new BigDecimal("0.7") : null));
        model.setMaxTokens(dto.getMaxTokens() != null ? dto.getMaxTokens() : ("CHAT".equals(type) ? 4096 : null));
        model.setTimeoutMs(dto.getTimeoutMs() != null ? dto.getTimeoutMs() : 60000);
        model.setIsDefault(isDefault);
        model.setEnabled(dto.getEnabled() == null || dto.getEnabled());
        model.setExtraParams(serializeExtraParams(dto.getExtraParams()));
        model.setCreatedAt(OffsetDateTime.now());
        model.setUpdatedAt(OffsetDateTime.now());

        modelsMapper.insert(model);

        audit("MODEL_CREATE", model.getName(), "创建模型，类型 " + model.getType());

        Map<String, Object> extraParams = dto.getExtraParams();
        return ModelVO.from(model, apiKeyRaw, extraParams);
    }

    /**
     * jsonb 原文 → Map
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> parseExtraParams(String jsonb) {
        if (jsonb == null || jsonb.isBlank()) {
            return new HashMap<>();
        }
        try {
            Map<String, Object> map = objectMapper.readValue(jsonb, Map.class);
            return map == null ? new HashMap<>() : map;
        } catch (Exception e) {
            log.warn("extraParams 解析失败: {}", jsonb, e);
            return new HashMap<>();
        }
    }

    /**
     * Map → jsonb 原文
     */
    private String serializeExtraParams(Map<String, Object> extraParams) {
        if (extraParams == null || extraParams.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(extraParams);
        } catch (Exception e) {
            log.warn("extraParams 序列化失败: {}", extraParams, e);
            throw BizException.internalError("extraParams 序列化失败");
        }
    }

    /**
     * 记录操作日志
     */
    private void audit(String action, String target, String detail) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            SysOperationLog entry = new SysOperationLog();
            Long userId = null;
            String username = null;
            if (auth != null && auth.getPrincipal() instanceof LoginUser lu) {
                userId = lu.getUserId();
                username = lu.getUsername();
            }
            entry.setUserId(userId);
            entry.setUsername(username);
            entry.setType("SYSTEM");
            entry.setAction(action);
            entry.setTarget(target);
            entry.setDetail(detail);
            entry.setResult("SUCCESS");
            entry.setCreatedAt(OffsetDateTime.now());
            operationLogMapper.insert(entry);
        } catch (Exception e) {
            log.warn("审计日志写入失败：{}", action, e);
        }
    }
}
