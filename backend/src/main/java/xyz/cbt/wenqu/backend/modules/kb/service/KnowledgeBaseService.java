package xyz.cbt.wenqu.backend.modules.kb.service;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.common.PageResult;
import xyz.cbt.wenqu.backend.modules.auth.entity.LoginUser;
import xyz.cbt.wenqu.backend.modules.kb.dto.DocumentListQueryDTO;
import xyz.cbt.wenqu.backend.modules.kb.mapper.KnowledgeBaseMapper;
import xyz.cbt.wenqu.backend.modules.kb.mapper.DocumentListProjection;
import xyz.cbt.wenqu.backend.modules.kb.vo.DocumentListVO;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class KnowledgeBaseService {
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> STATUSES = Set.of("PENDING", "PARSING", "CHUNKING", "EMBEDDING", "READY", "FAILED");
    private final KnowledgeBaseMapper mapper;

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
