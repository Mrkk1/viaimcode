import mysql from 'mysql2/promise';

// 数据库连接配置（不包含数据库名）
const dbConfig = {
  host: '44.199.235.233',
  port: 3306,
  user: 'root',
  password: 'weilaizhineng'
};

// 数据库名称
const DATABASE_NAME = 'localsite_ai';

// 创建数据库并初始化表
export async function initDatabase() {
  try {
    // 创建没有指定数据库的连接池
    const pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();

    // 创建数据库
    console.log('创建数据库...');
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${DATABASE_NAME}`);
    console.log('数据库创建成功');

    // 使用新创建的数据库
    await connection.execute(`USE ${DATABASE_NAME}`);
    
    // 创建用户表
    console.log('创建用户表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('用户表创建成功');

    // 创建网站表（添加用户ID外键）
    console.log('创建网站表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS websites (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        htmlContent LONGTEXT NOT NULL,
        prompt TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);
    console.log('网站表创建成功');
    
    connection.release();
    await pool.end();

    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

// 获取数据库连接池（用于应用中的数据库操作）
export function getPool() {
  return mysql.createPool({
    ...dbConfig,
    database: DATABASE_NAME
  });
} 