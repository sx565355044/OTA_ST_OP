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
    
    // Initialize with default data
    this.initializeDefaultData();
  }
  
  // Initializes default data for demo purposes
  private async initializeDefaultData() {
    // Create default admin user
    const adminUser: InsertUser = {
      username: "admin",
      password: "$2b$10$dUxlkALV.dkFQwQD6nYiJ.X9IKFPPxH.8MH9DCYfxrs9bUMnHHrwa", // password: admin
      role: "admin",
      hotel: "星星酒店集团",
    };
    
    await this.createUser(adminUser);
    
    // Create default manager user
    const managerUser: InsertUser = {
      username: "总经理",
      password: "$2b$10$dUxlkALV.dkFQwQD6nYiJ.X9IKFPPxH.8MH9DCYfxrs9bUMnHHrwa", // password: admin
      role: "manager",
      hotel: "星星酒店连锁",
    };
    
    const user = await this.createUser(managerUser);
    
    // Create default OTA accounts
    const ctrip: InsertOtaAccount = {
      userId: user.id,
      name: "携程旅行",
      shortName: "携程",
      url: "https://merchant.ctrip.com",
      username: "starhotel_admin",
      password: "$2b$10$dUxlkALV.dkFQwQD6nYiJ.X9IKFPPxH.8MH9DCYfxrs9bUMnHHrwa", // Encrypted (not real)
      accountType: "企业账户",
      status: "已连接",
      lastUpdated: new Date().toISOString(),
    };
    
    const meituan: InsertOtaAccount = {
      userId: user.id,
      name: "美团酒店",
      shortName: "美团",
      url: "https://eb.meituan.com",
      username: "starhotel2023",
      password: "$2b$10$dUxlkALV.dkFQwQD6nYiJ.X9IKFPPxH.8MH9DCYfxrs9bUMnHHrwa", // Encrypted (not real)
      accountType: "商家账户",
      status: "已连接",
      lastUpdated: new Date().toISOString(),
    };
    
    const fliggy: InsertOtaAccount = {
      userId: user.id,
      name: "飞猪旅行",
      shortName: "飞猪",
      url: "https://merchant.fliggy.com",
      username: "starhotel_fz",
      password: "$2b$10$dUxlkALV.dkFQwQD6nYiJ.X9IKFPPxH.8MH9DCYfxrs9bUMnHHrwa", // Encrypted (not real)
      accountType: "商家账户",
      status: "未连接",
      lastUpdated: new Date().toISOString(),
    };
    
    const ctripAccount = await this.createOtaAccount(ctrip);
    const meituanAccount = await this.createOtaAccount(meituan);
    const fliggyAccount = await this.createOtaAccount(fliggy);
    
    // Create default activities
    const now = new Date();
    
    // Activity 1
    await this.createActivity({
      platformId: ctripAccount.id,
      name: "暑期特惠房",
      description: "高级大床房 8.5折",
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5).toISOString(),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate() + 10).toISOString(),
      discount: "15% 折扣",
      commissionRate: "8%",
      roomTypes: ["高级大床房", "豪华套房"],
      status: "进行中",
      tag: "特惠",
      participationStatus: "已参与",
    });
    
    // Activity 2
    await this.createActivity({
      platformId: meituanAccount.id,
      name: "周末特惠",
      description: "所有房型周末入住减100",
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3).toISOString(),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5).toISOString(),
      discount: "满减 100元",
      commissionRate: "10%",
      roomTypes: ["所有房型"],
      status: "待开始",
      tag: "限时",
      participationStatus: "已参与",
    });
    
    // Activity 3
    await this.createActivity({
      platformId: fliggyAccount.id,
      name: "双十一预售",
      description: "远期预订特惠活动",
      startDate: new Date(now.getFullYear(), now.getMonth() + 2, 20).toISOString(),
      endDate: new Date(now.getFullYear(), now.getMonth() + 3, 12).toISOString(),
      discount: "20% 折扣",
      commissionRate: "12%",
      roomTypes: ["标准房", "商务房", "套房"],
      minimumStay: 2,
      status: "未决定",
      tag: "热门",
      participationStatus: "未参与",
    });
    
    // Create default strategy parameters
    await this.createStrategyParameter({
      name: "关注远期预定",
      description: "偏向未来日期的预订",
      paramKey: "future_booking_weight",
      value: 5.0,
    });
    
    await this.createStrategyParameter({
      name: "关注成本最小",
      description: "优先考虑佣金成本较低的活动",
      paramKey: "cost_optimization_weight",
      value: 7.0,
    });
    
    await this.createStrategyParameter({
      name: "关注展示最优化",
      description: "优先考虑平台展示效果",
      paramKey: "visibility_optimization_weight",
      value: 6.0,
    });
    
    await this.createStrategyParameter({
      name: "关注当日OCC",
      description: "优先考虑提升当日入住率",
      paramKey: "daily_occupancy_weight",
      value: 4.0,
    });
    
    await this.createStrategyParameter({
      name: "平衡长短期收益",
      description: "平衡即时收益与长期声誉",
      paramKey: "revenue_balance_weight",
      value: 8.0,
    });
    
    // Create default user settings
    await this.createSettings({
      userId: user.id,
      notificationsEnabled: true,
      autoRefreshInterval: 30,
      defaultStrategyPreference: "balanced",
    });
    
    // Create API key (encrypted, not real)
    await this.createApiKey({
      userId: user.id,
      service: "deepseek",
      encryptedKey: "$2b$10$dUxlkALV.dkFQwQD6nYiJ.X9IKFPPxH.8MH9DCYfxrs9bUMnHHrwa",
      model: "DeepSeek-R1-Plus",
    });
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
