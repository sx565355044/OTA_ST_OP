import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';

dotenv.config();
const { Pool } = pg;

// 密码加密
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function initializeData() {
  // 创建数据库连接
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('开始初始化基础数据...');
    
    // 检查用户表是否存在数据
    const userCheck = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count) === 0) {
      console.log('初始化用户数据...');
      // 创建默认用户
      const adminPassword = await hashPassword('admin');
      await pool.query(
        'INSERT INTO users (username, password, role, hotel) VALUES ($1, $2, $3, $4)',
        ['admin', adminPassword, 'admin', '星星酒店集团']
      );
      
      await pool.query(
        'INSERT INTO users (username, password, role, hotel) VALUES ($1, $2, $3, $4)',
        ['总经理', adminPassword, 'manager', '星星酒店北京分店']
      );
      
      await pool.query(
        'INSERT INTO users (username, password, role, hotel) VALUES ($1, $2, $3, $4)',
        ['snorkeler', adminPassword, 'user', '星星酒店上海分店']
      );
      
      console.log('用户数据初始化完成');
    } else {
      console.log('用户数据已存在，跳过初始化');
    }
    
    // 检查OTA账户表是否存在数据
    const accountCheck = await pool.query('SELECT COUNT(*) FROM ota_accounts');
    if (parseInt(accountCheck.rows[0].count) === 0) {
      console.log('初始化OTA账户数据...');
      // 创建默认OTA账户
      await pool.query(
        'INSERT INTO ota_accounts (name, short_name, url, username, password, user_id, account_type, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        ['携程', 'Ctrip', 'https://hotels.ctrip.com', 'starhotel_admin', 'ctripP@ssw0rd', 1, 'business', 'active']
      );
      
      await pool.query(
        'INSERT INTO ota_accounts (name, short_name, url, username, password, user_id, account_type, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        ['美团', 'Meituan', 'https://hotel.meituan.com', 'starhotel_meituan', 'meituanP@ss123', 1, 'standard', 'active']
      );
      
      await pool.query(
        'INSERT INTO ota_accounts (name, short_name, url, username, password, user_id, account_type, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        ['飞猪', 'Fliggy', 'https://hotel.fliggy.com', 'starhotel_fliggy', 'fliggyP@ss456', 1, 'premium', 'active']
      );
      
      console.log('OTA账户数据初始化完成');
    } else {
      console.log('OTA账户数据已存在，跳过初始化');
    }

    // 检查促销活动表是否存在数据
    const activityCheck = await pool.query('SELECT COUNT(*) FROM activities');
    if (parseInt(activityCheck.rows[0].count) === 0) {
      console.log('初始化促销活动数据...');
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextMonth = new Date(now);
      nextMonth.setDate(nextMonth.getDate() + 30);
      
      // 创建默认促销活动
      await pool.query(
        'INSERT INTO activities (name, description, platform_id, start_date, end_date, discount, commission_rate, room_types, minimum_stay, max_booking_window, status, tag) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
        ['暑期特惠', '暑期家庭出游特别折扣', 1, now, nextMonth, '8.5折', '8%', ['标准双人间', '豪华家庭房'], 2, 90, 'active', '热门']
      );
      
      await pool.query(
        'INSERT INTO activities (name, description, platform_id, start_date, end_date, discount, commission_rate, room_types, minimum_stay, max_booking_window, status, tag) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
        ['周末闪购', '限时48小时特惠房价', 2, tomorrow, nextWeek, '75折', '10%', ['商务单人间', '豪华双人间'], 1, 30, 'upcoming', '限时']
      );
      
      await pool.query(
        'INSERT INTO activities (name, description, platform_id, start_date, end_date, discount, commission_rate, room_types, minimum_stay, max_booking_window, status, tag) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
        ['预付立减', '提前预付享受额外折扣', 3, now, nextMonth, '8.8折', '7.5%', ['所有房型'], 1, 180, 'active', '推荐']
      );
      
      console.log('促销活动数据初始化完成');
    } else {
      console.log('促销活动数据已存在，跳过初始化');
    }
    
    // 检查策略参数表是否存在数据
    const paramCheck = await pool.query('SELECT COUNT(*) FROM strategy_parameters');
    if (parseInt(paramCheck.rows[0].count) === 0) {
      console.log('初始化策略参数数据...');
      // 创建默认策略参数
      await pool.query(
        'INSERT INTO strategy_parameters (name, description, param_key, value) VALUES ($1, $2, $3, $4)',
        ['关注远期预定', '重视提前预订和长期收益', 'future_booking_weight', 7]
      );
      
      await pool.query(
        'INSERT INTO strategy_parameters (name, description, param_key, value) VALUES ($1, $2, $3, $4)',
        ['关注成本最小', '优化佣金成本和运营支出', 'cost_optimization_weight', 6]
      );
      
      await pool.query(
        'INSERT INTO strategy_parameters (name, description, param_key, value) VALUES ($1, $2, $3, $4)',
        ['关注展示最优', '最大化在平台上的展示和排名', 'visibility_optimization_weight', 8]
      );
      
      await pool.query(
        'INSERT INTO strategy_parameters (name, description, param_key, value) VALUES ($1, $2, $3, $4)',
        ['关注当日OCC', '优先考虑提高当前入住率', 'daily_occupancy_weight', 5]
      );
      
      await pool.query(
        'INSERT INTO strategy_parameters (name, description, param_key, value) VALUES ($1, $2, $3, $4)',
        ['平衡长短期收益', '在长期战略和短期收益之间取得平衡', 'long_short_balance_weight', 6]
      );
      
      console.log('策略参数数据初始化完成');
    } else {
      console.log('策略参数数据已存在，跳过初始化');
    }
    
    // 检查用户设置表是否存在数据
    const settingsCheck = await pool.query('SELECT COUNT(*) FROM settings');
    if (parseInt(settingsCheck.rows[0].count) === 0) {
      console.log('初始化用户设置数据...');
      // 创建默认用户设置
      await pool.query(
        'INSERT INTO settings (user_id, notifications_enabled, auto_refresh_interval, default_strategy_preference) VALUES ($1, $2, $3, $4)',
        [1, true, 15, 'balanced']
      );
      
      console.log('用户设置数据初始化完成');
    } else {
      console.log('用户设置数据已存在，跳过初始化');
    }
    
    // 检查API密钥表是否存在数据
    const apiKeyCheck = await pool.query('SELECT COUNT(*) FROM api_keys');
    if (parseInt(apiKeyCheck.rows[0].count) === 0) {
      console.log('初始化API密钥数据...');
      // 创建示例API密钥
      await pool.query(
        'INSERT INTO api_keys (user_id, service, encrypted_key, model) VALUES ($1, $2, $3, $4)',
        [1, 'deepseek', '7f4e8d2a1b5c6f3e9d7a8b4c2e1d5f6a', 'deepseek-chat-v1']
      );
      
      console.log('API密钥数据初始化完成');
    } else {
      console.log('API密钥数据已存在，跳过初始化');
    }
    
    console.log('所有基础数据初始化完成！');
    
  } catch (error) {
    console.error('初始化数据失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 执行初始化
initializeData();