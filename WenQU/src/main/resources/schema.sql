-- ============================================================
-- WenQu 数据库建表脚本
-- 时间: 2026-08-27
-- 修复: vector(1024) → JSON, utf8mb4_unicode_ci → utf8mb4_general_ci
-- ============================================================

CREATE DATABASE IF NOT EXISTS `wenqu` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `wenqu`;

-- -----------------------------------------------------------
-- 1. 用户表
-- -----------------------------------------------------------
CREATE TABLE `user` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
    `username` varchar(50) NOT NULL COMMENT '用户名',
    `password` varchar(100) NOT NULL COMMENT '密码（BCrypt哈希）',
    `nickname` varchar(50) DEFAULT NULL COMMENT '昵称',
    `role` varchar(20) NOT NULL DEFAULT 'USER' COMMENT '角色',
    `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：1正常 0禁用',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除：0否 1是',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户表';

-- -----------------------------------------------------------
-- 2. 知识库表
-- -----------------------------------------------------------
CREATE TABLE `knowledge_base` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `user_id` bigint unsigned NOT NULL COMMENT '所属用户(数据隔离)',
    `name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL COMMENT '知识库名称',
    `description` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
    `chunk_size` int NOT NULL DEFAULT '400' COMMENT '分块大小 200~800',
    `overlap` int NOT NULL DEFAULT '80' COMMENT '分块重叠 10~200',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted` tinyint NOT NULL DEFAULT '0',
    PRIMARY KEY (`id`),
    KEY `idx_user` (`user_id`,`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='知识库';

-- -----------------------------------------------------------
-- 3. 文档表
-- -----------------------------------------------------------
CREATE TABLE `document` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `kb_id` bigint unsigned NOT NULL,
    `user_id` bigint unsigned NOT NULL COMMENT '冗余, 隔离校验免 join',
    `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL COMMENT '原始文件名',
    `type` varchar(10) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'txt/md/docx',
    `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'UPLOADED',
    `file_path` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '存储相对路径(防路径穿越)',
    `size` bigint unsigned NOT NULL DEFAULT '0',
    `chunk_count` int unsigned NOT NULL DEFAULT '0',
    `error_msg` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted` tinyint NOT NULL DEFAULT '0',
    PRIMARY KEY (`id`),
    KEY `idx_kb` (`kb_id`,`deleted`),
    KEY `idx_user` (`user_id`,`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='知识库文档';

-- -----------------------------------------------------------
-- 4. 文档分块表 (vector → JSON)
-- -----------------------------------------------------------
CREATE TABLE `doc_chunk` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `document_id` bigint unsigned NOT NULL,
    `kb_id` bigint unsigned NOT NULL COMMENT '冗余: 检索只搜本知识库',
    `seq` int NOT NULL COMMENT '文档内分块序号',
    `content` text COLLATE utf8mb4_general_ci NOT NULL COMMENT '分块文本',
    `section_path` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '章节路径, 引用展示用',
    `embedding` json DEFAULT NULL COMMENT '向量 embedding, JSON 数组存储',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_document` (`document_id`),
    KEY `idx_kb` (`kb_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='分块+向量';

-- -----------------------------------------------------------
-- 5. 会话表
-- -----------------------------------------------------------
CREATE TABLE `conversation` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `user_id` bigint unsigned NOT NULL,
    `kb_id` bigint unsigned NOT NULL,
    `title` varchar(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '新对话',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '列表按最近活跃排序',
    `deleted` tinyint NOT NULL DEFAULT '0',
    PRIMARY KEY (`id`),
    KEY `idx_user` (`user_id`,`updated_at` DESC,`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='会话';

-- -----------------------------------------------------------
-- 6. 会话消息表
-- -----------------------------------------------------------
CREATE TABLE `message` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `conversation_id` bigint unsigned NOT NULL,
    `role` varchar(10) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'user/assistant',
    `content` text COLLATE utf8mb4_general_ci NOT NULL,
    `sources` json DEFAULT NULL COMMENT 'SourceVO 快照数组',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_conversation` (`conversation_id`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='会话消息';
