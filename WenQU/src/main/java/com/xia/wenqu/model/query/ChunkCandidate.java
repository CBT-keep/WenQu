package com.xia.wenqu.model.query;

import lombok.Data;

/**
 * 检索候选块：doc_chunk join document 的查询结果
 * embedding 为 JSON 数组字符串，如 [0.123,-0.456,...]
 */
@Data
public class ChunkCandidate {
    private Long id;
    private Long documentId;
    private String documentName;
    private String content;
    private String sectionPath;
    private String embedding;
}
