import { pool } from './db-mysql';
import { mysqlStorage } from './storage-mysql';
import * as schema from '../shared/schema-mysql';
import { drizzle } from 'drizzle-orm/mysql2';
import dotenv from 'dotenv';
import { encryptPassword } from './utils/encryption';

dotenv.config();

// 运行数据库迁移
async function runMigrations() {
  console.log('开始执行MySQL数据库迁移...');
  const db = drizzle(pool, { mode: 'default' });

  try {
    // 创建表
    console.log('创建数据库表...');
    
    // 使用纯SQL来创建表，因为drizzle-orm的MySQL迁移工具有问题
    const createUserTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'manager',
        hotel VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const createOtaAccountsTable = `
      CREATE TABLE IF NOT EXISTS ota_accounts (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        short_name VARCHAR(50),
        url VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        verification_method VARCHAR(50) DEFAULT 'none',
        phone_number VARCHAR(50),
        session_data TEXT,
        screenshot_path TEXT,
        account_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT '未连接',
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const createActivitiesTable = `
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        platform_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        discount VARCHAR(50) NOT NULL,
        commission_rate VARCHAR(50) NOT NULL,
        room_types JSON,
        minimum_stay INT,
        max_booking_window INT,
        status VARCHAR(50) NOT NULL DEFAULT '未决定',
        tag VARCHAR(50),
        participation_status VARCHAR(50) DEFAULT '未参与',
        screenshot_path TEXT,
        ocr_data TEXT,
        vector_id VARCHAR(255),
        ocr_confidence FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const createStrategiesTable = `
      CREATE TABLE IF NOT EXISTS strategies (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        is_recommended BOOLEAN DEFAULT FALSE,
        advantages JSON,
        disadvantages JSON,
        steps JSON,
        notes JSON,
        metrics JSON NOT NULL,
        activity_ids JSON,
        applied_at TIMESTAMP,
        applied_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const createApiKeysTable = `
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        service VARCHAR(50) NOT NULL,
        encrypted_key TEXT NOT NULL,
        model VARCHAR(100),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const createSettingsTable = `
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        notifications_enabled BOOLEAN DEFAULT TRUE,
        auto_refresh_interval INT DEFAULT 30,
        default_strategy_preference VARCHAR(50) DEFAULT 'balanced',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const createStrategyParametersTable = `
      CREATE TABLE IF NOT EXISTS strategy_parameters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        param_key VARCHAR(100) NOT NULL UNIQUE,
        value FLOAT NOT NULL DEFAULT 5.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const createStrategyTemplatesTable = `
      CREATE TABLE IF NOT EXISTS strategy_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        strategy_id INT NOT NULL,
        added_by VARCHAR(255) NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // 执行创建表的SQL
    await pool.query(createUserTable);
    await pool.query(createOtaAccountsTable);
    await pool.query(createActivitiesTable);
    await pool.query(createStrategiesTable);
    await pool.query(createApiKeysTable);
    await pool.query(createSettingsTable);
    await pool.query(createStrategyParametersTable);
    await pool.query(createStrategyTemplatesTable);
    console.log('所有表创建成功！');
    
    // 创建用户数据
    console.log('创建初始用户...');
    const hashedPassword = await encryptPassword('admin123');
    
    try {
      // 直接使用SQL插入用户，避免ORM兼容性问题
      const insertUserSql = `
        INSERT INTO users (username, password, role, hotel)
        SELECT 'admin', ?, 'admin', 'Demo Hotel'
        WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')
      `;
      
      await pool.query(insertUserSql, [hashedPassword]);
      console.log('管理员用户创建成功');
    } catch (error: any) {
      console.error('插入用户时出错:', error);
    }
    
    // 初始化基础数据
    console.log('初始化基础数据...');
    await mysqlStorage.initializeData();
    console.log('基础数据初始化成功！');
    
    console.log('MySQL数据库迁移成功完成！');
  } catch (error) {
    console.error('MySQL数据库迁移失败:', error);
    process.exit(1);
  } finally {
    // 不要关闭连接池，因为可能会在其他地方使用
    process.exit(0);
  }
}

// 执行迁移
runMigrations();