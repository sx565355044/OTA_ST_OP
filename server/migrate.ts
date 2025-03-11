import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from '../shared/schema';

// 获取数据库连接 URL（优先环境变量，其次使用默认值）
const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mydatabase';

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
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('数据库迁移成功完成！');
  } catch (error) {
    console.error('数据库迁移失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 执行迁移
runMigrations();