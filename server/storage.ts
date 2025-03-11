import {
  User,
  InsertUser,
  OtaAccount,
  InsertOtaAccount,
  Activity,
  InsertActivity,
  Strategy,
  InsertStrategy,
  ApiKey,
  InsertApiKey,
  Setting,
  InsertSetting,
  StrategyParameter,
  InsertStrategyParameter,
  StrategyTemplate,
  InsertStrategyTemplate,
} from "@shared/schema";

// Interface for storage methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  
  // OTA Account methods
  getOtaAccount(id: number): Promise<OtaAccount | undefined>;
  getOtaAccountsByUserId(userId: number): Promise<OtaAccount[]>;
  createOtaAccount(account: InsertOtaAccount): Promise<OtaAccount>;
  updateOtaAccount(id: number, account: Partial<OtaAccount>): Promise<OtaAccount>;
  deleteOtaAccount(id: number): Promise<void>;
  
  // Activity methods
  getActivity(id: number): Promise<Activity | undefined>;
  getActivitiesByUserId(userId: number): Promise<Activity[]>;
  getActivitiesByPlatform(platformId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, activity: Partial<Activity>): Promise<Activity>;
  deleteActivity(id: number): Promise<void>;
  
  // Strategy methods
  getStrategy(id: number): Promise<Strategy | undefined>;
  getStrategiesByUserId(userId: number): Promise<Strategy[]>;
  getAppliedStrategiesByUserId(userId: number): Promise<Strategy[]>;
  getRecentAppliedStrategies(limit: number): Promise<Strategy[]>;
  createStrategy(strategy: InsertStrategy): Promise<Strategy>;
  updateStrategy(id: number, strategy: Partial<Strategy>): Promise<Strategy>;
  
  // API Key methods
  getApiKey(id: number): Promise<ApiKey | undefined>;
  getApiKeyByUserIdAndService(userId: number, service: string): Promise<ApiKey | undefined>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: number, apiKey: Partial<ApiKey>): Promise<ApiKey>;
  deleteApiKey(id: number): Promise<void>;
  
  // Settings methods
  getSettingsByUserId(userId: number): Promise<Setting | undefined>;
  createSettings(settings: InsertSetting): Promise<Setting>;
  updateSettings(id: number, settings: Partial<Setting>): Promise<Setting>;
  
  // Strategy Parameter methods
  getStrategyParameter(id: number): Promise<StrategyParameter | undefined>;
  getStrategyParameters(): Promise<StrategyParameter[]>;
  createStrategyParameter(param: InsertStrategyParameter): Promise<StrategyParameter>;
  updateStrategyParameter(id: number, param: Partial<StrategyParameter>): Promise<StrategyParameter>;
  
  // Strategy Template methods
  getStrategyTemplate(id: number): Promise<StrategyTemplate | undefined>;
  getStrategyTemplates(): Promise<StrategyTemplate[]>;
  createStrategyTemplate(template: InsertStrategyTemplate): Promise<StrategyTemplate>;
  deleteStrategyTemplate(id: number): Promise<void>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private otaAccounts: Map<number, OtaAccount>;
  private activities: Map<number, Activity>;
  private strategies: Map<number, Strategy>;
  private apiKeys: Map<number, ApiKey>;
  private settings: Map<number, Setting>;
  private strategyParams: Map<number, StrategyParameter>;
  private strategyTemplates: Map<number, StrategyTemplate>;
  
  private nextUserId: number;
  private nextAccountId: number;
  private nextActivityId: number;
  private nextStrategyId: number;
  private nextApiKeyId: number;
  private nextSettingId: number;
  private nextParamId: number;
  private nextTemplateId: number;
  
  constructor() {
    this.users = new Map();
    this.otaAccounts = new Map();
    this.activities = new Map();
    this.strategies = new Map();
    this.apiKeys = new Map();
    this.settings = new Map();
    this.strategyParams = new Map();
    this.strategyTemplates = new Map();
    
    this.nextUserId = 1;
    this.nextAccountId = 1;
    this.nextActivityId = 1;
    this.nextStrategyId = 1;
    this.nextApiKeyId = 1;
    this.nextSettingId = 1;
    this.nextParamId = 1;
    this.nextTemplateId = 1;
    
    // Initialize with default data (synchronously)
    this.initializeDefaultData();
  }
  
  // 初始化默认数据 (同步方式)
  private initializeDefaultData() {
    const now = new Date();
    
    // 创建管理员用户
    const adminId = this.nextUserId++;
    const admin: User = { 
      id: adminId,
      username: "admin",
      password: "$2b$10$dUxlkALV.dkFQwQD6nYiJ.X9IKFPPxH.8MH9DCYfxrs9bUMnHHrwa", // password: admin
      role: "admin",
      hotel: "星星酒店集团",
      createdAt: now
    };
    this.users.set(adminId, admin);
    
    // 创建经理用户
    const managerId = this.nextUserId++;
    const manager: User = { 
      id: managerId,
      username: "总经理",
      password: "$2b$10$dUxlkALV.dkFQwQD6nYiJ.X9IKFPPxH.8MH9DCYfxrs9bUMnHHrwa", // password: admin
      role: "manager",
      hotel: "星星酒店连锁",
      createdAt: now
    };
    this.users.set(managerId, manager);
    
    // 添加测试用户，便于演示
    const testUserId = this.nextUserId++;
    const testUser: User = { 
      id: testUserId,
      username: "snorkeler",
      password: "$2b$10$dUxlkALV.dkFQwQD6nYiJ.X9IKFPPxH.8MH9DCYfxrs9bUMnHHrwa", // password: admin
      role: "manager",
      hotel: "珠海海景酒店",
      createdAt: now
    };
    this.users.set(testUserId, testUser);
    
    // 创建默认OTA账户（同步方式）
    const ctripId = this.nextAccountId++;
    const ctrip: OtaAccount = {
      id: ctripId,
      userId: manager.id,
      name: "携程旅行",
      shortName: "携程",
      url: "https://merchant.ctrip.com",
      username: "starhotel_admin",
      password: "$2b$10$dUxlkALV.dkFQwQD6nYiJ.X9IKFPPxH.8MH9DCYfxrs9bUMnHHrwa", // Encrypted (not real)
      accountType: "企业账户",
      status: "已连接",
      lastUpdated: now,
      createdAt: now
    };
    this.otaAccounts.set(ctripId, ctrip);
    
    const meituanId = this.nextAccountId++;
    const meituan: OtaAccount = {
      id: meituanId,
      userId: manager.id,
      name: "美团酒店",
      shortName: "美团",
      url: "https://eb.meituan.com",
      username: "starhotel2023",
      password: "$2b$10$dUxlkALV.dkFQwQD6nYiJ.X9IKFPPxH.8MH9DCYfxrs9bUMnHHrwa", // Encrypted (not real)
      accountType: "商家账户",
      status: "已连接",
      lastUpdated: now,
      createdAt: now
    };
    this.otaAccounts.set(meituanId, meituan);
    
    const fliggyId = this.nextAccountId++;
    const fliggy: OtaAccount = {
      id: fliggyId,
      userId: manager.id,
      name: "飞猪旅行",
      shortName: "飞猪",
      url: "https://merchant.fliggy.com",
      username: "starhotel_fz",
      password: "$2b$10$dUxlkALV.dkFQwQD6nYiJ.X9IKFPPxH.8MH9DCYfxrs9bUMnHHrwa", // Encrypted (not real)
      accountType: "商家账户",
      status: "未连接",
      lastUpdated: now,
      createdAt: now
    };
    this.otaAccounts.set(fliggyId, fliggy);
    
    // 创建默认活动（同步方式）
    const activity1Id = this.nextActivityId++;
    const startDate1 = new Date();
    startDate1.setDate(startDate1.getDate() - 5);
    
    const endDate1 = new Date();
    endDate1.setMonth(endDate1.getMonth() + 1);
    endDate1.setDate(endDate1.getDate() + 10);
    
    const activity1: Activity = {
      id: activity1Id,
      platformId: ctripId,
      name: "暑期特惠房",
      description: "高级大床房 8.5折",
      startDate: startDate1,
      endDate: endDate1,
      discount: "15% 折扣",
      commissionRate: "8%",
      roomTypes: ["高级大床房", "豪华套房"],
      status: "进行中",
      tag: "特惠",
      participationStatus: "已参与",
      createdAt: now
    };
    this.activities.set(activity1Id, activity1);
    
    const activity2Id = this.nextActivityId++;
    const startDate2 = new Date();
    startDate2.setDate(startDate2.getDate() + 3);
    
    const endDate2 = new Date();
    endDate2.setDate(endDate2.getDate() + 5);
    
    const activity2: Activity = {
      id: activity2Id,
      platformId: meituanId,
      name: "周末特惠",
      description: "所有房型周末入住减100",
      startDate: startDate2,
      endDate: endDate2,
      discount: "满减 100元",
      commissionRate: "10%",
      roomTypes: ["所有房型"],
      status: "待开始",
      tag: "限时",
      participationStatus: "已参与",
      createdAt: now
    };
    this.activities.set(activity2Id, activity2);
    
    const activity3Id = this.nextActivityId++;
    const startDate3 = new Date();
    startDate3.setMonth(startDate3.getMonth() + 2);
    startDate3.setDate(20);
    
    const endDate3 = new Date();
    endDate3.setMonth(endDate3.getMonth() + 3);
    endDate3.setDate(12);
    
    const activity3: Activity = {
      id: activity3Id,
      platformId: fliggyId,
      name: "双十一预售",
      description: "远期预订特惠活动",
      startDate: startDate3,
      endDate: endDate3,
      discount: "20% 折扣",
      commissionRate: "12%",
      roomTypes: ["标准房", "商务房", "套房"],
      minimumStay: 2,
      status: "未决定",
      tag: "热门",
      participationStatus: "未参与",
      createdAt: now
    };
    this.activities.set(activity3Id, activity3);
    
    // 创建默认策略参数（同步方式）
    const param1Id = this.nextParamId++;
    const param1: StrategyParameter = {
      id: param1Id,
      name: "关注远期预定",
      description: "偏向未来日期的预订",
      paramKey: "future_booking_weight",
      value: 5.0,
      createdAt: now,
      updatedAt: now
    };
    this.strategyParams.set(param1Id, param1);
    
    const param2Id = this.nextParamId++;
    const param2: StrategyParameter = {
      id: param2Id,
      name: "关注成本最小",
      description: "优先考虑佣金成本较低的活动",
      paramKey: "cost_optimization_weight",
      value: 7.0,
      createdAt: now,
      updatedAt: now
    };
    this.strategyParams.set(param2Id, param2);
    
    const param3Id = this.nextParamId++;
    const param3: StrategyParameter = {
      id: param3Id,
      name: "关注展示最优化",
      description: "优先考虑平台展示效果",
      paramKey: "visibility_optimization_weight",
      value: 6.0,
      createdAt: now,
      updatedAt: now
    };
    this.strategyParams.set(param3Id, param3);
    
    const param4Id = this.nextParamId++;
    const param4: StrategyParameter = {
      id: param4Id,
      name: "关注当日OCC",
      description: "优先考虑提升当日入住率",
      paramKey: "daily_occupancy_weight",
      value: 4.0,
      createdAt: now,
      updatedAt: now
    };
    this.strategyParams.set(param4Id, param4);
    
    const param5Id = this.nextParamId++;
    const param5: StrategyParameter = {
      id: param5Id,
      name: "平衡长短期收益",
      description: "平衡即时收益与长期声誉",
      paramKey: "revenue_balance_weight",
      value: 8.0,
      createdAt: now,
      updatedAt: now
    };
    this.strategyParams.set(param5Id, param5);
    
    // 创建默认用户设置（同步方式）
    const settingsId = this.nextSettingId++;
    const settings: Setting = {
      id: settingsId,
      userId: manager.id,
      notificationsEnabled: true,
      autoRefreshInterval: 30,
      defaultStrategyPreference: "balanced",
      createdAt: now,
      updatedAt: now
    };
    this.settings.set(settingsId, settings);
    
    // 创建API密钥（同步方式）
    const apiKeyId = this.nextApiKeyId++;
    const apiKey: ApiKey = {
      id: apiKeyId,
      userId: manager.id,
      service: "deepseek",
      encryptedKey: "$2b$10$dUxlkALV.dkFQwQD6nYiJ.X9IKFPPxH.8MH9DCYfxrs9bUMnHHrwa",
      model: "DeepSeek-R1-Plus",
      lastUpdated: now,
      createdAt: now
    };
    this.apiKeys.set(apiKeyId, apiKey);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.nextUserId++;
    const now = new Date().toISOString();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // OTA Account methods
  async getOtaAccount(id: number): Promise<OtaAccount | undefined> {
    return this.otaAccounts.get(id);
  }

  async getOtaAccountsByUserId(userId: number): Promise<OtaAccount[]> {
    return Array.from(this.otaAccounts.values()).filter(
      (account) => account.userId === userId,
    );
  }

  async createOtaAccount(account: InsertOtaAccount): Promise<OtaAccount> {
    const id = this.nextAccountId++;
    const now = new Date().toISOString();
    const newAccount: OtaAccount = {
      ...account,
      id,
      lastUpdated: account.lastUpdated || now,
      createdAt: now,
    };
    this.otaAccounts.set(id, newAccount);
    return newAccount;
  }

  async updateOtaAccount(id: number, accountData: Partial<OtaAccount>): Promise<OtaAccount> {
    const account = this.otaAccounts.get(id);
    if (!account) {
      throw new Error(`OTA Account with ID ${id} not found`);
    }
    
    const updatedAccount = { ...account, ...accountData };
    this.otaAccounts.set(id, updatedAccount);
    return updatedAccount;
  }

  async deleteOtaAccount(id: number): Promise<void> {
    if (!this.otaAccounts.has(id)) {
      throw new Error(`OTA Account with ID ${id} not found`);
    }
    this.otaAccounts.delete(id);
    
    // Delete related activities
    for (const [activityId, activity] of this.activities.entries()) {
      if (activity.platformId === id) {
        this.activities.delete(activityId);
      }
    }
  }

  // Activity methods
  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async getActivitiesByUserId(userId: number): Promise<Activity[]> {
    // Get all accounts for this user
    const userAccounts = await this.getOtaAccountsByUserId(userId);
    const userAccountIds = userAccounts.map(account => account.id);
    
    // Filter activities by platform IDs
    return Array.from(this.activities.values()).filter(
      (activity) => userAccountIds.includes(activity.platformId),
    );
  }

  async getActivitiesByPlatform(platformId: number): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(
      (activity) => activity.platformId === platformId,
    );
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.nextActivityId++;
    const now = new Date().toISOString();
    
    // Check if this activity already exists (avoid duplicates)
    const existingActivities = await this.getActivitiesByPlatform(activity.platformId);
    const exists = existingActivities.some(
      a => a.name === activity.name && a.startDate === activity.startDate && a.endDate === activity.endDate
    );
    
    if (exists) {
      // Update existing activity instead of creating new one
      const existingActivity = existingActivities.find(
        a => a.name === activity.name && a.startDate === activity.startDate && a.endDate === activity.endDate
      );
      
      if (existingActivity) {
        return this.updateActivity(existingActivity.id, activity);
      }
    }
    
    const newActivity: Activity = {
      ...activity,
      id,
      createdAt: now,
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }

  async updateActivity(id: number, activityData: Partial<Activity>): Promise<Activity> {
    const activity = this.activities.get(id);
    if (!activity) {
      throw new Error(`Activity with ID ${id} not found`);
    }
    
    const updatedActivity = { ...activity, ...activityData };
    this.activities.set(id, updatedActivity);
    return updatedActivity;
  }

  async deleteActivity(id: number): Promise<void> {
    if (!this.activities.has(id)) {
      throw new Error(`Activity with ID ${id} not found`);
    }
    this.activities.delete(id);
  }

  // Strategy methods
  async getStrategy(id: number): Promise<Strategy | undefined> {
    return this.strategies.get(id);
  }

  async getStrategiesByUserId(userId: number): Promise<Strategy[]> {
    return Array.from(this.strategies.values()).filter(
      (strategy) => strategy.userId === userId,
    );
  }

  async getAppliedStrategiesByUserId(userId: number): Promise<Strategy[]> {
    return Array.from(this.strategies.values()).filter(
      (strategy) => strategy.userId === userId && strategy.appliedAt !== undefined,
    ).sort((a, b) => {
      if (!a.appliedAt || !b.appliedAt) return 0;
      return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
    });
  }

  async getRecentAppliedStrategies(limit: number): Promise<Strategy[]> {
    return Array.from(this.strategies.values())
      .filter(strategy => strategy.appliedAt !== undefined)
      .sort((a, b) => {
        if (!a.appliedAt || !b.appliedAt) return 0;
        return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
      })
      .slice(0, limit);
  }

  async createStrategy(strategy: InsertStrategy): Promise<Strategy> {
    const id = this.nextStrategyId++;
    const now = new Date().toISOString();
    const newStrategy: Strategy = {
      ...strategy,
      id,
      createdAt: now,
    };
    this.strategies.set(id, newStrategy);
    return newStrategy;
  }

  async updateStrategy(id: number, strategyData: Partial<Strategy>): Promise<Strategy> {
    const strategy = this.strategies.get(id);
    if (!strategy) {
      throw new Error(`Strategy with ID ${id} not found`);
    }
    
    const updatedStrategy = { ...strategy, ...strategyData };
    this.strategies.set(id, updatedStrategy);
    return updatedStrategy;
  }

  // API Key methods
  async getApiKey(id: number): Promise<ApiKey | undefined> {
    return this.apiKeys.get(id);
  }

  async getApiKeyByUserIdAndService(userId: number, service: string): Promise<ApiKey | undefined> {
    return Array.from(this.apiKeys.values()).find(
      (key) => key.userId === userId && key.service === service,
    );
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const id = this.nextApiKeyId++;
    const now = new Date().toISOString();
    const newApiKey: ApiKey = {
      ...apiKey,
      id,
      lastUpdated: now,
      createdAt: now,
    };
    this.apiKeys.set(id, newApiKey);
    return newApiKey;
  }

  async updateApiKey(id: number, apiKeyData: Partial<ApiKey>): Promise<ApiKey> {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) {
      throw new Error(`API Key with ID ${id} not found`);
    }
    
    const updatedApiKey = { ...apiKey, ...apiKeyData };
    this.apiKeys.set(id, updatedApiKey);
    return updatedApiKey;
  }

  async deleteApiKey(id: number): Promise<void> {
    if (!this.apiKeys.has(id)) {
      throw new Error(`API Key with ID ${id} not found`);
    }
    this.apiKeys.delete(id);
  }

  // Settings methods
  async getSettingsByUserId(userId: number): Promise<Setting | undefined> {
    return Array.from(this.settings.values()).find(
      (setting) => setting.userId === userId,
    );
  }

  async createSettings(settings: InsertSetting): Promise<Setting> {
    const id = this.nextSettingId++;
    const now = new Date().toISOString();
    const newSettings: Setting = {
      ...settings,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.settings.set(id, newSettings);
    return newSettings;
  }

  async updateSettings(id: number, settingsData: Partial<Setting>): Promise<Setting> {
    const settings = this.settings.get(id);
    if (!settings) {
      throw new Error(`Settings with ID ${id} not found`);
    }
    
    const updatedSettings = { ...settings, ...settingsData };
    this.settings.set(id, updatedSettings);
    return updatedSettings;
  }

  // Strategy Parameter methods
  async getStrategyParameter(id: number): Promise<StrategyParameter | undefined> {
    return this.strategyParams.get(id);
  }

  async getStrategyParameters(): Promise<StrategyParameter[]> {
    return Array.from(this.strategyParams.values());
  }

  async createStrategyParameter(param: InsertStrategyParameter): Promise<StrategyParameter> {
    const id = this.nextParamId++;
    const now = new Date().toISOString();
    const newParam: StrategyParameter = {
      ...param,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.strategyParams.set(id, newParam);
    return newParam;
  }

  async updateStrategyParameter(id: number, paramData: Partial<StrategyParameter>): Promise<StrategyParameter> {
    const param = this.strategyParams.get(id);
    if (!param) {
      throw new Error(`Strategy Parameter with ID ${id} not found`);
    }
    
    const updatedParam = { ...param, ...paramData };
    this.strategyParams.set(id, updatedParam);
    return updatedParam;
  }

  // Strategy Template methods
  async getStrategyTemplate(id: number): Promise<StrategyTemplate | undefined> {
    return this.strategyTemplates.get(id);
  }

  async getStrategyTemplates(): Promise<StrategyTemplate[]> {
    return Array.from(this.strategyTemplates.values());
  }

  async createStrategyTemplate(template: InsertStrategyTemplate): Promise<StrategyTemplate> {
    const id = this.nextTemplateId++;
    const now = new Date().toISOString();
    const newTemplate: StrategyTemplate = {
      ...template,
      id,
      addedAt: now,
    };
    this.strategyTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async deleteStrategyTemplate(id: number): Promise<void> {
    if (!this.strategyTemplates.has(id)) {
      throw new Error(`Strategy Template with ID ${id} not found`);
    }
    this.strategyTemplates.delete(id);
  }
}

export const storage = new MemStorage();
