import {
  User, InsertUser, OtaAccount, InsertOtaAccount, Activity, InsertActivity,
  Strategy, InsertStrategy, ApiKey, InsertApiKey, Setting, InsertSetting,
  StrategyParameter, InsertStrategyParameter, StrategyTemplate, InsertStrategyTemplate,
  users, otaAccounts, activities, strategies, apiKeys, settings, 
  strategyParameters, strategyTemplates
} from '../shared/schema';
import { db } from './db';
import { eq, and, not, isNull } from 'drizzle-orm';
import { IStorage } from './storage';
import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';
import pg from 'pg';

// 创建 PostgreSQL 连接池
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 创建会话存储
const PostgresSessionStore = connectPgSimple(session);

export class PostgresStorage implements IStorage {
  sessionStore: any; // Using any type to bypass TS issues temporarily

  constructor() {
    // 创建会话存储实例
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'session', // 默认会话表名
      createTableIfMissing: true // 自动创建会话表
    });
  }

  // 用户相关方法
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, user: Partial<User>): Promise<User> {
    const result = await db.update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // OTA 账户相关方法
  async getOtaAccount(id: number): Promise<OtaAccount | undefined> {
    const result = await db.select().from(otaAccounts).where(eq(otaAccounts.id, id));
    return result[0];
  }

  async getOtaAccountsByUserId(userId: number): Promise<OtaAccount[]> {
    const result = await db.select().from(otaAccounts).where(eq(otaAccounts.userId, userId));
    return result;
  }

  async createOtaAccount(account: InsertOtaAccount): Promise<OtaAccount> {
    const result = await db.insert(otaAccounts).values(account).returning();
    return result[0];
  }

  async updateOtaAccount(id: number, account: Partial<OtaAccount>): Promise<OtaAccount> {
    const result = await db.update(otaAccounts)
      .set(account)
      .where(eq(otaAccounts.id, id))
      .returning();
    return result[0];
  }

  async deleteOtaAccount(id: number): Promise<void> {
    await db.delete(otaAccounts).where(eq(otaAccounts.id, id));
  }

  // 活动相关方法
  async getActivity(id: number): Promise<Activity | undefined> {
    const result = await db.select().from(activities).where(eq(activities.id, id));
    return result[0];
  }

  async getActivitiesByUserId(userId: number): Promise<Activity[]> {
    const result = await db.select().from(activities).where(eq(activities.userId, userId));
    return result;
  }

  async getActivitiesByPlatform(platformId: number): Promise<Activity[]> {
    const result = await db.select().from(activities).where(eq(activities.platformId, platformId));
    return result;
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const result = await db.insert(activities).values(activity).returning();
    return result[0];
  }

  async updateActivity(id: number, activity: Partial<Activity>): Promise<Activity> {
    const result = await db.update(activities)
      .set(activity)
      .where(eq(activities.id, id))
      .returning();
    return result[0];
  }

  async deleteActivity(id: number): Promise<void> {
    await db.delete(activities).where(eq(activities.id, id));
  }

  // 策略相关方法
  async getStrategy(id: number): Promise<Strategy | undefined> {
    const result = await db.select().from(strategies).where(eq(strategies.id, id));
    return result[0];
  }

  async getStrategiesByUserId(userId: number): Promise<Strategy[]> {
    const result = await db.select().from(strategies).where(eq(strategies.userId, userId));
    return result;
  }

  async getAppliedStrategiesByUserId(userId: number): Promise<Strategy[]> {
    const result = await db.select().from(strategies)
      .where(and(
        eq(strategies.userId, userId),
        // Filter only strategies that have been applied (appliedAt is not null)
        not(isNull(strategies.appliedAt))
      ))
      .orderBy(strategies.appliedAt);
    return result;
  }

  async getRecentAppliedStrategies(limit: number): Promise<Strategy[]> {
    const result = await db.select().from(strategies)
      .where(not(isNull(strategies.appliedAt)))
      .orderBy(strategies.appliedAt)
      .limit(limit);
    return result;
  }

  async createStrategy(strategy: InsertStrategy): Promise<Strategy> {
    const result = await db.insert(strategies).values(strategy).returning();
    return result[0];
  }

  async updateStrategy(id: number, strategy: Partial<Strategy>): Promise<Strategy> {
    const result = await db.update(strategies)
      .set(strategy)
      .where(eq(strategies.id, id))
      .returning();
    return result[0];
  }

  // API 密钥相关方法
  async getApiKey(id: number): Promise<ApiKey | undefined> {
    const result = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return result[0];
  }

  async getApiKeyByUserIdAndService(userId: number, service: string): Promise<ApiKey | undefined> {
    const result = await db.select().from(apiKeys)
      .where(and(
        eq(apiKeys.userId, userId),
        eq(apiKeys.service, service)
      ));
    return result[0];
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const result = await db.insert(apiKeys).values(apiKey).returning();
    return result[0];
  }

  async updateApiKey(id: number, apiKey: Partial<ApiKey>): Promise<ApiKey> {
    const result = await db.update(apiKeys)
      .set(apiKey)
      .where(eq(apiKeys.id, id))
      .returning();
    return result[0];
  }

  async deleteApiKey(id: number): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  // 设置相关方法
  async getSettingsByUserId(userId: number): Promise<Setting | undefined> {
    const result = await db.select().from(settings).where(eq(settings.userId, userId));
    return result[0];
  }

  async createSettings(setting: InsertSetting): Promise<Setting> {
    const result = await db.insert(settings).values(setting).returning();
    return result[0];
  }

  async updateSettings(id: number, setting: Partial<Setting>): Promise<Setting> {
    const result = await db.update(settings)
      .set(setting)
      .where(eq(settings.id, id))
      .returning();
    return result[0];
  }

  // 策略参数相关方法
  async getStrategyParameter(id: number): Promise<StrategyParameter | undefined> {
    const result = await db.select().from(strategyParameters).where(eq(strategyParameters.id, id));
    return result[0];
  }

  async getStrategyParameters(): Promise<StrategyParameter[]> {
    const result = await db.select().from(strategyParameters);
    return result;
  }

  async createStrategyParameter(param: InsertStrategyParameter): Promise<StrategyParameter> {
    const result = await db.insert(strategyParameters).values(param).returning();
    return result[0];
  }

  async updateStrategyParameter(id: number, param: Partial<StrategyParameter>): Promise<StrategyParameter> {
    const result = await db.update(strategyParameters)
      .set(param)
      .where(eq(strategyParameters.id, id))
      .returning();
    return result[0];
  }

  // 策略模板相关方法
  async getStrategyTemplate(id: number): Promise<StrategyTemplate | undefined> {
    const result = await db.select().from(strategyTemplates).where(eq(strategyTemplates.id, id));
    return result[0];
  }

  async getStrategyTemplates(): Promise<StrategyTemplate[]> {
    const result = await db.select().from(strategyTemplates);
    return result;
  }

  async createStrategyTemplate(template: InsertStrategyTemplate): Promise<StrategyTemplate> {
    const result = await db.insert(strategyTemplates).values(template).returning();
    return result[0];
  }

  async deleteStrategyTemplate(id: number): Promise<void> {
    await db.delete(strategyTemplates).where(eq(strategyTemplates.id, id));
  }

  // 初始化数据方法
  async initializeData(): Promise<void> {
    // 检查现有用户
    const existingUsers = await db.select().from(users);
    if (existingUsers.length === 0) {
      // 创建默认用户
      await this.createUser({
        username: 'admin',
        password: '$2b$10$R5E0QRhPKBkSH8YcM/OMjeKJRlPUz3HJE6/kpOOFu4SvOlr3DC1HG', // admin
        role: 'admin',
        hotel: '星星酒店集团'
      });

      await this.createUser({
        username: '总经理',
        password: '$2b$10$R5E0QRhPKBkSH8YcM/OMjeKJRlPUz3HJE6/kpOOFu4SvOlr3DC1HG', // admin
        role: 'manager',
        hotel: '星星酒店北京分店'
      });

      await this.createUser({
        username: 'snorkeler',
        password: '$2b$10$R5E0QRhPKBkSH8YcM/OMjeKJRlPUz3HJE6/kpOOFu4SvOlr3DC1HG', // admin
        role: 'user',
        hotel: '星星酒店上海分店'
      });
    }

    // 检查现有 OTA 账户
    const existingAccounts = await db.select().from(otaAccounts);
    if (existingAccounts.length === 0) {
      // 创建默认 OTA 账户
      await this.createOtaAccount({
        name: '携程',
        shortName: 'Ctrip',
        url: 'https://hotels.ctrip.com',
        username: 'starhotel_admin',
        password: 'ctripP@ssw0rd',
        userId: 1,
        accountType: 'business',
        status: 'active'
      });

      await this.createOtaAccount({
        name: '美团',
        shortName: 'Meituan',
        url: 'https://hotel.meituan.com',
        username: 'starhotel_meituan',
        password: 'meituanP@ss123',
        userId: 1,
        accountType: 'standard',
        status: 'active'
      });

      await this.createOtaAccount({
        name: '飞猪',
        shortName: 'Fliggy',
        url: 'https://hotel.fliggy.com',
        username: 'starhotel_fliggy',
        password: 'fliggyP@ss456',
        userId: 1,
        accountType: 'premium',
        status: 'active'
      });
    }

    // 检查现有活动
    const existingActivities = await db.select().from(activities);
    if (existingActivities.length === 0) {
      // 创建默认活动
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextMonth = new Date(now);
      nextMonth.setDate(nextMonth.getDate() + 30);

      await this.createActivity({
        name: '暑期特惠',
        description: '暑期家庭出游特别折扣',
        platformId: 1,
        startDate: now,
        endDate: nextMonth,
        discount: '8.5折',
        commissionRate: '8%',
        roomTypes: ['标准双人间', '豪华家庭房'],
        minimumStay: 2,
        maxBookingWindow: 90,
        status: 'active',
        tag: '热门'
      });

      await this.createActivity({
        name: '周末闪购',
        description: '限时48小时特惠房价',
        platformId: 2,
        startDate: tomorrow,
        endDate: nextWeek,
        discount: '75折',
        commissionRate: '10%',
        roomTypes: ['商务单人间', '豪华双人间'],
        minimumStay: 1,
        maxBookingWindow: 30,
        status: 'upcoming',
        tag: '限时'
      });

      await this.createActivity({
        name: '预付立减',
        description: '提前预付享受额外折扣',
        platformId: 3,
        startDate: now,
        endDate: nextMonth,
        discount: '8.8折',
        commissionRate: '7.5%',
        roomTypes: ['所有房型'],
        minimumStay: 1,
        maxBookingWindow: 180,
        status: 'active',
        tag: '推荐'
      });
    }

    // 检查现有策略参数
    const existingParams = await db.select().from(strategyParameters);
    if (existingParams.length === 0) {
      // 创建默认策略参数
      await this.createStrategyParameter({
        name: '关注远期预定',
        description: '重视提前预订和长期收益',
        paramKey: 'future_booking_weight',
        value: 7
      });

      await this.createStrategyParameter({
        name: '关注成本最小',
        description: '优化佣金成本和运营支出',
        paramKey: 'cost_optimization_weight',
        value: 6
      });

      await this.createStrategyParameter({
        name: '关注展示最优',
        description: '最大化在平台上的展示和排名',
        paramKey: 'visibility_optimization_weight',
        value: 8
      });

      await this.createStrategyParameter({
        name: '关注当日OCC',
        description: '优先考虑提高当前入住率',
        paramKey: 'daily_occupancy_weight',
        value: 5
      });

      await this.createStrategyParameter({
        name: '平衡长短期收益',
        description: '在长期战略和短期收益之间取得平衡',
        paramKey: 'long_short_balance_weight',
        value: 6
      });
    }

    // 检查现有用户设置
    const existingSettings = await db.select().from(settings);
    if (existingSettings.length === 0) {
      // 创建默认设置
      await this.createSettings({
        userId: 1,
        notificationsEnabled: true,
        autoRefreshInterval: 15,
        defaultStrategyPreference: 'balanced'
      });
    }

    // 检查现有 API 密钥
    const existingApiKeys = await db.select().from(apiKeys);
    if (existingApiKeys.length === 0) {
      // 创建示例 API 密钥
      await this.createApiKey({
        userId: 1,
        service: 'deepseek',
        encryptedKey: '7f4e8d2a1b5c6f3e9d7a8b4c2e1d5f6a',
        model: 'deepseek-chat-v1'
      });
    }
  }
}

// 导出 PostgreSQL 存储实例
export const postgresStorage = new PostgresStorage();