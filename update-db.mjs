// 更新数据库结构的单次运行脚本
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// 获取数据库连接 URL
const dbUrl = process.env.DATABASE_URL;

// 创建 PostgreSQL 连接池
const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateDatabase() {
  console.log('开始更新数据库结构...');
  
  try {
    const client = await pool.connect();
    try {
      // 检查screenshot_path列是否已存在
      const checkRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='ota_accounts' 
        AND column_name='screenshot_path'
      `);
      
      if (checkRes.rows.length === 0) {
        // 添加screenshot_path列
        console.log('添加screenshot_path列到ota_accounts表...');
        await client.query(`
          ALTER TABLE ota_accounts 
          ADD COLUMN screenshot_path TEXT
        `);
        console.log('已成功添加screenshot_path列！');
      } else {
        console.log('screenshot_path列已存在，无需更新');
      }
    } finally {
      client.release();
    }
    
    console.log('数据库更新成功完成！');
  } catch (error) {
    console.error('数据库更新失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 执行更新
updateDatabase().catch(err => {
  console.error('更新失败:', err);
  process.exit(1);
});