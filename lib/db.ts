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
      connectionLimit: 10,
      maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
      idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
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