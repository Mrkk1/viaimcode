-- PPT任务相关表结构

-- PPT任务表
CREATE TABLE IF NOT EXISTS ppt_tasks (
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
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completedAt TIMESTAMP NULL,
  isFeatured TINYINT(1) DEFAULT 0 COMMENT '是否发布到PPT广场',
  KEY idx_ppt_tasks_userId (userId),
  KEY idx_ppt_tasks_status (status),
  KEY idx_ppt_tasks_createdAt (createdAt),
  KEY idx_ppt_tasks_isFeatured (isFeatured),
  FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PPT大纲表
CREATE TABLE IF NOT EXISTS ppt_outlines (
  id VARCHAR(36) PRIMARY KEY,
  taskId VARCHAR(36) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL COMMENT '大纲JSON内容',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ppt_outlines_taskId (taskId),
  FOREIGN KEY (taskId) REFERENCES ppt_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PPT幻灯片表
CREATE TABLE IF NOT EXISTS ppt_slides (
  id VARCHAR(36) PRIMARY KEY,
  taskId VARCHAR(36) NOT NULL,
  slideIndex INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  htmlCode LONGTEXT NULL,
  thinkingContent LONGTEXT NULL,
  status ENUM('pending', 'thinking', 'generating', 'completed', 'failed') DEFAULT 'pending',
  progress VARCHAR(255) DEFAULT '准备生成...',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ppt_slides_taskId (taskId),
  KEY idx_ppt_slides_slideIndex (slideIndex),
  KEY idx_ppt_slides_status (status),
  FOREIGN KEY (taskId) REFERENCES ppt_tasks(id) ON DELETE CASCADE,
  UNIQUE KEY unique_task_slide (taskId, slideIndex)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PPT聊天记录表
CREATE TABLE IF NOT EXISTS ppt_chat_messages (
  id VARCHAR(36) PRIMARY KEY,
  taskId VARCHAR(36) NOT NULL,
  messageType ENUM('user', 'ai') NOT NULL,
  content LONGTEXT NOT NULL,
  isGenerating TINYINT(1) DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ppt_chat_messages_taskId (taskId),
  KEY idx_ppt_chat_messages_createdAt (createdAt),
  FOREIGN KEY (taskId) REFERENCES ppt_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 