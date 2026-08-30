package com.xia.wenqu.service.impl;

import com.xia.wenqu.mapper.DocChunkMapper;
import com.xia.wenqu.mapper.DocumentMapper;
import com.xia.wenqu.mapper.KnowledgeBaseMapper;
import com.xia.wenqu.model.entity.DocChunk;
import com.xia.wenqu.model.entity.Document;
import com.xia.wenqu.model.entity.KnowledgeBase;
import com.xia.wenqu.model.enums.DocumentStatus;
import com.xia.wenqu.service.DocumentProcessService;
import com.xia.wenqu.service.EmbeddingService;
import com.xia.wenqu.service.chunker.TextChunker;
import com.xia.wenqu.service.extractor.TextExtractorFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * 异步处理实现类
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentProcessServiceImpl implements DocumentProcessService {

    private final DocumentMapper documentMapper;
    private final DocChunkMapper docChunkMapper;
    private final TextExtractorFactory extractorFactory;
    private final KnowledgeBaseMapper knowledgeBaseMapper;
    private final TextChunker sentenceChunker;
    private final EmbeddingService embeddingService;

    @Override
    @Async("docTaskExecutor")
    public void process(Long documentId) {
        // 查文档
        Document doc = documentMapper.selectEntityById(documentId);
        if (doc == null) {
            log.warn("文档不存在：{}", documentId);
            return;
        }

        // 状态设置为解析中
        documentMapper.updateStatus(documentId, DocumentStatus.PARSING, null);
        log.info("[{}]开始处理", doc.getName());

        try {
            // 解析
            String text = extractorFactory.get(doc.getType()).extract(Paths.get(doc.getFilePath()));
            if (text == null || text.isBlank()) {
                throw new IllegalStateException("解析结果为空");
            }
            documentMapper.updateStatus(documentId, DocumentStatus.CHUNKING, null);

            // 查知识库的 chunk_size 和 overlap
            KnowledgeBase kb = knowledgeBaseMapper.selectConfigByIdAndUserId(doc.getKbId(), doc.getUserId());
            if (kb == null) {
                throw new IllegalStateException("知识库不存在或无权访问");
            }

            // 切分
            int chunkSize = kb.getChunkSize() == null ? 400 : kb.getChunkSize();
            int overlap = kb.getOverlap() == null ? 80 : kb.getOverlap();
            List<String> chunks = sentenceChunker.chunk(text, chunkSize, overlap);

            documentMapper.updateStatus(documentId, DocumentStatus.EMBEDDING, null);
            log.info("[{}] 开始向量化，共 {} 块", doc.getName(), chunks.size());

            List<Float[]> vectors = embeddingService.embed(chunks);

            // 组装成实体并批量入库
            List<DocChunk> docChunks = IntStream.range(0, chunks.size())
                    .mapToObj(i -> DocChunk.builder()
                            .documentId(documentId)
                            .kbId(doc.getKbId())
                            .seq(i)
                            .content(chunks.get(i))
                            .embedding(toJson(vectors.get(i)))
                            .build())
                    .collect(Collectors.toList());
            docChunkMapper.batchInsert(docChunks);

            // 回填块数，置成功
            documentMapper.updateChunkCount(documentId, docChunks.size());
            documentMapper.updateStatus(documentId, DocumentStatus.READY, null);
            log.info("[{}] 处理完成，共 {} 块", doc.getName(), docChunks.size());

        } catch (Exception e) {
            // 任何一步失败 → 记 FAILED + 错误信息
            // error_msg 列是 varchar(1000)，异常栈太长会截断报错，只保留简短摘要
            String msg = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            if (msg.length() > 900) {
                msg = msg.substring(0, 900);
            }
            log.error("[{}] 处理失败", doc.getName(), e);
            documentMapper.updateStatus(documentId, DocumentStatus.FAILED, msg);
        }
    }

        /**
             * 把 Float[] 向量序列化成 JSON 数组字符串，如 [0.123,-0.456,...]
             * 手动拼接，避免依赖 Jackson 版本差异
             */
            private String toJson(Float[] vector) {
                StringBuilder sb = new StringBuilder("[");
                for (int i = 0; i < vector.length; i++) {
                    if (i > 0) {
                        sb.append(',');
                    }
                    sb.append(vector[i]);
                }
                return sb.append(']').toString();
            }
        }
