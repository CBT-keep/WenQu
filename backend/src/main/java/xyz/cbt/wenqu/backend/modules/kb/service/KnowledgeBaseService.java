package xyz.cbt.wenqu.backend.modules.kb.service;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.common.ErrorCode;
import xyz.cbt.wenqu.backend.common.PageResult;
import xyz.cbt.wenqu.backend.modules.auth.entity.LoginUser;
import xyz.cbt.wenqu.backend.modules.kb.dto.DocumentListQueryDTO;
import xyz.cbt.wenqu.backend.modules.kb.dto.KnowledgeBaseCreateDTO;
import xyz.cbt.wenqu.backend.modules.kb.dto.KnowledgeBaseListQueryDTO;
import xyz.cbt.wenqu.backend.modules.kb.entity.KbKnowledgeBase;
import xyz.cbt.wenqu.backend.modules.kb.mapper.KbReferenceMapper;
import xyz.cbt.wenqu.backend.modules.kb.mapper.KnowledgeBaseMapper;
import xyz.cbt.wenqu.backend.modules.kb.mapper.DocumentListProjection;
import xyz.cbt.wenqu.backend.modules.kb.mapper.KnowledgeBaseListProjection;
import xyz.cbt.wenqu.backend.modules.kb.mapper.LlmModelProjection;
import xyz.cbt.wenqu.backend.modules.kb.vo.DocumentListVO;
import xyz.cbt.wenqu.backend.modules.kb.vo.KnowledgeBaseListVO;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class KnowledgeBaseService {
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> STATUSES = Set.of("PENDING", "PARSING", "CHUNKING", "EMBEDDING", "READY", "FAILED");
    private static final Set<String> KB_STATUSES = Set.of("EMPTY", "INDEXING", "READY");
    private static final List<String> DEFAULT_SEPARATORS = List.of("\n\n", "\n", "。", "！", "？", "；", " ", "");
    private final KnowledgeBaseMapper mapper;
    private final KbReferenceMapper referenceMapper;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public PageResult<DocumentListVO> list(long kbId, DocumentListQueryDTO query,
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
        if (loginUser == null||loginUser.getUser()==null) {
            throw BizException.badRequest("当前用户信息不完整");
        }
        String role = loginUser.getUser().getRole();
        if (!isAdmin(role) && !ownerId.equals(loginUser.getUserId())) {
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

    /**
     * 知识库列表：USER 仅本人，ADMIN / SUPERADMIN 可见全部；ownerId 仅对管理角色生效
     */
    @Transactional(readOnly = true)
    public PageResult<KnowledgeBaseListVO> listKnowledgeBases(KnowledgeBaseListQueryDTO query,
                                                              Authentication authentication) {
        int page = query.getPage();
        int size = query.getSize();

        if (page < 1 || size < 1 || size > MAX_PAGE_SIZE) {
            throw BizException.badRequest("page 或 size 参数不合法(size 最大为 100)");
        }
        String normalizedStatus = query.getStatus() == null || query.getStatus().isBlank()
                ? null : query.getStatus().trim().toUpperCase();
        if (normalizedStatus != null && !KB_STATUSES.contains(normalizedStatus)) {
            throw BizException.badRequest("知识库状态不合法");
        }
        String kw = query.getKeyword() == null || query.getKeyword().isBlank() ? null : query.getKeyword().trim();

        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        if (loginUser == null||loginUser.getUser()==null) {
            throw BizException.badRequest("当前用户信息不完整");
        }
        Long ownerId = isAdmin(loginUser.getUser().getRole()) ? query.getOwnerId() : loginUser.getUserId();
        if (ownerId != null && ownerId <= 0) {
            throw BizException.badRequest("ownerId 参数不合法");
        }

        try (Page<KnowledgeBaseListProjection> result = PageHelper.startPage(page, size)) {
            List<KnowledgeBaseListVO> records = mapper.searchKnowledgeBases(ownerId, kw, normalizedStatus)
                    .stream().map(KnowledgeBaseListVO::from).toList();
            return PageResult.of(page, size, result.getTotal(), records);
        }
    }

    /**
     * 创建知识库
     */
    @Transactional
    public KnowledgeBaseListVO createKnowledgeBase(KnowledgeBaseCreateDTO dto, Authentication authentication) {
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        if (loginUser == null || loginUser.getUser() == null) {
            throw BizException.badRequest("当前用户信息不完整");
        }Long ownerId = loginUser.getUserId();
        String name = dto.getName().trim();


        if (mapper.countByOwnerAndName(ownerId, name) > 0) {
            throw BizException.knowledgeBaseNameTaken();
        }

        LlmModelProjection embeddingModel = referenceMapper.findModelById(dto.getEmbeddingModelId())
                .filter(model -> Boolean.TRUE.equals(model.enabled()))
                .orElseThrow(BizException::modelUnavailable);
        int globalDimension = intSetting("rag.embedding.dimension", 1024);
        if (!"EMBEDDING".equals(embeddingModel.type())
                || embeddingModel.dimension() == null
                || embeddingModel.dimension() != globalDimension) {
            throw BizException.embeddingDimensionMismatch();
        }

        boolean rerankEnabled = Boolean.TRUE.equals(dto.getRerankEnabled());
        Long rerankModelId = dto.getRerankModelId();
        if (rerankModelId != null) {
            LlmModelProjection rerankModel = referenceMapper.findModelById(rerankModelId)
                    .filter(model -> Boolean.TRUE.equals(model.enabled()))
                    .orElseThrow(BizException::modelUnavailable);
            if (!"RERANK".equals(rerankModel.type())) {
                throw BizException.badRequest("重排模型必须是 RERANK 类型");
            }
        } else if (rerankEnabled) {
            throw BizException.badRequest("开启重排时必须选择重排模型");
        }

        int chunkSize = dto.getChunkSize() != null ? dto.getChunkSize() : intSetting("rag.chunk.size", 800);
        int chunkOverlap = dto.getChunkOverlap() != null ? dto.getChunkOverlap()
                : intSetting("rag.chunk.overlap", 120);
        if (chunkSize <= 0 || chunkOverlap < 0 || chunkOverlap >= chunkSize) {
            throw BizException.badRequest("分片重叠必须大于等于 0 且小于分片大小");
        }

        String retrievalMode = dto.getRetrievalMode() == null ? "HYBRID" : dto.getRetrievalMode();
        BigDecimal vectorWeight = dto.getVectorWeight();
        BigDecimal bm25Weight = dto.getBm25Weight();
        if (vectorWeight == null && bm25Weight == null) {
            vectorWeight = decimalSetting("rag.retrieval.vector-weight", new BigDecimal("0.600"));
            bm25Weight = decimalSetting("rag.retrieval.bm25-weight", new BigDecimal("0.400"));
        } else if (vectorWeight == null) {
            vectorWeight = BigDecimal.ONE.subtract(bm25Weight);
        } else if (bm25Weight == null) {
            bm25Weight = BigDecimal.ONE.subtract(vectorWeight);
        }
        vectorWeight = vectorWeight.setScale(3, RoundingMode.HALF_UP);
        bm25Weight = bm25Weight.setScale(3, RoundingMode.HALF_UP);
        if (vectorWeight.compareTo(BigDecimal.ZERO) < 0 || vectorWeight.compareTo(BigDecimal.ONE) > 0
                || bm25Weight.compareTo(BigDecimal.ZERO) < 0 || bm25Weight.compareTo(BigDecimal.ONE) > 0) {
            throw BizException.badRequest("检索权重必须在 0 到 1 之间");
        }
        if (vectorWeight.add(bm25Weight).compareTo(BigDecimal.ONE) != 0) {
            throw BizException.badRequest("向量权重与 BM25 权重之和必须为 1");
        }
        int topK = dto.getTopK() != null ? dto.getTopK() : intSetting("rag.retrieval.top-k", 8);
        if (topK <= 0) {
            throw BizException.badRequest("topK 必须大于 0");
        }
        BigDecimal scoreThreshold = dto.getScoreThreshold() != null ? dto.getScoreThreshold()
                : decimalSetting("rag.retrieval.score-threshold", new BigDecimal("0.350"));
        scoreThreshold = scoreThreshold.setScale(3, RoundingMode.HALF_UP);
        if (scoreThreshold.compareTo(BigDecimal.ZERO) < 0 || scoreThreshold.compareTo(BigDecimal.ONE) > 0) {
            throw BizException.badRequest("scoreThreshold 必须在 0 到 1 之间");
        }

        KbKnowledgeBase kb = new KbKnowledgeBase();
        kb.setName(name);
        kb.setDescription(normalizeDescription(dto.getDescription()));
        kb.setEmbeddingModelId(dto.getEmbeddingModelId());
        kb.setRerankModelId(rerankModelId);
        kb.setChunkSize(chunkSize);
        kb.setChunkOverlap(chunkOverlap);
        kb.setSeparators(toJson(dto.getSeparators() == null ? DEFAULT_SEPARATORS : dto.getSeparators()));
        kb.setRetrievalMode(retrievalMode);
        kb.setVectorWeight(vectorWeight);
        kb.setBm25Weight(bm25Weight);
        kb.setTopK(topK);
        kb.setScoreThreshold(scoreThreshold);
        kb.setRerankEnabled(rerankEnabled);
        kb.setOwnerId(ownerId);
        kb.setVisibility(dto.getVisibility() == null ? "PRIVATE" : dto.getVisibility());
        kb.setStatus("EMPTY");
        kb.setDocCount(0);
        kb.setChunkCount(0);
        kb.setCreatedAt(OffsetDateTime.now());
        kb.setUpdatedAt(OffsetDateTime.now());

        try {
            mapper.insertKnowledgeBase(kb);
        } catch (DuplicateKeyException e) {

            throw BizException.knowledgeBaseNameTaken();
        }
        return KnowledgeBaseListVO.from(mapper.findKnowledgeBaseById(kb.getId()));
    }

    private String normalizeDescription(String description) {
        return description == null || description.isBlank() ? null : description.trim();
    }

    /**
     * separators 是 jsonb 列，由应用层序列化后经 CAST 写入
     */
    private String toJson(List<String> separators) {
        try {
            return objectMapper.writeValueAsString(separators);
        } catch (Exception e) {
            throw new BizException(ErrorCode.INTERNAL_ERROR, "分隔符序列化失败", 500);
        }
    }

    private int intSetting(String key, int fallback) {
        String value = referenceMapper.findSettingValue(key);
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            log.warn("系统参数 {} 不是整数，使用默认值 {}", key, fallback);
            return fallback;
        }
    }

    private BigDecimal decimalSetting(String key, BigDecimal fallback) {
        String value = referenceMapper.findSettingValue(key);
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException e) {
            log.warn("系统参数 {} 不是数字，使用默认值 {}", key, fallback);
            return fallback;
        }
    }

    private static boolean isAdmin(String role) {
        return "ADMIN".equals(role) || "SUPERADMIN".equals(role);
    }
}
