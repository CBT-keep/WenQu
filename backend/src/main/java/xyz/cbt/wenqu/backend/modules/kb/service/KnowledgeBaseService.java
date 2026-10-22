package xyz.cbt.wenqu.backend.modules.kb.service;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.common.ErrorCode;
import xyz.cbt.wenqu.backend.common.PageResult;
import xyz.cbt.wenqu.backend.modules.auth.entity.LoginUser;
import xyz.cbt.wenqu.backend.modules.kb.dto.DocumentListQueryDTO;
import xyz.cbt.wenqu.backend.modules.kb.dto.KnowledgeBaseQueryDTO;
import xyz.cbt.wenqu.backend.modules.kb.dto.KnowledgeBaseUpdateDTO;
import xyz.cbt.wenqu.backend.modules.kb.entity.KnowledgeBase;
import xyz.cbt.wenqu.backend.modules.kb.mapper.KnowledgeBaseMapper;
import xyz.cbt.wenqu.backend.modules.kb.mapper.DocumentListProjection;
import xyz.cbt.wenqu.backend.modules.kb.mapper.EmbeddingModelCheckProjection;
import xyz.cbt.wenqu.backend.modules.kb.mapper.KnowledgeBaseDetailProjection;
import xyz.cbt.wenqu.backend.modules.kb.mapper.KnowledgeBaseListProjection;
import xyz.cbt.wenqu.backend.modules.kb.vo.DocumentListVO;
import xyz.cbt.wenqu.backend.modules.kb.vo.KnowledgeBaseListVO;
import xyz.cbt.wenqu.backend.modules.kb.vo.KnowledgeBaseUpdateVO;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KnowledgeBaseService {
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> STATUSES = Set.of("PENDING", "PARSING", "CHUNKING", "EMBEDDING", "READY", "FAILED");
    private static final Set<String> KNOWLEDGE_BASE_STATUSES = Set.of("EMPTY", "INDEXING", "READY");
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_SUPERADMIN = "SUPERADMIN";
    private final KnowledgeBaseMapper mapper;

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
        requireAccessible(kbId, authentication);
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
     * 归属校验：知识库 —— ADMIN/SUPERADMIN 放行，USER 仅本人（归属校验口径）
     */
    private LoginUser requireAccessible(long kbId, Authentication authentication) {
        Long ownerId = mapper.findKnowledgeBaseOwner(kbId);
        if (ownerId == null) {
            throw BizException.knowledgeBaseNotFound();
        }
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        String role = loginUser.getUser().getRole();
        if (!ROLE_ADMIN.equals(role) && !ROLE_SUPERADMIN.equals(role)
                && !ownerId.equals(loginUser.getUserId())) {
            throw BizException.forbiddenResource();
        }
        return loginUser;
    }

    /**
     * 更新知识库，字段均可选，不传表示不修改。
     * 改动 embedding 模型或切分配置会使已索引分片失效，返回 needReindex=true 提示，不自动重建。
     */
    @Transactional
    public KnowledgeBaseUpdateVO update(long kbId, KnowledgeBaseUpdateDTO dto, Authentication authentication) {
        requireAccessible(kbId, authentication);
        KnowledgeBaseDetailProjection current = mapper.findById(kbId)
                .orElseThrow(BizException::knowledgeBaseNotFound);

        boolean touchedIndex = isIndexTouching(dto, current);

        // chunkOverlap 必须 < chunkSize；未传的项沿用现值后再校验，
        // 否则只改 chunkSize 时会让 overlap >= size 落库，被数据库 CHECK 约束拒绝并冒成 500
        int chunkSize = dto.getChunkSize() != null ? dto.getChunkSize() : current.chunkSize();
        int chunkOverlap = dto.getChunkOverlap() != null ? dto.getChunkOverlap() : current.chunkOverlap();
        if (chunkOverlap < 0 || chunkOverlap >= chunkSize) {
            throw BizException.badRequest("chunkOverlap 必须小于 chunkSize");
        }

        // 启用重排时 rerankModelId 必填
        if (Boolean.TRUE.equals(dto.getRerankEnabled()) && dto.getRerankModelId() == null) {
            throw BizException.badRequest("启用重排时必须指定 rerankModelId");
        }

        // embedding 模型：必须是 EMBEDDING 且维度 == 全局维度，否则 40006
        if (dto.getEmbeddingModelId() != null && !dto.getEmbeddingModelId().equals(current.embeddingModelId())) {
            requireUsableEmbeddingModel(dto.getEmbeddingModelId());
        }

        mapper.update(buildPatch(kbId, dto));

        return new KnowledgeBaseUpdateVO(touchedIndex);
    }

    /**
     * DTO → 更新补丁：只填传入的字段，未传的保持 null 以便 XML 跳过；
     * name 去首尾空白，separators 转 JSON 字面量。
     */
    private static KnowledgeBase buildPatch(long kbId, KnowledgeBaseUpdateDTO dto) {
        KnowledgeBase patch = new KnowledgeBase();
        patch.setId(kbId);
        patch.setName(trimToNull(dto.getName()));
        patch.setDescription(dto.getDescription());
        patch.setEmbeddingModelId(dto.getEmbeddingModelId());
        patch.setRerankModelId(dto.getRerankModelId());
        patch.setChunkSize(dto.getChunkSize());
        patch.setChunkOverlap(dto.getChunkOverlap());
        patch.setSeparators(dto.getSeparators() == null ? null : toJsonArray(dto.getSeparators()));
        patch.setRetrievalMode(dto.getRetrievalMode());
        patch.setVectorWeight(dto.getVectorWeight());
        patch.setBm25Weight(dto.getBm25Weight());
        patch.setTopK(dto.getTopK());
        patch.setScoreThreshold(dto.getScoreThreshold());
        patch.setRerankEnabled(dto.getRerankEnabled());
        patch.setVisibility(dto.getVisibility());
        return patch;
    }

    /**
     * 判断本次更新是否真的改动了已索引的数据：embedding 模型或切分配置。
     * 必须与当前值比对 —— 前端会整包回传切分配置，仅凭「传了该字段」会把原值回传也当成改动，
     * 导致未做任何修改却提示需要重建索引。
     */
    private boolean isIndexTouching(KnowledgeBaseUpdateDTO dto, KnowledgeBaseDetailProjection current) {
        return (dto.getEmbeddingModelId() != null && !dto.getEmbeddingModelId().equals(current.embeddingModelId()))
                || (dto.getChunkSize() != null && !dto.getChunkSize().equals(current.chunkSize()))
                || (dto.getChunkOverlap() != null && !dto.getChunkOverlap().equals(current.chunkOverlap()))
                || dto.getSeparators() != null;
    }

    /**
     * 校验 embedding 模型：必须是 EMBEDDING 且维度等于全局维度，否则 40006
     */
    private void requireUsableEmbeddingModel(long modelId) {
        EmbeddingModelCheckProjection model = mapper.findEmbeddingModelCheck(modelId);
        if (model == null || !"EMBEDDING".equals(model.type())) {
            throw new BizException(ErrorCode.EMBEDDING_DIMENSION_MISMATCH,
                    "embeddingModelId 必须是 EMBEDDING 类型的模型", 200);
        }
        if (model.dimension() == null || model.globalDimension() == null
                || !model.globalDimension().equals(model.dimension())) {
            throw new BizException(ErrorCode.EMBEDDING_DIMENSION_MISMATCH, "向量维度不匹配", 200);
        }
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * 分隔符数组转 JSON 字面量，由 SQL 侧 CAST(... AS jsonb) 落库
     */
    private static String toJsonArray(List<String> separators) {
        return separators.stream()
                .map(s -> "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"")
                .collect(Collectors.joining(",", "[", "]"));
    }
}
