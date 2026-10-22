package xyz.cbt.wenqu.backend.modules.kb.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 更新知识库响应（doc/04 §5.3）：仅返回 needReindex。
 * needReindex=true 表示改了 embedding 模型或切分配置，已索引分片失效，需人工触发重建；
 * 服务端不自动重建。前端据此提示用户，其余字段由前端靠详情查询刷新。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeBaseUpdateVO {
    private Boolean needReindex;
}
