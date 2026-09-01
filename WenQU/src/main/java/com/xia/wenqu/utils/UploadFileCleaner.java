package com.xia.wenqu.utils;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

/**
 * 上传文件清理：永久删除文档后清理磁盘文件，文件缺失或删除失败只告警不阻断
 */
@Component
@Slf4j
public class UploadFileCleaner {

    public void deleteQuietly(String filePath) {
        if (filePath == null || filePath.isBlank()) {
            return;
        }
        try {
            Files.deleteIfExists(Paths.get(filePath));
        } catch (IOException e) {
            log.warn("删除磁盘文件失败: {}", filePath, e);
        }
    }
}
