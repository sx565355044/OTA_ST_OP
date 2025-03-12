import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

// 创建 MySQL 连接池
export const pool = mysql.createPool({
  // MySQL连接字符串格式不同于PostgreSQL，需要解析
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'otainsight',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  // 添加连接池配置
  connectionLimit: 10,
  queueLimit: 0,
});

// 初始化 Drizzle ORM
export const db = drizzle(pool, { mode: 'default' });