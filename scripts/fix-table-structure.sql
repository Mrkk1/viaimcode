-- 修复PPT表结构不一致的问题
-- 将 ppt_tasks 重命名为 ppt_projects，将 taskId 字段重命名为 projectId

-- 1. 检查表是否存在，如果存在 ppt_tasks 表，则重命名为 ppt_projects
-- 注意：如果 ppt_projects 表已经存在，这个操作可能会失败
-- 请根据实际情况选择合适的迁移策略

-- 方案A：如果 ppt_tasks 表存在但 ppt_projects 不存在
-- RENAME TABLE ppt_tasks TO ppt_projects;

-- 方案B：如果两个表都存在，需要合并数据
-- 这里我们假设使用 ppt_projects 作为主表

-- 2. 确保 ppt_projects 表结构正确（如果不存在则创建）
CREATE TABLE IF NOT EXISTS ppt_projects (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  prompt TEXT NOT NULL,
  model VARCHAR(100) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  status ENUM('pending', 'generating_outline', 'generating_slides', 'completed', 'failed') DEFAULT 'pending',
  progress INT DEFAULT 0 COMMENT '进度百分比 0-100',
  totalSlides INT DEFAULT 0,
  completedSlides INT DEFAULT 0,
  errorMessage TEXT NULL,
  thumbnailUrl VARCHAR(500) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completedAt TIMESTAMP NULL,
  deletedAt TIMESTAMP NULL,
  isFeatured TINYINT(1) DEFAULT 0 COMMENT '是否发布到PPT广场',
  isPublic TINYINT(1) DEFAULT 0 COMMENT '是否公开',
  viewCount INT DEFAULT 0 COMMENT '查看次数',
  likeCount INT DEFAULT 0 COMMENT '点赞次数',
  KEY idx_ppt_projects_userId (userId),
  KEY idx_ppt_projects_status (status),
  KEY idx_ppt_projects_createdAt (createdAt),
  KEY idx_ppt_projects_isFeatured (isFeatured),
  KEY idx_ppt_projects_deleted_at (deletedAt),
  KEY idx_ppt_projects_user_deleted (userId, deletedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 创建或修复 ppt_outlines 表，使用 projectId 字段
CREATE TABLE IF NOT EXISTS ppt_outlines (
  id VARCHAR(36) PRIMARY KEY,
  projectId VARCHAR(36) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL COMMENT '大纲JSON内容',
  version INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ppt_outlines_projectId (projectId),
  FOREIGN KEY (projectId) REFERENCES ppt_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 创建或修复 ppt_slides 表，使用 projectId 字段
CREATE TABLE IF NOT EXISTS ppt_slides (
  id VARCHAR(36) PRIMARY KEY,
  projectId VARCHAR(36) NOT NULL,
  slideIndex INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  htmlCode LONGTEXT NULL,
  thinkingContent LONGTEXT NULL,
  status ENUM('pending', 'thinking', 'generating', 'completed', 'failed') DEFAULT 'pending',
  progress VARCHAR(255) DEFAULT '准备生成...',
  thumbnailUrl VARCHAR(500) NULL,
  currentVersionId VARCHAR(36) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ppt_slides_projectId (projectId),
  KEY idx_ppt_slides_slideIndex (slideIndex),
  KEY idx_ppt_slides_status (status),
  FOREIGN KEY (projectId) REFERENCES ppt_projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_slide (projectId, slideIndex)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 创建或修复 ppt_chat_messages 表，使用 projectId 字段
CREATE TABLE IF NOT EXISTS ppt_chat_messages (
  id VARCHAR(36) PRIMARY KEY,
  projectId VARCHAR(36) NOT NULL,
  messageType ENUM('user', 'ai', 'system') NOT NULL,
  content LONGTEXT NOT NULL,
  isGenerating TINYINT(1) DEFAULT 0,
  relatedSlideId VARCHAR(36) NULL,
  relatedVersionId VARCHAR(36) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ppt_chat_messages_projectId (projectId),
  KEY idx_ppt_chat_messages_createdAt (createdAt),
  FOREIGN KEY (projectId) REFERENCES ppt_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 创建 ppt_slide_versions 表
CREATE TABLE IF NOT EXISTS ppt_slide_versions (
  id VARCHAR(36) PRIMARY KEY,
  slideId VARCHAR(36) NOT NULL,
  projectId VARCHAR(36) NOT NULL,
  slideIndex INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  htmlCode LONGTEXT NULL,
  thinkingContent LONGTEXT NULL,
  changeDescription TEXT NULL,
  versionNumber INT NOT NULL,
  status ENUM('pending', 'thinking', 'generating', 'completed', 'failed') DEFAULT 'pending',
  progress VARCHAR(255) DEFAULT '准备生成...',
  thumbnailUrl VARCHAR(500) NULL,
  createdBy VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ppt_slide_versions_slideId (slideId),
  KEY idx_ppt_slide_versions_projectId (projectId),
  KEY idx_ppt_slide_versions_createdAt (createdAt),
  FOREIGN KEY (slideId) REFERENCES ppt_slides(id) ON DELETE CASCADE,
  FOREIGN KEY (projectId) REFERENCES ppt_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 创建 ppt_user_likes 表
CREATE TABLE IF NOT EXISTS ppt_user_likes (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  projectId VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ppt_user_likes_userId (userId),
  KEY idx_ppt_user_likes_projectId (projectId),
  FOREIGN KEY (projectId) REFERENCES ppt_projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_project_like (userId, projectId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 如果存在旧的表结构，需要手动迁移数据
-- 以下是迁移数据的示例SQL（请根据实际情况调整）

-- 迁移 ppt_tasks 到 ppt_projects（如果需要）
-- INSERT INTO ppt_projects (id, userId, title, prompt, model, provider, status, progress, totalSlides, completedSlides, errorMessage, createdAt, updatedAt, completedAt, isFeatured)
-- SELECT id, userId, title, prompt, model, provider, status, progress, totalSlides, completedSlides, errorMessage, createdAt, updatedAt, completedAt, isFeatured
-- FROM ppt_tasks WHERE NOT EXISTS (SELECT 1 FROM ppt_projects WHERE ppt_projects.id = ppt_tasks.id);

-- 迁移 ppt_outlines 的 taskId 到 projectId（如果需要）
-- UPDATE ppt_outlines SET projectId = taskId WHERE projectId IS NULL;

-- 迁移 ppt_slides 的 taskId 到 projectId（如果需要）
-- UPDATE ppt_slides SET projectId = taskId WHERE projectId IS NULL;

-- 迁移 ppt_chat_messages 的 taskId 到 projectId（如果需要）
-- UPDATE ppt_chat_messages SET projectId = taskId WHERE projectId IS NULL;

-- 显示表结构验证
SHOW TABLES LIKE 'ppt_%';
DESCRIBE ppt_projects;
DESCRIBE ppt_chat_messages; 