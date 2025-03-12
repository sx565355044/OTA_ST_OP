import {
  User, InsertUser, OtaAccount, InsertOtaAccount, Activity, InsertActivity,
  Strategy, InsertStrategy, ApiKey, InsertApiKey, Setting, InsertSetting,
  StrategyParameter, InsertStrategyParameter, StrategyTemplate, InsertStrategyTemplate,
  users, otaAccounts, activities, strategies, apiKeys, settings, 
  strategyParameters, strategyTemplates
} from '../shared/schema-mysql';
import { db, pool } from './db-mysql';
import { eq, and, isNull, not } from 'drizzle-orm';
import { IStorage } from './storage';
import MySQLStore from 'express-mysql-session';
import session from 'express-session';

// 声明express-mysql-session模块
declare module 'express-mysql-session' { 
  export default function(session: any): any;
}

// 创建MySQL会话存储
const MySQLSessionStore = MySQLStore(session);

export class MySQLStorage implements IStorage {
  sessionStore: any; // Using any type to bypass TS issues temporarily

  constructor() {
    // 创建会话存储实例
    this.sessionStore = new MySQLSessionStore({
      // 直接使用MySQL连接池配置
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'otainsight',
      // 其他配置
      connectionLimit: 10,
      expiration: 86400000, // 会话过期时间（毫秒）
      createDatabaseTable: true, // 自动创建会话表
      schema: {
        tableName: 'sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data'
        }
      }
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
    // MySQL不支持returning，使用插入后再查询的方法
    const result = await db.insert(users).values(user);
    const insertId = Number(result.insertId);
    const newUser = await this.getUser(insertId);
    
    if (!newUser) {
      throw new Error('Failed to create user');
    }
    
    return newUser;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User> {
    await db.update(users)
      .set(user)
      .where(eq(users.id, id));
    
    // MySQL不支持returning语句，需要再次查询获取更新后的数据
    const updated = await this.getUser(id);
    if (!updated) {
      throw new Error(`User with ID ${id} not found after update`);
    }
    return updated;
  }

  // OTA 账户相关方法
  async getOtaAccount(id: number): Promise<OtaAccount | undefined> {
    const result = await db.select().from(otaAccounts).where(eq(otaAccounts.id, id));
    return result[0];
  }

  async getOtaAccountsByUserId(userId: number): Promise<OtaAccount[]> {
    return db.select().from(otaAccounts).where(eq(otaAccounts.userId, userId));
  }

  async createOtaAccount(account: InsertOtaAccount): Promise<OtaAccount> {
    const result = await db.insert(otaAccounts).values(account);
    const insertId = Number(result.insertId);
    const newAccount = await this.getOtaAccount(insertId);
    
    if (!newAccount) {
      throw new Error('Failed to create OTA account');
    }
    
    return newAccount;
  }

  async updateOtaAccount(id: number, account: Partial<OtaAccount>): Promise<OtaAccount> {
    await db.update(otaAccounts)
      .set(account)
      .where(eq(otaAccounts.id, id));
    
    const updated = await this.getOtaAccount(id);
    if (!updated) {
      throw new Error(`OTA Account with ID ${id} not found after update`);
    }
    return updated;
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
    return db.select().from(activities).where(eq(activities.userId, userId));
  }

  async getActivitiesByPlatform(platformId: number): Promise<Activity[]> {
    return db.select().from(activities).where(eq(activities.platformId, platformId));
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const result = await db.insert(activities).values(activity);
    const insertId = Number(result.insertId);
    const newActivity = await this.getActivity(insertId);
    
    if (!newActivity) {
      throw new Error('Failed to create activity');
    }
    
    return newActivity;
  }

  async updateActivity(id: number, activity: Partial<Activity>): Promise<Activity> {
    await db.update(activities)
      .set(activity)
      .where(eq(activities.id, id));
    
    const updated = await this.getActivity(id);
    if (!updated) {
      throw new Error(`Activity with ID ${id} not found after update`);
    }
    return updated;
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
    return db.select().from(strategies).where(eq(strategies.userId, userId));
  }

  async getAppliedStrategiesByUserId(userId: number): Promise<Strategy[]> {
    return db.select().from(strategies)
      .where(and(
        eq(strategies.userId, userId),
        not(isNull(strategies.appliedAt))
      ));
  }

  async getRecentAppliedStrategies(limit: number): Promise<Strategy[]> {
    return db.select().from(strategies)
      .where(not(isNull(strategies.appliedAt)))
      .orderBy(strategies.appliedAt)
      .limit(limit);
  }

  async createStrategy(strategy: InsertStrategy): Promise<Strategy> {
    const result = await db.insert(strategies).values(strategy);
    const insertId = Number(result.insertId);
    const newStrategy = await this.getStrategy(insertId);
    
    if (!newStrategy) {
      throw new Error('Failed to create strategy');
    }
    
    return newStrategy;
  }

  async updateStrategy(id: number, strategy: Partial<Strategy>): Promise<Strategy> {
    await db.update(strategies)
      .set(strategy)
      .where(eq(strategies.id, id));
    
    const updated = await this.getStrategy(id);
    if (!updated) {
      throw new Error(`Strategy with ID ${id} not found after update`);
    }
    return updated;
  }

  // API Key 相关方法
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
    const result = await db.insert(apiKeys).values(apiKey);
    const insertId = Number(result.insertId);
    const newApiKey = await this.getApiKey(insertId);
    
    if (!newApiKey) {
      throw new Error('Failed to create API key');
    }
    
    return newApiKey;
  }

  async updateApiKey(id: number, apiKey: Partial<ApiKey>): Promise<ApiKey> {
    await db.update(apiKeys)
      .set(apiKey)
      .where(eq(apiKeys.id, id));
    
    const updated = await this.getApiKey(id);
    if (!updated) {
      throw new Error(`API Key with ID ${id} not found after update`);
    }
    return updated;
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
    const result = await db.insert(settings).values(setting);
    const insertId = Number(result.insertId);
    const newSettings = await db.select().from(settings).where(eq(settings.id, insertId));
    
    if (!newSettings || newSettings.length === 0) {
      throw new Error('Failed to create settings');
    }
    
    return newSettings[0];
  }

  async updateSettings(id: number, setting: Partial<Setting>): Promise<Setting> {
    await db.update(settings)
      .set(setting)
      .where(eq(settings.id, id));
    
    const result = await db.select().from(settings).where(eq(settings.id, id));
    return result[0];
  }

  // Strategy Parameter 相关方法
  async getStrategyParameter(id: number): Promise<StrategyParameter | undefined> {
    const result = await db.select().from(strategyParameters).where(eq(strategyParameters.id, id));
    return result[0];
  }

  async getStrategyParameters(): Promise<StrategyParameter[]> {
    return db.select().from(strategyParameters);
  }

  async createStrategyParameter(param: InsertStrategyParameter): Promise<StrategyParameter> {
    const result = await db.insert(strategyParameters).values(param);
    const insertId = Number(result.insertId);
    const newParam = await this.getStrategyParameter(insertId);
    
    if (!newParam) {
      throw new Error('Failed to create strategy parameter');
    }
    
    return newParam;
  }

  async updateStrategyParameter(id: number, param: Partial<StrategyParameter>): Promise<StrategyParameter> {
    await db.update(strategyParameters)
      .set(param)
      .where(eq(strategyParameters.id, id));
    
    const updated = await this.getStrategyParameter(id);
    if (!updated) {
      throw new Error(`Strategy Parameter with ID ${id} not found after update`);
    }
    return updated;
  }

  // Strategy Template 相关方法
  async getStrategyTemplate(id: number): Promise<StrategyTemplate | undefined> {
    const result = await db.select().from(strategyTemplates).where(eq(strategyTemplates.id, id));
    return result[0];
  }

  async getStrategyTemplates(): Promise<StrategyTemplate[]> {
    return db.select().from(strategyTemplates);
  }

  async createStrategyTemplate(template: InsertStrategyTemplate): Promise<StrategyTemplate> {
    const result = await db.insert(strategyTemplates).values(template);
    const insertId = Number(result.insertId);
    const newTemplate = await this.getStrategyTemplate(insertId);
    
    if (!newTemplate) {
      throw new Error('Failed to create strategy template');
    }
    
    return newTemplate;
  }

  async deleteStrategyTemplate(id: number): Promise<void> {
    await db.delete(strategyTemplates).where(eq(strategyTemplates.id, id));
  }

  async initializeData(): Promise<void> {
    console.log('初始化 MySQL 存储数据...');
    
    try {
      // 添加默认参数
      const existingParams = await this.getStrategyParameters();
      
      if (existingParams.length === 0) {
        const defaultParams = [
          {
            name: "长期预订权重",
            description: "提高预订窗口长的促销活动的权重",
            paramKey: "longTermBookingWeight",
            value: 5.0
          },
          {
            name: "成本效率权重",
            description: "提高成本效率好的促销活动的权重",
            paramKey: "costEfficiencyWeight",
            value: 5.0
          },
          {
            name: "可见度权重",
            description: "提高可见度高的促销活动的权重",
            paramKey: "visibilityWeight",
            value: 5.0
          },
          {
            name: "入住率权重",
            description: "提高当日入住率的权重",
            paramKey: "occupancyRateWeight",
            value: 5.0
          },
          {
            name: "最小策略复杂度",
            description: "策略复杂度的最小阈值",
            paramKey: "minStrategyComplexity",
            value: 2.0
          }
        ];

        for (const param of defaultParams) {
          await this.createStrategyParameter(param);
        }
        
        console.log('创建了默认参数');
      }
      
      console.log('MySQL 存储初始化完成');
    } catch (err) {
      console.error('MySQL 存储初始化失败:', err);
    }
  }
}

// 导出 MySQL 存储实例
export const mysqlStorage = new MySQLStorage();