package xyz.cbt.wenqu.backend.modules.kb.service;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import tools.jackson.databind.ObjectMapper;
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
    private static final List<String> DEFAULT_SEPARATORS = List.of("\n\n", "\n", "。", "！", "？", "；", " ", "");

    /**
     * 创建知识库，校验参数合法性，返回创建后的知识库信息
     */
    @Transactional
    public KnowledgeBaseListVO createKnowledgeBase(KnowledgeBaseCreateDTO dto, Authentication authentication) {
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

        LoginUser user = (LoginUser) authentication.getPrincipal();
        long ownerId = user.getUserId();
        if (mapper.findIdByNameAndOwner(name, ownerId) != null) {
            throw new BizException(ErrorCode.RESOURCE_CONFLICT, "同一归属人下知识库名称已存在", 409);
        }
        try {
            long id = mapper.insertKnowledgeBase(new KnowledgeBaseInsert(name, description,
                    dto.getEmbeddingModelId(), rerankModelId, chunkSize, chunkOverlap,
                    objectMapper.writeValueAsString(separators), mode, vectorWeight, bm25Weight,
                    rerankEnabled, topK, threshold, ownerId));
            return KnowledgeBaseListVO.from(mapper.findKnowledgeBase(id));
        } catch (DuplicateKeyException e) {
            throw new BizException(ErrorCode.RESOURCE_CONFLICT, "同一归属人下知识库名称已存在", 409);
        }
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
        String role = loginUser.getUser().getRole();
        boolean administrator = "ADMIN".equals(role) || "SUPERADMIN".equals(role);
        Long effectiveOwnerId = administrator
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
        String role = loginUser.getUser().getRole();
        if (!"ADMIN".equals(role) && !"SUPERADMIN".equals(role) && !ownerId.equals(loginUser.getUserId())) {
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
