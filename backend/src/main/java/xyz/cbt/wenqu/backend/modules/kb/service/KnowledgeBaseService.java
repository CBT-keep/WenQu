package xyz.cbt.wenqu.backend.modules.kb.service;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;
import jakarta.validation.Validator;
import xyz.cbt.wenqu.backend.modules.kb.vo.KnowledgeBaseDetailVO;
import xyz.cbt.wenqu.backend.modules.kb.vo.KnowledgeBaseStatsVO;
import java.util.Objects;
import xyz.cbt.wenqu.backend.modules.kb.dto.ChunkQueryDTO;
import xyz.cbt.wenqu.backend.modules.kb.vo.ChunkVO;
import xyz.cbt.wenqu.backend.modules.kb.mapper.ChunkProjection;
import java.util.LinkedHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.common.ErrorCode;
import xyz.cbt.wenqu.backend.common.PageResult;
import xyz.cbt.wenqu.backend.modules.auth.entity.LoginUser;
import xyz.cbt.wenqu.backend.modules.kb.dto.DocumentListQueryDTO;
import xyz.cbt.wenqu.backend.modules.kb.dto.KnowledgeBaseCreateDTO;
import xyz.cbt.wenqu.backend.modules.kb.dto.KnowledgeBaseQueryDTO;
import xyz.cbt.wenqu.backend.modules.kb.mapper.KnowledgeBaseMapper;
import xyz.cbt.wenqu.backend.modules.kb.mapper.KnowledgeBaseInsert;
import xyz.cbt.wenqu.backend.modules.kb.mapper.KnowledgeBaseModelProjection;
import xyz.cbt.wenqu.backend.modules.kb.mapper.DocumentListProjection;
import xyz.cbt.wenqu.backend.modules.kb.mapper.KnowledgeBaseListProjection;
import xyz.cbt.wenqu.backend.modules.kb.vo.DocumentListVO;
import xyz.cbt.wenqu.backend.modules.kb.vo.KnowledgeBaseListVO;
import xyz.cbt.wenqu.backend.modules.kb.vo.KnowledgeBaseOptionVO;

import java.util.List;
import java.util.Set;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class KnowledgeBaseService {
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> STATUSES = Set.of("PENDING", "PARSING", "CHUNKING", "EMBEDDING", "READY", "FAILED");
    private static final Set<String> KNOWLEDGE_BASE_STATUSES = Set.of("EMPTY", "INDEXING", "READY");
    private final KnowledgeBaseMapper mapper;
    private final ObjectMapper objectMapper;
    private final Validator validator;
    private static final Set<String> UPDATE_FIELDS = Set.of("name", "description", "embeddingModelId",
            "rerankModelId", "chunkSize", "chunkOverlap", "separators", "retrievalMode", "vectorWeight",
            "bm25Weight", "rerankEnabled", "topK", "scoreThreshold", "visibility");
    private static final List<String> DEFAULT_SEPARATORS = List.of("\n\n", "\n", "。", "！", "？", "；", " ", "");

    /** 
     * 下拉选项不分页，归属范围与知识库列表保持一致
     */
    @Transactional(readOnly = true)
    public List<KnowledgeBaseOptionVO> listOptions(Authentication authentication) {
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        Long ownerId = loginUser.isAdministrator() ? null : loginUser.getUserId();
        return mapper.findOptions(ownerId);
    }

    /**
     * 创建知识库，校验参数合法性，返回创建后的知识库信息
     */
    @Transactional
    public KnowledgeBaseListVO createKnowledgeBase(KnowledgeBaseCreateDTO dto, Authentication authentication) {
        LoginUser user = (LoginUser) authentication.getPrincipal();
        var value = validateConfiguration(dto, user.getUserId());
        checkName(value.name(), value.ownerId(), null);
        try {
            long id = mapper.insertKnowledgeBase(value);
            return KnowledgeBaseListVO.from(mapper.findKnowledgeBase(id));
        } catch (DuplicateKeyException e) {
            throw nameConflict();
        }
    }

    /**
     * 校验知识库配置参数的合法性
     */
    private KnowledgeBaseInsert validateConfiguration(KnowledgeBaseCreateDTO dto, long ownerId) {
        if (!validator.validate(dto).isEmpty()) throw BizException.badRequest("知识库名称、描述或模型参数不合法");
        // 取值并校验合法性
        String name = dto.getName().trim();
        String description = dto.getDescription();
        if (description != null && description.isBlank()) description = null;
        if (dto.getEmbeddingModelId() <= 0) throw BizException.badRequest("embeddingModelId 必须为正数");
        validateModel(dto.getEmbeddingModelId(), "EMBEDDING");

        // 校验重排相关参数
        boolean rerankEnabled = Boolean.TRUE.equals(dto.getRerankEnabled());
        Long rerankModelId = dto.getRerankModelId();
        if (rerankEnabled && rerankModelId == null) throw BizException.badRequest("启用重排时必须提供 rerankModelId");
        if (rerankModelId != null) {
            if (rerankModelId <= 0) throw BizException.badRequest("rerankModelId 必须为正数");
            validateModel(rerankModelId, "RERANK");
        }

        int chunkSize = dto.getChunkSize() == null ? 800 : dto.getChunkSize();
        int chunkOverlap = dto.getChunkOverlap() == null ? 120 : dto.getChunkOverlap();
        if (chunkSize <= 0 || chunkOverlap < 0 || chunkOverlap >= chunkSize) {
            throw BizException.badRequest("分片大小与重叠量不合法");
        }
        // 分片分隔符校验
        List<String> separators = dto.getSeparators() == null ? DEFAULT_SEPARATORS : dto.getSeparators();
        if (separators.isEmpty()) throw BizException.badRequest("separators 不能为空数组");
        for (int i = 0; i < separators.size(); i++) {
            String separator = separators.get(i);
            if (separator == null || (separator.isEmpty() && i != separators.size() - 1)) {
                throw BizException.badRequest("separators 必须为非空字符串数组，仅最后一个可为空串");
            }
        }
        String mode = dto.getRetrievalMode() == null ? "HYBRID" : dto.getRetrievalMode();
        if (!Set.of("HYBRID", "VECTOR", "BM25").contains(mode)) {
            throw BizException.badRequest("retrievalMode 不合法");
        }

        // 权重校验
        BigDecimal vectorWeight = dto.getVectorWeight() == null ? new BigDecimal("0.6") : dto.getVectorWeight();
        BigDecimal bm25Weight = dto.getBm25Weight() == null ? new BigDecimal("0.4") : dto.getBm25Weight();
        if (vectorWeight.compareTo(BigDecimal.ZERO) < 0 || vectorWeight.compareTo(BigDecimal.ONE) > 0
                || bm25Weight.compareTo(BigDecimal.ZERO) < 0 || bm25Weight.compareTo(BigDecimal.ONE) > 0
                || vectorWeight.add(bm25Weight).compareTo(BigDecimal.ONE) != 0
                || vectorWeight.stripTrailingZeros().scale() > 3 || bm25Weight.stripTrailingZeros().scale() > 3) {
            throw BizException.badRequest("vectorWeight 与 bm25Weight 必须在 [0,1] 且和为 1，最多三位小数");
        }

        // topK 与 scoreThreshold 校验
        int topK = dto.getTopK() == null ? readIntSetting("rag.retrieval.top-k") : dto.getTopK();
        BigDecimal threshold = dto.getScoreThreshold() == null
                ? readDecimalSetting("rag.retrieval.score-threshold") : dto.getScoreThreshold();
        if (topK <= 0 || threshold.compareTo(BigDecimal.ZERO) < 0 || threshold.compareTo(BigDecimal.ONE) > 0
                || threshold.stripTrailingZeros().scale() > 3) {
            throw BizException.badRequest("topK 或 scoreThreshold 不合法");
        }
        if (dto.getVisibility() != null && !"PRIVATE".equals(dto.getVisibility())) {
            throw BizException.badRequest("visibility 仅支持 PRIVATE");
        }

        return new KnowledgeBaseInsert(name, description, dto.getEmbeddingModelId(), rerankModelId,
                chunkSize, chunkOverlap, objectMapper.writeValueAsString(separators), mode,
                vectorWeight, bm25Weight, rerankEnabled, topK, threshold, ownerId);
    }

    @Transactional(readOnly = true)
    public KnowledgeBaseDetailVO detail(long kbId, Authentication authentication) {
        checkAccess(kbId, authentication);
        return readDetail(kbId);
    }

    private KnowledgeBaseDetailVO readDetail(long kbId) {
        var row = mapper.findKnowledgeBase(kbId);
        var config = mapper.findConfig(kbId);
        if (row == null || config == null) throw BizException.knowledgeBaseNotFound();
        List<String> separators = objectMapper.readValue(config.separatorsJson(),
                objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        return KnowledgeBaseDetailVO.from(row, config.chunkSize(), config.chunkOverlap(), separators,
                config.indexStale() && config.hasChunks());
    }

    /** 
     * 编辑知识库，支持部分字段更新，返回更新后的知识库信息
     */
    @Transactional
    public KnowledgeBaseDetailVO update(long kbId, JsonNode patch, Authentication authentication) {
        if (kbId <= 0) throw BizException.badRequest("kbId 必须为正数");
        Long ownerId = mapper.lockKnowledgeBase(kbId);
        checkOwner(ownerId, authentication);
        if (patch == null || !patch.isObject()) throw BizException.badRequest("请求体必须为对象");
        for (var entry : patch.properties()) {
            if (!UPDATE_FIELDS.contains(entry.getKey())) throw BizException.badRequest("不支持更新字段 " + entry.getKey());
            validatePatchValue(entry.getKey(), entry.getValue());
        }
        var current = readDetail(kbId);
        ObjectNode merged = objectMapper.createObjectNode();
        JsonNode original = objectMapper.valueToTree(current);
        for (String field : UPDATE_FIELDS) merged.set(field, original.get(field));
        for (var entry : patch.properties()) merged.set(entry.getKey(), entry.getValue());
        KnowledgeBaseCreateDTO dto;
        try {
            dto = objectMapper.treeToValue(merged, KnowledgeBaseCreateDTO.class);
        } catch (tools.jackson.core.JacksonException e) {
            throw BizException.badRequest("知识库配置参数类型不合法");
        }
        var value = validateConfiguration(dto, ownerId);
        boolean indexChanged = !Objects.equals(current.embeddingModelId(), value.embeddingModelId())
                || current.chunkSize() != value.chunkSize() || current.chunkOverlap() != value.chunkOverlap()
                || !objectMapper.readTree(value.separatorsJson()).equals(original.get("separators"));
        if (indexChanged && "INDEXING".equals(current.status())) {
            throw BizException.operationNotAllowed("索引期间不能修改向量模型或切分参数");
        }
        checkName(value.name(), ownerId, kbId);
        var config = mapper.findConfig(kbId);
        boolean stale = config.hasChunks() && (config.indexStale() || indexChanged);
        if (patch.isEmpty()) return current;
        try {
            mapper.updateKnowledgeBase(kbId, value, stale);
        } catch (DuplicateKeyException e) {
            throw nameConflict();
        }
        return readDetail(kbId);
    }

    /**
     * 知识库统计信息，包含文档数、内容块数、存储大小、索引时间、平均分片长度、文档状态分布
     */
    @Transactional(readOnly = true)
    public KnowledgeBaseStatsVO stats(long kbId, Authentication authentication) {
        checkAccess(kbId, authentication);
        var row = mapper.findStats(kbId);
        var statuses = new LinkedHashMap<String, Long>();
        objectMapper.readTree(row.docStatusJson()).properties().forEach(entry ->
                statuses.put(entry.getKey(), entry.getValue().asLong()));
        return new KnowledgeBaseStatsVO(row.docCount(), row.chunkCount(), statuses, row.storageBytes(),
                row.lastIndexedAt(), row.avgChunkTokens());
    }

    @Transactional(readOnly = true)
    public PageResult<ChunkVO> listChunks(long docId, ChunkQueryDTO query, Authentication authentication) {
        if (docId <= 0 || query.getPage() < 1 || query.getSize() < 1 || query.getSize() > MAX_PAGE_SIZE) {
            throw BizException.badRequest("docId、page 或 size 参数不合法(size 最大为 100)");
        }
        Long kbId = mapper.findDocumentKnowledgeBase(docId);
        if (kbId == null) throw new BizException(ErrorCode.RESOURCE_NOT_FOUND, "文档不存在", 404);
        checkAccess(kbId, authentication);
        String keyword = query.getKeyword() == null || query.getKeyword().isBlank() ? null : query.getKeyword().trim();
        try (Page<ChunkProjection> page = PageHelper.startPage(query.getPage(), query.getSize())) {
            List<ChunkVO> records = mapper.searchChunks(docId, keyword).stream().map(row -> new ChunkVO(
                    row.id(), row.chunkIndex(), row.tokenCount(), row.content(), row.hasEmbedding(),
                    row.metadataJson() == null ? null : objectMapper.readTree(row.metadataJson()), row.createdAt())).toList();
            return PageResult.of(query.getPage(), query.getSize(), page.getTotal(), records);
        }
    }

    /**
     * 校验 patch 中的字段值是否合法
     */
    private void validatePatchValue(String field, JsonNode value) {
        if (value.isNull()) {
            if (!Set.of("description", "rerankModelId").contains(field)) throw BizException.badRequest(field + " 不允许为 null");
            return;
        }
        boolean valid = switch (field) {
            case "name", "description", "retrievalMode", "visibility" -> value.isTextual();
            case "embeddingModelId", "rerankModelId" -> value.isIntegralNumber() && value.canConvertToLong();
            case "chunkSize", "chunkOverlap", "topK" -> value.isIntegralNumber() && value.canConvertToInt();
            case "vectorWeight", "bm25Weight", "scoreThreshold" -> value.isNumber();
            case "rerankEnabled" -> value.isBoolean();
            case "separators" -> value.isArray() && value.valueStream().allMatch(JsonNode::isTextual);
            default -> false;
        };
        if (!valid) throw BizException.badRequest(field + " 参数类型不合法");
    }

    private void checkName(String name, long ownerId, Long currentId) {
        Long existing = mapper.findIdByNameAndOwner(name, ownerId);
        if (existing != null && !existing.equals(currentId)) throw nameConflict();
    }

    private BizException nameConflict() {
        return new BizException(ErrorCode.RESOURCE_CONFLICT, "同一归属人下知识库名称已存在", 409);
    }

    private void checkAccess(long kbId, Authentication authentication) {
        if (kbId <= 0) throw BizException.badRequest("kbId 必须为正数");
        checkOwner(mapper.findKnowledgeBaseOwner(kbId), authentication);
    }

    private void checkOwner(Long ownerId, Authentication authentication) {
        if (ownerId == null) throw BizException.knowledgeBaseNotFound();
        LoginUser user = (LoginUser) authentication.getPrincipal();
        if (!user.isAdministrator() && !ownerId.equals(user.getUserId())) throw BizException.forbiddenResource();
    }

    /**
     * 校验模型是否存在、启用且类型匹配
     */
    private void validateModel(long id, String expectedType) {
        KnowledgeBaseModelProjection model = mapper.findModel(id);
        if (model == null || !Boolean.TRUE.equals(model.enabled()) || !expectedType.equals(model.type())) {
            throw BizException.badRequest(expectedType + " 模型不存在、已禁用或类型不匹配");
        }
        if ("EMBEDDING".equals(expectedType) && !Integer.valueOf(readIntSetting("rag.embedding.dimension")).equals(model.dimension())) {
            throw new BizException(ErrorCode.VECTOR_DIMENSION_MISMATCH, "向量维度与全局维度不匹配", 200);
        }
    }

    /**
     * 读取系统参数，若不存在则抛出异常
     */
    private int readIntSetting(String key) {
        String value = mapper.findSetting(key);
        if (value == null) throw new IllegalStateException("缺少系统参数 " + key);
        return Integer.parseInt(value);
    }

    private BigDecimal readDecimalSetting(String key) {
        String value = mapper.findSetting(key);
        if (value == null) throw new IllegalStateException("缺少系统参数 " + key);
        return new BigDecimal(value);
    }

    /**
     * 知识库列表
     */
    @Transactional(readOnly = true)
    public PageResult<KnowledgeBaseListVO> listKnowledgeBases(KnowledgeBaseQueryDTO query,
                                                               Authentication authentication) {
        // 取出参数并校验合法性
        int page = query.getPage();
        int size = query.getSize();
        if (page < 1 || size < 1 || size > MAX_PAGE_SIZE || (query.getOwnerId() != null && query.getOwnerId() < 1)) {
            throw BizException.badRequest("page、size 或 ownerId 参数不合法(size 最大为 100)");
        }
        String keyword = query.getKeyword() == null || query.getKeyword().isBlank() ? null : query.getKeyword().trim();
        String status = query.getStatus() == null || query.getStatus().isBlank()
                ? null : query.getStatus().trim().toUpperCase();
        if (status != null && !KNOWLEDGE_BASE_STATUSES.contains(status)) {
            throw BizException.badRequest("知识库状态不合法");
        }

        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        Long effectiveOwnerId = loginUser.isAdministrator()
                ? query.getOwnerId() : loginUser.getUserId();

        try (Page<KnowledgeBaseListProjection> result = PageHelper.startPage(page, size)) {
            List<KnowledgeBaseListVO> records = mapper.searchKnowledgeBases(keyword, status, effectiveOwnerId)
                    .stream().map(KnowledgeBaseListVO::from).toList();
            return PageResult.of(page, size, result.getTotal(), records);
        }
    }

    /**
     * 文档列表
     */
    @Transactional(readOnly = true)
    public PageResult<DocumentListVO> listDocuments(long kbId, DocumentListQueryDTO query,
                                           Authentication authentication) {
        // 取值
        int page = query.getPage();
        int size = query.getSize();
        String keyword = query.getKeyword();
        String status = query.getStatus();

        // 校验参数合法性并校验归属
        if (kbId <= 0 || page < 1 || size < 1 || size > MAX_PAGE_SIZE) {
            throw BizException.badRequest("kbId、page 或 size 参数不合法(size 最大为 100)");
        }
        String normalizedStatus = status == null || status.isBlank() ? null : status.trim().toUpperCase();
        if (normalizedStatus != null && !STATUSES.contains(normalizedStatus)) {
            throw BizException.badRequest("文档状态不合法");
        }
        Long ownerId = mapper.findKnowledgeBaseOwner(kbId);
        if (ownerId == null) throw BizException.knowledgeBaseNotFound();
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        if (!loginUser.isAdministrator() && !ownerId.equals(loginUser.getUserId())) {
            throw BizException.forbiddenResource();
        }
        String kw = keyword == null || keyword.isBlank() ? null : keyword.trim();

        // 权限查询必须先完成，startPage 只作用于紧随其后的文档列表查询
        // Page.close() 确保异常情况下也清理分页线程状态。
        try (Page<DocumentListProjection> result = PageHelper.startPage(page, size)) {
            List<DocumentListVO> records = mapper.search(kbId, kw, normalizedStatus)
                    .stream().map(DocumentListVO::from).toList();
            return PageResult.of(page, size, result.getTotal(), records);
        }
    }
}
