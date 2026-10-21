package xyz.cbt.wenqu.backend.modules.kb.dto;

import lombok.Data;

/**
 * 知识库列表查询参数
 */
@Data
public class KnowledgeBaseListQueryDTO {
    private int page = 1;
    private int size = 20;
    private String keyword;
    /** EMPTY / INDEXING / READY */
    private String status;
    /** 仅 ADMIN / SUPERADMIN 生效 */
    private Long ownerId;
}
