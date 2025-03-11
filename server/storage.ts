import { 
  PlatformAccount, InsertPlatformAccount,
  PromotionActivity, InsertPromotionActivity,
  Strategy, InsertStrategy,
  StrategyExecution, InsertStrategyExecution,
  AiSetting, InsertAiSetting,
  AiParameter, InsertAiParameter
} from "@shared/schema";
import { encrypt, decrypt } from "./utils/crypto";

// Storage interface
export interface IStorage {
  // Platform Accounts
  getPlatformAccounts(): Promise<PlatformAccount[]>;
  getPlatformAccount(id: number): Promise<PlatformAccount | undefined>;
  createPlatformAccount(account: InsertPlatformAccount): Promise<PlatformAccount>;
  updatePlatformAccount(id: number, account: Partial<InsertPlatformAccount>): Promise<PlatformAccount | undefined>;
  deletePlatformAccount(id: number): Promise<boolean>;

  // Promotion Activities
  getPromotionActivities(): Promise<PromotionActivity[]>;
  getPromotionActivity(id: number): Promise<PromotionActivity | undefined>;
  getRecentPromotionActivities(limit: number): Promise<PromotionActivity[]>;
  createPromotionActivity(activity: InsertPromotionActivity): Promise<PromotionActivity>;
  updatePromotionActivity(id: number, activity: Partial<InsertPromotionActivity>): Promise<PromotionActivity | undefined>;
  deletePromotionActivity(id: number): Promise<boolean>;

  // Strategies
  getStrategies(isTemplate?: boolean): Promise<Strategy[]>;
  getStrategy(id: number): Promise<Strategy | undefined>;
  getRecentStrategies(limit: number): Promise<Strategy[]>;
  createStrategy(strategy: InsertStrategy): Promise<Strategy>;
  updateStrategy(id: number, strategy: Partial<InsertStrategy>): Promise<Strategy | undefined>;
  deleteStrategy(id: number): Promise<boolean>;

  // Strategy Executions
  getStrategyExecutions(): Promise<StrategyExecution[]>;
  getStrategyExecution(id: number): Promise<StrategyExecution | undefined>;
  getRecentStrategyExecutions(limit: number): Promise<StrategyExecution[]>;
  createStrategyExecution(execution: InsertStrategyExecution): Promise<StrategyExecution>;
  deleteStrategyExecution(id: number): Promise<boolean>;
  
  // AI Settings
  getAiSettings(): Promise<AiSetting | undefined>;
  saveAiSettings(settings: InsertAiSetting): Promise<AiSetting>;
  
  // AI Parameters
  getAiParameters(): Promise<AiParameter[]>;
  getAiParameter(name: string): Promise<AiParameter | undefined>;
  saveAiParameter(parameter: InsertAiParameter): Promise<AiParameter>;
  updateAiParameter(name: string, value: number): Promise<AiParameter | undefined>;
}

export class MemStorage implements IStorage {
  private platformAccounts: Map<number, PlatformAccount>;
  private promotionActivities: Map<number, PromotionActivity>;
  private strategies: Map<number, Strategy>;
  private strategyExecutions: Map<number, StrategyExecution>;
  private aiSettings: AiSetting | undefined;
  private aiParameters: Map<string, AiParameter>;
  
  private platformAccountId: number;
  private promotionActivityId: number;
  private strategyId: number;
  private strategyExecutionId: number;
  private aiSettingId: number;
  private aiParameterId: number;

  constructor() {
    this.platformAccounts = new Map();
    this.promotionActivities = new Map();
    this.strategies = new Map();
    this.strategyExecutions = new Map();
    this.aiParameters = new Map();
    
    this.platformAccountId = 1;
    this.promotionActivityId = 1;
    this.strategyId = 1;
    this.strategyExecutionId = 1;
    this.aiSettingId = 1;
    this.aiParameterId = 1;
    
    // Initialize with default AI parameters
    this.initDefaultParameters();
  }

  private initDefaultParameters(): void {
    const defaultParameters = [
      {
        paramName: "longTerm",
        paramValue: 7,
        paramDescription: "关注远期预定的程度，提高此参数会使推荐策略更加关注未来1-3个月的预订情况。"
      },
      {
        paramName: "costMinimization",
        paramValue: 5,
        paramDescription: "关注成本最小的程度，提高此参数会使推荐策略更加关注降低OTA平台佣金和促销成本。"
      },
      {
        paramName: "visibilityOptimization",
        paramValue: 8,
        paramDescription: "关注展示最优化的程度，提高此参数会使推荐策略更加关注OTA平台搜索结果中的排名和展示位置。"
      },
      {
        paramName: "dailyOccupancy",
        paramValue: 6,
        paramDescription: "关注当日入住率的程度，提高此参数会使推荐策略更加关注提高当日和近期的入住率。"
      },
      {
        paramName: "priceStability",
        paramValue: 3,
        paramDescription: "关注价格稳定性的程度，提高此参数会使推荐策略更加关注维持价格稳定性，避免频繁波动。"
      }
    ];

    defaultParameters.forEach(param => {
      const id = this.aiParameterId++;
      this.aiParameters.set(param.paramName, {
        id,
        paramName: param.paramName,
        paramValue: param.paramValue,
        paramDescription: param.paramDescription,
        updatedAt: new Date()
      });
    });
  }

  // Platform Accounts
  async getPlatformAccounts(): Promise<PlatformAccount[]> {
    return Array.from(this.platformAccounts.values()).map(account => ({
      ...account,
      password: decrypt(account.password)
    }));
  }

  async getPlatformAccount(id: number): Promise<PlatformAccount | undefined> {
    const account = this.platformAccounts.get(id);
    if (!account) return undefined;
    
    return {
      ...account,
      password: decrypt(account.password)
    };
  }

  async createPlatformAccount(account: InsertPlatformAccount): Promise<PlatformAccount> {
    const id = this.platformAccountId++;
    const now = new Date();
    
    const newAccount: PlatformAccount = {
      id,
      ...account,
      password: encrypt(account.password),
      createdAt: now,
      updatedAt: now
    };
    
    this.platformAccounts.set(id, newAccount);
    
    return {
      ...newAccount,
      password: account.password // Return unencrypted password
    };
  }

  async updatePlatformAccount(id: number, account: Partial<InsertPlatformAccount>): Promise<PlatformAccount | undefined> {
    const existingAccount = this.platformAccounts.get(id);
    if (!existingAccount) return undefined;
    
    const updatedAccount: PlatformAccount = {
      ...existingAccount,
      ...account,
      password: account.password ? encrypt(account.password) : existingAccount.password,
      updatedAt: new Date()
    };
    
    this.platformAccounts.set(id, updatedAccount);
    
    return {
      ...updatedAccount,
      password: account.password || decrypt(existingAccount.password)
    };
  }

  async deletePlatformAccount(id: number): Promise<boolean> {
    return this.platformAccounts.delete(id);
  }

  // Promotion Activities
  async getPromotionActivities(): Promise<PromotionActivity[]> {
    return Array.from(this.promotionActivities.values());
  }

  async getPromotionActivity(id: number): Promise<PromotionActivity | undefined> {
    return this.promotionActivities.get(id);
  }

  async getRecentPromotionActivities(limit: number): Promise<PromotionActivity[]> {
    return Array.from(this.promotionActivities.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createPromotionActivity(activity: InsertPromotionActivity): Promise<PromotionActivity> {
    const id = this.promotionActivityId++;
    const now = new Date();
    
    const newActivity: PromotionActivity = {
      id,
      ...activity,
      createdAt: now,
      updatedAt: now
    };
    
    this.promotionActivities.set(id, newActivity);
    return newActivity;
  }

  async updatePromotionActivity(id: number, activity: Partial<InsertPromotionActivity>): Promise<PromotionActivity | undefined> {
    const existingActivity = this.promotionActivities.get(id);
    if (!existingActivity) return undefined;
    
    const updatedActivity: PromotionActivity = {
      ...existingActivity,
      ...activity,
      updatedAt: new Date()
    };
    
    this.promotionActivities.set(id, updatedActivity);
    return updatedActivity;
  }

  async deletePromotionActivity(id: number): Promise<boolean> {
    return this.promotionActivities.delete(id);
  }

  // Strategies
  async getStrategies(isTemplate?: boolean): Promise<Strategy[]> {
    return Array.from(this.strategies.values())
      .filter(strategy => isTemplate === undefined || strategy.isTemplate === isTemplate);
  }

  async getStrategy(id: number): Promise<Strategy | undefined> {
    return this.strategies.get(id);
  }

  async getRecentStrategies(limit: number): Promise<Strategy[]> {
    return Array.from(this.strategies.values())
      .filter(strategy => !strategy.isTemplate)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createStrategy(strategy: InsertStrategy): Promise<Strategy> {
    const id = this.strategyId++;
    
    const newStrategy: Strategy = {
      id,
      ...strategy,
      createdAt: new Date()
    };
    
    this.strategies.set(id, newStrategy);
    return newStrategy;
  }

  async updateStrategy(id: number, strategy: Partial<InsertStrategy>): Promise<Strategy | undefined> {
    const existingStrategy = this.strategies.get(id);
    if (!existingStrategy) return undefined;
    
    const updatedStrategy: Strategy = {
      ...existingStrategy,
      ...strategy
    };
    
    this.strategies.set(id, updatedStrategy);
    return updatedStrategy;
  }

  async deleteStrategy(id: number): Promise<boolean> {
    return this.strategies.delete(id);
  }

  // Strategy Executions
  async getStrategyExecutions(): Promise<StrategyExecution[]> {
    return Array.from(this.strategyExecutions.values());
  }

  async getStrategyExecution(id: number): Promise<StrategyExecution | undefined> {
    return this.strategyExecutions.get(id);
  }

  async getRecentStrategyExecutions(limit: number): Promise<StrategyExecution[]> {
    return Array.from(this.strategyExecutions.values())
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
      .slice(0, limit);
  }

  async createStrategyExecution(execution: InsertStrategyExecution): Promise<StrategyExecution> {
    const id = this.strategyExecutionId++;
    
    const newExecution: StrategyExecution = {
      id,
      ...execution,
      executedAt: new Date()
    };
    
    this.strategyExecutions.set(id, newExecution);
    return newExecution;
  }

  async deleteStrategyExecution(id: number): Promise<boolean> {
    return this.strategyExecutions.delete(id);
  }

  // AI Settings
  async getAiSettings(): Promise<AiSetting | undefined> {
    if (!this.aiSettings) return undefined;
    
    return {
      ...this.aiSettings,
      apiKey: decrypt(this.aiSettings.apiKey)
    };
  }

  async saveAiSettings(settings: InsertAiSetting): Promise<AiSetting> {
    if (this.aiSettings) {
      const updatedSettings: AiSetting = {
        ...this.aiSettings,
        ...settings,
        apiKey: encrypt(settings.apiKey),
        updatedAt: new Date()
      };
      
      this.aiSettings = updatedSettings;
      
      return {
        ...updatedSettings,
        apiKey: settings.apiKey
      };
    } else {
      const id = this.aiSettingId++;
      
      const newSettings: AiSetting = {
        id,
        ...settings,
        apiKey: encrypt(settings.apiKey),
        updatedAt: new Date()
      };
      
      this.aiSettings = newSettings;
      
      return {
        ...newSettings,
        apiKey: settings.apiKey
      };
    }
  }

  // AI Parameters
  async getAiParameters(): Promise<AiParameter[]> {
    return Array.from(this.aiParameters.values());
  }

  async getAiParameter(name: string): Promise<AiParameter | undefined> {
    return this.aiParameters.get(name);
  }

  async saveAiParameter(parameter: InsertAiParameter): Promise<AiParameter> {
    const id = this.aiParameterId++;
    
    const newParameter: AiParameter = {
      id,
      ...parameter,
      updatedAt: new Date()
    };
    
    this.aiParameters.set(parameter.paramName, newParameter);
    return newParameter;
  }

  async updateAiParameter(name: string, value: number): Promise<AiParameter | undefined> {
    const existingParameter = this.aiParameters.get(name);
    if (!existingParameter) return undefined;
    
    const updatedParameter: AiParameter = {
      ...existingParameter,
      paramValue: value,
      updatedAt: new Date()
    };
    
    this.aiParameters.set(name, updatedParameter);
    return updatedParameter;
  }
}

export const storage = new MemStorage();
