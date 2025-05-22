-- 创建数据库
CREATE DATABASE IF NOT EXISTS localsite_ai;

-- 使用数据库
USE localsite_ai;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建网站表
CREATE TABLE IF NOT EXISTS websites (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  htmlContent LONGTEXT NOT NULL,
  prompt TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 添加索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_websites_userId ON websites(userId);
CREATE INDEX idx_websites_createdAt ON websites(createdAt); 