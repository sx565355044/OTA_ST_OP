import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from '../shared/schema';
import { postgresStorage } from './storage-pg';
import dotenv from 'dotenv';

dotenv.config();

// 获取数据库连接 URL
const dbUrl = process.env.DATABASE_URL;

// 创建 PostgreSQL 连接池
const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 运行数据库迁移
async function runMigrations() {
  console.log('开始执行数据库迁移...');
  const db = drizzle(pool, { schema });

  try {
    // 执行迁移
    console.log('创建数据库表...');
    await db.insert(schema.users).values({
      username: 'test',
      password: 'test',
      role: 'user',
      hotel: 'Test Hotel',
    }).onConflictDoNothing().execute();
    console.log('数据库表创建成功！');
    
    // 初始化基础数据
    console.log('初始化基础数据...');
    await postgresStorage.initializeData();
    console.log('基础数据初始化成功！');
    
    console.log('数据库迁移成功完成！');
  } catch (error) {
    console.error('数据库迁移失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 如果直接运行此脚本，则执行迁移
if (require.main === module) {
  runMigrations().catch(err => {
    console.error('迁移失败:', err);
    process.exit(1);
  });
}

export { runMigrations };