-- MySQL dump 10.13  Distrib 5.7.24, for osx11.1 (x86_64)
--
-- Host: 44.199.235.233    Database: localsite_ai
-- ------------------------------------------------------
-- Server version	8.2.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ppt_chat_messages`
--

DROP TABLE IF EXISTS `ppt_chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ppt_chat_messages` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `projectId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `messageType` enum('user','ai','system') COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `isGenerating` tinyint(1) DEFAULT '0',
  `relatedSlideId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联的幻灯片ID',
  `relatedVersionId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联的版本ID',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ppt_chat_messages_projectId` (`projectId`),
  KEY `idx_ppt_chat_messages_createdAt` (`createdAt`),
  KEY `idx_ppt_chat_messages_relatedSlideId` (`relatedSlideId`),
  KEY `idx_ppt_chat_messages_relatedVersionId` (`relatedVersionId`),
  KEY `idx_ppt_chat_messages_composite` (`projectId`,`createdAt` DESC),
  CONSTRAINT `ppt_chat_messages_ibfk_1` FOREIGN KEY (`projectId`) REFERENCES `ppt_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ppt_chat_messages_ibfk_2` FOREIGN KEY (`relatedSlideId`) REFERENCES `ppt_slides` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ppt_chat_messages_ibfk_3` FOREIGN KEY (`relatedVersionId`) REFERENCES `ppt_slide_versions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='PPT聊天消息表，存储用户与AI的对话记录';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`%`*/ /*!50003 TRIGGER `update_project_timestamp_on_message_add` AFTER INSERT ON `ppt_chat_messages` FOR EACH ROW BEGIN
  UPDATE ppt_projects SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.projectId;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `ppt_collaborators`
--

DROP TABLE IF EXISTS `ppt_collaborators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ppt_collaborators` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `projectId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('owner','editor','viewer') COLLATE utf8mb4_unicode_ci DEFAULT 'viewer',
  `invitedBy` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_project_user` (`projectId`,`userId`),
  KEY `idx_ppt_collaborators_projectId` (`projectId`),
  KEY `idx_ppt_collaborators_userId` (`userId`),
  KEY `idx_ppt_collaborators_role` (`role`),
  KEY `invitedBy` (`invitedBy`),
  CONSTRAINT `ppt_collaborators_ibfk_1` FOREIGN KEY (`projectId`) REFERENCES `ppt_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ppt_collaborators_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ppt_collaborators_ibfk_3` FOREIGN KEY (`invitedBy`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ppt_outlines`
--

DROP TABLE IF EXISTS `ppt_outlines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ppt_outlines` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `projectId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '大纲JSON内容',
  `version` int DEFAULT '1' COMMENT '大纲版本号',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `projectId` (`projectId`),
  KEY `idx_ppt_outlines_projectId` (`projectId`),
  CONSTRAINT `ppt_outlines_ibfk_1` FOREIGN KEY (`projectId`) REFERENCES `ppt_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='PPT大纲表，存储项目的大纲结构';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ppt_project_tags`
--

DROP TABLE IF EXISTS `ppt_project_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ppt_project_tags` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `projectId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tagName` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_project_tag` (`projectId`,`tagName`),
  KEY `idx_ppt_project_tags_projectId` (`projectId`),
  KEY `idx_ppt_project_tags_tagName` (`tagName`),
  CONSTRAINT `ppt_project_tags_ibfk_1` FOREIGN KEY (`projectId`) REFERENCES `ppt_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ppt_projects`
--

DROP TABLE IF EXISTS `ppt_projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ppt_projects` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prompt` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `model` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','generating_outline','generating_slides','completed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `progress` int DEFAULT '0' COMMENT '进度百分比 0-100',
  `totalSlides` int DEFAULT '0',
  `completedSlides` int DEFAULT '0',
  `errorMessage` text COLLATE utf8mb4_unicode_ci,
  `thumbnailUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '项目缩略图',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completedAt` timestamp NULL DEFAULT NULL,
  `isFeatured` tinyint(1) DEFAULT '0' COMMENT '是否发布到PPT广场',
  `isPublic` tinyint(1) DEFAULT '0' COMMENT '是否公开可见',
  `viewCount` int DEFAULT '0' COMMENT '查看次数',
  `likeCount` int DEFAULT '0' COMMENT '点赞次数',
  `deletedAt` datetime DEFAULT NULL COMMENT '软删除时间戳，NULL表示未删除',
  PRIMARY KEY (`id`),
  KEY `idx_ppt_projects_userId` (`userId`),
  KEY `idx_ppt_projects_status` (`status`),
  KEY `idx_ppt_projects_createdAt` (`createdAt`),
  KEY `idx_ppt_projects_isFeatured` (`isFeatured`),
  KEY `idx_ppt_projects_isPublic` (`isPublic`),
  KEY `idx_ppt_projects_deleted_at` (`deletedAt`),
  KEY `idx_ppt_projects_user_deleted` (`userId`,`deletedAt`),
  KEY `idx_ppt_projects_composite` (`userId`,`status`,`deletedAt`),
  CONSTRAINT `ppt_projects_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='PPT项目主表，存储项目基本信息和状态';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ppt_slide_versions`
--

DROP TABLE IF EXISTS `ppt_slide_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ppt_slide_versions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slideId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `projectId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slideIndex` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `htmlCode` longtext COLLATE utf8mb4_unicode_ci,
  `thinkingContent` longtext COLLATE utf8mb4_unicode_ci,
  `changeDescription` text COLLATE utf8mb4_unicode_ci COMMENT '修改说明',
  `versionNumber` int NOT NULL DEFAULT '1',
  `status` enum('pending','thinking','generating','completed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `progress` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '准备生成...',
  `thumbnailUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '版本缩略图',
  `createdBy` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '创建者ID',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_slide_version` (`slideId`,`versionNumber`),
  KEY `idx_ppt_slide_versions_slideId` (`slideId`),
  KEY `idx_ppt_slide_versions_projectId` (`projectId`),
  KEY `idx_ppt_slide_versions_slideIndex` (`slideIndex`),
  KEY `idx_ppt_slide_versions_versionNumber` (`versionNumber`),
  KEY `idx_ppt_slide_versions_createdBy` (`createdBy`),
  KEY `idx_ppt_slide_versions_createdAt` (`createdAt`),
  KEY `idx_versions_project_slide` (`projectId`,`slideIndex`,`versionNumber` DESC),
  KEY `idx_versions_slide_version` (`slideId`,`versionNumber` DESC),
  KEY `idx_ppt_slide_versions_composite` (`slideId`,`versionNumber` DESC),
  CONSTRAINT `ppt_slide_versions_ibfk_1` FOREIGN KEY (`slideId`) REFERENCES `ppt_slides` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ppt_slide_versions_ibfk_2` FOREIGN KEY (`projectId`) REFERENCES `ppt_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ppt_slide_versions_ibfk_3` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='PPT幻灯片版本表，存储每张幻灯片的历史版本';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`%`*/ /*!50003 TRIGGER `update_project_timestamp_on_version_add` AFTER INSERT ON `ppt_slide_versions` FOR EACH ROW BEGIN
  UPDATE ppt_projects SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.projectId;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `ppt_slides`
--

DROP TABLE IF EXISTS `ppt_slides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ppt_slides` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `projectId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slideIndex` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `htmlCode` longtext COLLATE utf8mb4_unicode_ci,
  `thinkingContent` longtext COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','thinking','generating','completed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `progress` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '准备生成...',
  `thumbnailUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '幻灯片缩略图',
  `currentVersionId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '当前版本ID',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_project_slide` (`projectId`,`slideIndex`),
  KEY `idx_ppt_slides_projectId` (`projectId`),
  KEY `idx_ppt_slides_slideIndex` (`slideIndex`),
  KEY `idx_ppt_slides_status` (`status`),
  KEY `idx_ppt_slides_currentVersionId` (`currentVersionId`),
  KEY `idx_slides_project_index` (`projectId`,`slideIndex`),
  KEY `idx_ppt_slides_composite` (`projectId`,`slideIndex`,`status`),
  CONSTRAINT `fk_ppt_slides_currentVersionId` FOREIGN KEY (`currentVersionId`) REFERENCES `ppt_slide_versions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ppt_slides_ibfk_1` FOREIGN KEY (`projectId`) REFERENCES `ppt_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='PPT幻灯片表，存储每张幻灯片的当前内容';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`%`*/ /*!50003 TRIGGER `update_project_timestamp_on_slide_change` AFTER UPDATE ON `ppt_slides` FOR EACH ROW BEGIN
  UPDATE ppt_projects SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.projectId;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `ppt_user_likes`
--

DROP TABLE IF EXISTS `ppt_user_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ppt_user_likes` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `projectId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_project_like` (`userId`,`projectId`),
  KEY `idx_ppt_user_likes_userId` (`userId`),
  KEY `idx_ppt_user_likes_projectId` (`projectId`),
  CONSTRAINT `ppt_user_likes_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ppt_user_likes_ibfk_2` FOREIGN KEY (`projectId`) REFERENCES `ppt_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='PPT用户点赞表，存储用户对项目的点赞记录';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `projects` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `prompt` text COLLATE utf8mb4_unicode_ci,
  `currentVersionId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thumbnail` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','archived','deleted') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `isPublic` tinyint(1) DEFAULT '0',
  `lastSaveTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_projects_userId` (`userId`),
  CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_users_username` (`username`),
  KEY `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `versions`
--

DROP TABLE IF EXISTS `versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `versions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `projectId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creatorId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `originalVersionId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `thumbnail` text COLLATE utf8mb4_unicode_ci,
  `type` enum('ai','manual') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `size` int unsigned DEFAULT NULL,
  `isPublished` tinyint(1) DEFAULT '0',
  `shareUrl` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_versions_projectId` (`projectId`),
  KEY `idx_versions_creatorId` (`creatorId`),
  CONSTRAINT `versions_ibfk_1` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `versions_ibfk_2` FOREIGN KEY (`creatorId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `websites`
--

DROP TABLE IF EXISTS `websites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `websites` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `htmlContent` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `prompt` text COLLATE utf8mb4_unicode_ci,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `thumbnailUrl` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isFeatured` tinyint(1) DEFAULT '0' COMMENT '是否发布到首页展示 (0=否, 1=是)',
  PRIMARY KEY (`id`),
  KEY `idx_websites_userId` (`userId`),
  KEY `idx_websites_createdAt` (`createdAt`),
  KEY `idx_websites_thumbnailUrl` (`thumbnailUrl`),
  KEY `idx_websites_isFeatured` (`isFeatured`),
  KEY `idx_created_at` (`createdAt`),
  KEY `idx_title` (`title`),
  KEY `idx_featured` (`isFeatured`),
  KEY `idx_user_created` (`userId`,`createdAt`),
  CONSTRAINT `websites_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'localsite_ai'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-22 14:31:19
