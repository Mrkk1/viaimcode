const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('开始迁移 thumbnail 字段...');
    
    // 修改 projects 表的 thumbnail 字段
    console.log('修改 projects 表...');
    await connection.execute(`
      ALTER TABLE projects 
      MODIFY COLUMN thumbnail VARCHAR(500)
    `);
    console.log('projects 表修改成功');
    
    // 修改 versions 表的 thumbnail 字段
    console.log('修改 versions 表...');
    await connection.execute(`
      ALTER TABLE versions 
      MODIFY COLUMN thumbnail VARCHAR(500)
    `);
    console.log('versions 表修改成功');
    
    console.log('迁移完成！');
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate(); 