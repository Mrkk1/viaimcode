import mysql from 'mysql2/promise';

// Check required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Database connection configuration (excluding database name)
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

// Database name
const DATABASE_NAME = process.env.DB_NAME;

// Global connection pool instance
let poolInstance: mysql.Pool | null = null;

// Create database and initialize tables
export async function initDatabase() {
  try {
    // Create connection pool without specifying database
    const pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();

    // Create database
    console.log('Creating database...');
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${DATABASE_NAME}`);
    console.log('Database created successfully');

    // Use the newly created database
    await connection.execute(`USE ${DATABASE_NAME}`);
    
    // Create user table
    console.log('Creating user table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('User table created successfully');

    // Create website table (add userID foreign key)
    console.log('Creating website table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS websites (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        htmlContent LONGTEXT NOT NULL,
        prompt TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        thumbnailUrl VARCHAR(255) DEFAULT NULL,
        isFeatured TINYINT(1) DEFAULT 0 COMMENT '是否发布到首页展示 (0=否, 1=是)',
        KEY idx_websites_userId (userId),
        KEY idx_websites_createdAt (createdAt),
        KEY idx_websites_thumbnailUrl (thumbnailUrl),
        KEY idx_websites_isFeatured (isFeatured),
        FOREIGN KEY (userId) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Website table created successfully');
    
    // Create project table
    console.log('Creating project table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        prompt TEXT,
        currentVersionId VARCHAR(36) DEFAULT NULL,
        model VARCHAR(100) DEFAULT NULL,
        provider VARCHAR(100) DEFAULT NULL,
        thumbnail VARCHAR(500),
        status ENUM('active','archived','deleted') DEFAULT 'active',
        isPublic TINYINT(1) DEFAULT 0,
        lastSaveTime TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_projects_userId (userId),
        FOREIGN KEY (userId) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Project table created successfully');
    
    // Create version table
    console.log('Creating version table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS versions (
        id VARCHAR(36) NOT NULL,
        projectId VARCHAR(36) NOT NULL,
        creatorId VARCHAR(36) NOT NULL,
        originalVersionId VARCHAR(36) DEFAULT NULL,
        code LONGTEXT NOT NULL,
        thumbnail VARCHAR(500),
        type ENUM('ai','manual') NOT NULL,
        title VARCHAR(255) DEFAULT NULL,
        description TEXT,
        size INT UNSIGNED DEFAULT NULL,
        isPublished TINYINT(1) DEFAULT 0,
        shareUrl VARCHAR(255) DEFAULT NULL,
        createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_versions_projectId (projectId),
        KEY idx_versions_creatorId (creatorId),
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (creatorId) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Version table created successfully');

    // Create PPT tasks table
    console.log('Creating PPT tasks table...');
    await connection.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('PPT tasks table created successfully');

    // Create PPT outlines table
    console.log('Creating PPT outlines table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ppt_outlines (
        id VARCHAR(36) PRIMARY KEY,
        taskId VARCHAR(36) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        content LONGTEXT NOT NULL COMMENT '大纲JSON内容',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_ppt_outlines_taskId (taskId),
        FOREIGN KEY (taskId) REFERENCES ppt_tasks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('PPT outlines table created successfully');

    // Create PPT slides table
    console.log('Creating PPT slides table...');
    await connection.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('PPT slides table created successfully');

    // Create PPT chat messages table
    console.log('Creating PPT chat messages table...');
    await connection.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('PPT chat messages table created successfully');
    
    connection.release();
    await pool.end();

    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Get database connection pool (used for database operations in the application)
export function getPool() {
  if (!poolInstance) {
    poolInstance = mysql.createPool({
      ...dbConfig,
      database: DATABASE_NAME,
      waitForConnections: true,
      connectionLimit: 20, // 增加连接池大小
      maxIdle: 5, // 减少空闲连接数
      idleTimeout: 30000, // 减少空闲超时时间
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
  }
  return poolInstance;
}

// Close connection pool
export async function closePool() {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

// 获取连接池状态（用于监控）
export function getPoolStatus() {
  if (!poolInstance) {
    return { status: 'not_initialized' };
  }
  
  return {
    status: 'active',
    // 注意：mysql2 的连接池没有直接暴露这些统计信息
    // 这里只是提供一个监控的接口
    connectionLimit: 20,
    activeConnections: 'unknown', // mysql2 不提供这个信息
    idleConnections: 'unknown'    // mysql2 不提供这个信息
  };
}

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    console.log('Shutting down database connection...');
    await closePool();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down database connection...');
    await closePool();
    process.exit(0);
  });
} 