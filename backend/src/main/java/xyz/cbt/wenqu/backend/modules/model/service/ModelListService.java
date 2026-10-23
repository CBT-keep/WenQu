package xyz.cbt.wenqu.backend.modules.model.service;

import jakarta.validation.Valid;
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
import xyz.cbt.wenqu.backend.modules.model.client.ClientTestConfig;
import xyz.cbt.wenqu.backend.modules.model.client.ModelTestClient;
import xyz.cbt.wenqu.backend.modules.model.dto.ModelCreateDTO;
import xyz.cbt.wenqu.backend.modules.model.dto.ModelQueryDTO;
import xyz.cbt.wenqu.backend.modules.model.entity.Model;
import xyz.cbt.wenqu.backend.modules.model.mapper.ModelListMapper;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelListVO;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelTestVO;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelVO;
import xyz.cbt.wenqu.backend.utils.CryptoUtil;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ModelListService {
    private static final Set<String> TYPES = Set.of("CHAT", "EMBEDDING", "RERANK");

    private static final String MODEL_TYPE_CHAT = "CHAT";
    private static final int EMBEDDING_DIM = 1024;
    private static final String DEFAULT_PROVIDER = "openai";
    private static final BigDecimal DEFAULT_CHAT_TEMP = new BigDecimal("0.7");
    private static final int DEFAULT_CHAT_MAX_TOKENS = 4096;
    private static final int DEFAULT_TIMEOUT_MS = 60000;

    private final ModelListMapper mapper;
    private final ObjectMapper objectMapper;
    private final ModelTestClient modelTestClient;
    private final CryptoUtil cryptoUtil;
    private final OperationLogMapper operationLogMapper;

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

    /**
     * 模型联通测试
     */
    public ModelTestVO test(Long id) {
        Model model = mapper.selectById(id);
        if (model == null) {
            throw BizException.modelNotAvailable();
        }
        ClientTestConfig modelTest = ClientTestConfig.builder()
                .type(model.getType())
                .modelName(model.getModelName())
                .baseUrl(model.getBaseUrl())
                .apiKey(cryptoUtil.decrypt(model.getApiKeyCipher()))
                .temperature(model.getTemperature())
                .maxTokens(model.getMaxTokens())
                .timeoutMs(model.getTimeoutMs())
                .dimension(model.getDimension())
                .build();
        return modelTestClient.test(modelTest);
    }

    /**
     * 新增模型
     */
    @Transactional
    public ModelVO create(ModelCreateDTO dto) {
        String name = dto.getName().trim();
        String type = dto.getType().trim();

        // 模型名称不能重复
        if (mapper.countByName(name) > 0) {
            throw BizException.badRequest("模型名称不能重复");
        }

        // EMBEDDING 类型必须指定向量维度 dimension且必须为 1024
        if ("EMBEDDING".equals(type)) {
            if (dto.getDimension() == null) {
                throw BizException.badRequest("EMBEDDING 类型必须指定向量维度 dimension");
            }
            if (!Integer.valueOf(EMBEDDING_DIM).equals(dto.getDimension())) {
                throw BizException.badRequest("向量维度必须为 1024");
            }
        }

        // 同类型不能同时有多个默认模型
        boolean isDefault = Boolean.TRUE.equals(dto.getIsDefault());
        if (isDefault && mapper.countDefaultByType(type) > 0) {
            throw BizException.badRequest("同类型不能同时有多个默认模型");
        }

        String apiKeyRaw = dto.getApiKey().trim();
        // 默认提供者为 openai
        String provider = dto.getProvider() == null || dto.getProvider().isBlank()
                ? DEFAULT_PROVIDER
                : dto.getProvider().trim();
        // 默认temperature为 CHAT&&0.7
        BigDecimal temperature = dto.getTemperature() != null
                ? dto.getTemperature()
                : (MODEL_TYPE_CHAT.equals(type) ? DEFAULT_CHAT_TEMP : null);
        // 默认maxTokens为 CHAT&&4096
        Integer maxTokens = dto.getMaxTokens() != null
                ? dto.getMaxTokens()
                : (MODEL_TYPE_CHAT.equals(type) ? DEFAULT_CHAT_MAX_TOKENS : null);
        // dimension为EMBEDDING时填向量维度
        Integer dimension = "EMBEDDING".equals(type) ? dto.getDimension() : null;

        Model model = Model.builder()
                .name(name)
                .type(type)
                .provider(provider)
                .baseUrl(dto.getBaseUrl().trim())
                .apiKeyCipher(cryptoUtil.encrypt(apiKeyRaw))
                .modelName(dto.getModelName().trim())
                .dimension(dimension)
                .temperature(temperature)
                .maxTokens(maxTokens)
                .timeoutMs(dto.getTimeoutMs() != null ? dto.getTimeoutMs() : DEFAULT_TIMEOUT_MS)
                .isDefault(isDefault)
                .enabled(dto.getEnabled() == null || dto.getEnabled())
                .extraParams(serializeExtraParams(dto.getExtraParams()))
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();


        mapper.insert(model);

        audit("MODEL_CREATE", model.getName(), "创建模型，类型 " + model.getType());

        Map<String, Object> extraParams = dto.getExtraParams();
        return ModelVO.from(model, apiKeyRaw, extraParams);
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
            throw BizException.badRequest("extraParams 序列化失败");
        }
    }

    /**
     * 记录操作日志
     */
    private void audit(String action, String target, String detail) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            SysOperationLog entry = new SysOperationLog();
            LoginUser loginUser = null;
            if (auth != null && auth.getPrincipal() instanceof LoginUser lu) {
                loginUser = lu;
            }
            entry.setUserId(loginUser != null ? loginUser.getUserId() : null);
            entry.setUsername(loginUser != null ? loginUser.getUsername() : null);
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

    /**
     * 连通性测试--未保存
     */
    public ModelTestVO testDraft(ModelCreateDTO dto) {
        String type = dto.getType().trim();
        if (!TYPES.contains(type)) {
            throw BizException.badRequest("模型类型不合法");
        }
        if ("EMBEDDING".equals(type)) {
            if (dto.getDimension() == null) {
                throw BizException.badRequest("EMBEDDING 类型必须指定向量维度 dimension");
            }
            if (!Integer.valueOf(EMBEDDING_DIM).equals(dto.getDimension())) {
                throw BizException.badRequest("向量维度必须为 1024");
            }
        }
        return modelTestClient.test(
                ClientTestConfig.builder()
                        .type(type)
                        .modelName(dto.getModelName())
                        .baseUrl(dto.getBaseUrl())
                        .apiKey(dto.getApiKey())
                        .temperature(dto.getTemperature())
                        .maxTokens(dto.getMaxTokens())
                        .timeoutMs(dto.getTimeoutMs())
                        .dimension(dto.getDimension())
                        .build()
        );
    }
}
