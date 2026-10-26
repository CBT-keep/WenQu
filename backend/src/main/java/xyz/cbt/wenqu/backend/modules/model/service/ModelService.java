package xyz.cbt.wenqu.backend.modules.model.service;

import lombok.RequiredArgsConstructor;
import org.postgresql.util.PSQLException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.common.ErrorCode;
import xyz.cbt.wenqu.backend.modules.model.dto.ModelCreateDTO;
import xyz.cbt.wenqu.backend.modules.model.dto.ModelQueryDTO;
import xyz.cbt.wenqu.backend.modules.model.dto.ModelUpdateDTO;
import xyz.cbt.wenqu.backend.modules.model.mapper.ModelInsert;
import xyz.cbt.wenqu.backend.modules.model.mapper.ModelListProjection;
import xyz.cbt.wenqu.backend.modules.model.mapper.ModelMapper;
import xyz.cbt.wenqu.backend.modules.model.mapper.ModelUpdate;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelListVO;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelOptionVO;
import xyz.cbt.wenqu.backend.utils.CryptoUtil;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ModelService {
    private static final Set<String> TYPES = Set.of("CHAT", "EMBEDDING", "RERANK");

    private final ModelMapper mapper;
    private final ObjectMapper objectMapper;
    private final CryptoUtil crypto;

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
        return mapper.search(type, query.getEnabled()).stream().map(this::toVO).toList();
    }

    /** 
     * 查询已启用模型的下拉选项
     */
    @Transactional(readOnly = true)
    public List<ModelOptionVO> options(String type) {
        if (type != null && !TYPES.contains(type)) {
            throw BizException.badRequest("模型类型不合法");
        }
        return mapper.findEnabled(type);
    }

    /**
     * 新增模型
     */
    @Transactional
    public ModelListVO create(ModelCreateDTO dto) {
        validateCreateRules(dto);
        String name = dto.getName().trim();
        String baseUrl = dto.getBaseUrl().trim();
        boolean isDefault = Boolean.TRUE.equals(dto.getIsDefault());
        if (isDefault) mapper.lockDefaultType(dto.getType());
        checkConflicts(name, dto.getType(), isDefault, null);
        boolean chat = "CHAT".equals(dto.getType());
        var extraParams = dto.getExtraParams() == null ? objectMapper.createObjectNode() : dto.getExtraParams();
        var model = new ModelInsert(name, dto.getType(), dto.getProvider(), baseUrl,
                crypto.encrypt(dto.getApiKey()), dto.getModelName().trim(), dto.getDimension(),
                dto.getTemperature() == null && chat ? new BigDecimal("0.7") : dto.getTemperature(),
                dto.getMaxTokens() == null && chat ? Integer.valueOf(4096) : dto.getMaxTokens(),
                dto.getTimeoutMs() == null ? 60000 : dto.getTimeoutMs(),
                isDefault, dto.getEnabled() == null || dto.getEnabled(), objectMapper.writeValueAsString(extraParams));
        Long id = mapper.insert(model);
        if (id == null) {
            // 防止在高并发下出现重复名称或重复默认模型的情况，虽然数据库唯一约束也会阻止，但我们希望返回更友好的错误信息
            checkConflicts(name, dto.getType(), isDefault, null);
            throw new BizException(ErrorCode.RESOURCE_CONFLICT, "模型配置发生冲突，请重试", 409);
        }
        return toVO(mapper.findById(id));
    }

    /**
     * 合并当前配置后更新，行锁防止并发编辑覆盖彼此的未传字段
     */
    @Transactional
    public ModelListVO update(long id, ModelUpdateDTO dto) {
        if (dto != null && dto.getIsDefault() != null) lockDefaultType(id);
        var current = lockModel(id);
        validateUpdateRules(dto, current.type());
        var model = mergeUpdate(current, dto);
        checkConflicts(model.name(), current.type(), model.isDefault(), id);

        boolean vectorSpaceChanged = "EMBEDDING".equals(current.type()) && (
                !current.provider().equals(model.provider()) || !current.baseUrl().equals(model.baseUrl())
                || !current.modelName().equals(model.modelName())
                || !objectMapper.readTree(current.extraParamsJson()).equals(objectMapper.readTree(model.extraParamsJson())));
        if (vectorSpaceChanged && mapper.lockEmbeddingKnowledgeBases(id).stream()
                .anyMatch(kb -> "INDEXING".equals(kb.status()))) {
            throw BizException.operationNotAllowed("模型被正在索引的知识库引用，暂不能修改向量模型调用配置");
        }
        try {
            mapper.update(model);
        } catch (DuplicateKeyException e) {
            // 并发修改不同模型时仍可能命中唯一约束；不在已失败的事务中再次查询。
            throw translateModelConflict(e);
        }
        if (vectorSpaceChanged) mapper.markEmbeddingIndexesStale(id);
        return toVO(mapper.findById(id));
    }

    /**
     * 删除前锁定模型，阻止并发新增外键引用，并返回清晰的引用数量
     */
    @Transactional
    public void delete(long id) {
        lockModel(id);
        var references = mapper.countReferences(id);
        if (references.hasReferences()) {
            throw BizException.operationNotAllowed("模型仍被 " + references.knowledgeBaseCount()
                    + " 个知识库、" + references.conversationCount() + " 个会话引用，请先解除引用");
        }
        try {
            mapper.delete(id);
        } catch (DataIntegrityViolationException e) {
            throw BizException.operationNotAllowed("模型仍被其他资源引用，请先解除引用");
        }
    }

    /**
     * 专用切换接口会替换原默认，新增和普通编辑仍按冲突规则处理
     */
    @Transactional
    public ModelListVO setDefault(long id) {
        lockDefaultType(id);
        var model = lockModel(id);
        if (!Boolean.TRUE.equals(model.enabled())) throw BizException.modelNotAvailable();
        if (Boolean.TRUE.equals(model.isDefault())) return toVO(model);
        try {
            mapper.clearDefault(model.type(), id);
            if (mapper.setDefault(id) != 1) throw BizException.modelNotAvailable();
        } catch (DuplicateKeyException e) {
            throw translateModelConflict(e);
        }
        return toVO(mapper.findById(id));
    }

    private void lockDefaultType(long id) {
        if (id <= 0) throw BizException.badRequest("id 必须为正整数");
        var model = mapper.findById(id);
        if (model == null) throw BizException.modelNotAvailable();
        mapper.lockDefaultType(model.type());
    }

    private ModelListProjection lockModel(long id) {
        if (id <= 0) throw BizException.badRequest("id 必须为正整数");
        var model = mapper.findForUpdate(id);
        if (model == null) throw BizException.modelNotAvailable();
        return model;
    }

    private ModelListVO toVO(ModelListProjection model) {
        return ModelListVO.from(model, objectMapper.readTree(model.extraParamsJson()));
    }

    private void validateUpdateRules(ModelUpdateDTO dto, String type) {
        if (dto == null) throw BizException.badRequest("请求体不能为空");
        if (dto.getType() != null) throw BizException.badRequest("type 不允许修改，请删除后重新创建模型");
        if (dto.getBaseUrl() != null) validateBaseUrl(dto.getBaseUrl().trim());
        if ("EMBEDDING".equals(type) && dto.getDimension() != null && dto.getDimension() != 1024) {
            throw new BizException(ErrorCode.VECTOR_DIMENSION_MISMATCH, "向量维度必须与全局维度 1024 一致", 200);
        }
        if (dto.getExtraParams() != null && !dto.getExtraParams().isObject()) {
            throw BizException.badRequest("extraParams 必须是 JSON 对象");
        }
    }

    private ModelUpdate mergeUpdate(ModelListProjection current, ModelUpdateDTO dto) {
        return new ModelUpdate(current.id(),
                dto.getName() == null ? current.name() : dto.getName().trim(),
                dto.getProvider() == null ? current.provider() : dto.getProvider(),
                dto.getBaseUrl() == null ? current.baseUrl() : dto.getBaseUrl().trim(),
                dto.getApiKey() == null ? null : crypto.encrypt(dto.getApiKey()),
                dto.getModelName() == null ? current.modelName() : dto.getModelName().trim(),
                dto.getDimension() == null ? current.dimension() : dto.getDimension(),
                dto.getTemperature() == null ? current.temperature() : dto.getTemperature(),
                dto.getMaxTokens() == null ? current.maxTokens() : dto.getMaxTokens(),
                dto.getTimeoutMs() == null ? current.timeoutMs() : dto.getTimeoutMs(),
                dto.getIsDefault() == null ? current.isDefault() : dto.getIsDefault(),
                dto.getEnabled() == null ? current.enabled() : dto.getEnabled(),
                dto.getExtraParams() == null ? current.extraParamsJson() : objectMapper.writeValueAsString(dto.getExtraParams()));
    }

    private RuntimeException translateModelConflict(DuplicateKeyException exception) {
        if (exception.getMostSpecificCause() instanceof PSQLException cause && cause.getServerErrorMessage() != null) {
            String constraint = cause.getServerErrorMessage().getConstraint();
            if ("uk_llm_model_name".equals(constraint)) {
                return new BizException(ErrorCode.RESOURCE_CONFLICT, "模型名称已存在", 409);
            }
            if ("uk_llm_model_default".equals(constraint)) {
                return new BizException(ErrorCode.MODEL_DEFAULT_EXISTS, "该类型已存在默认模型", 200);
            }
        }
        return exception;
    }

    /**
     * 基础字段约束由 DTO 校验，这里处理条件必填、维度与配置结构规则
     */
    void validateCreateRules(ModelCreateDTO dto) {
        if (dto == null) throw BizException.badRequest("请求体不能为空");
        validateBaseUrl(dto.getBaseUrl().trim());
        if ("EMBEDDING".equals(dto.getType())) {
            if (dto.getDimension() == null) {
                throw BizException.badRequest("EMBEDDING 模型必须提供 dimension");
            }
            if (dto.getDimension() != 1024) {
                throw new BizException(ErrorCode.VECTOR_DIMENSION_MISMATCH, "向量维度必须与全局维度 1024 一致", 200);
            }
        }
        if (dto.getExtraParams() != null && !dto.getExtraParams().isObject()) {
            throw BizException.badRequest("extraParams 必须是 JSON 对象");
        }
    }

    private void checkConflicts(String name, String type, boolean isDefault, Long excludeId) {
        if (mapper.nameExists(name, excludeId)) {
            throw new BizException(ErrorCode.RESOURCE_CONFLICT, "模型名称已存在", 409);
        }
        if (isDefault && mapper.defaultExists(type, excludeId)) {
            throw new BizException(ErrorCode.MODEL_DEFAULT_EXISTS, "该类型已存在默认模型", 200);
        }
    }

    private void validateBaseUrl(String baseUrl) {
        try {
            URI uri = new URI(baseUrl);
            if (("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null && uri.getRawUserInfo() == null
                    && uri.getRawQuery() == null && uri.getRawFragment() == null
                    && uri.getPort() >= -1 && uri.getPort() <= 65535) return;
        } catch (URISyntaxException ignored) {
            // Report a contract error without echoing potentially sensitive URL contents.
        }
        throw BizException.badRequest("baseUrl 必须是合法的 HTTP(S) 基地址，不能包含凭据、查询参数或片段");
    }
}
