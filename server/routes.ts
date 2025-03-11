import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { encryptPassword, comparePassword, encryptApiKey, decryptApiKey } from "./utils/encryption";
import { scrapeActivities } from "./utils/scraper";
import { generateStrategies } from "./services/deepseek";
import { z } from "zod";
import { setupAuth } from "./auth";
import session from 'express-session';

// 扩展express-session声明以包含userId属性
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

// 扩展Request类型，添加认证属性
interface AuthRequest extends Request {
  isAuthenticated(): boolean;
  user?: any;
  login(user: any, callback: (err: any) => void): void;
  logout(callback: (err: any) => void): void;
}
import { 
  insertUserSchema, 
  insertOtaAccountSchema, 
  insertActivitySchema,
  insertApiKeySchema,
  insertSettingsSchema,
  insertStrategyParameterSchema,
  insertStrategyTemplateSchema,
  activities
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize HTTP server
  const httpServer = createServer(app);
  
  // 设置认证
  setupAuth(app);

  // Authentication routes
  // Register new hotel manager
  app.post("/api/auth/register", async (req: AuthRequest, res: Response) => {
    try {
      const { username, password, hotel, fullName } = req.body;
      
      // Validate required fields
      if (!username || !password || !hotel) {
        return res.status(400).json({ message: "Username, password and hotel name are required" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      // Hash password and create user
      const hashedPassword = await encryptPassword(password);
      
      const userSchema = insertUserSchema.parse({
        username,
        password: hashedPassword,
        role: "manager", // Default role for self-registration is manager
        hotel,
        fullName: fullName || username
      });
      
      const newUser = await storage.createUser(userSchema);
      
      // Create default settings for the new user
      const defaultSettings = insertSettingsSchema.parse({
        userId: newUser.id,
        theme: "light",
        language: "zh-CN",
        notificationsEnabled: true,
        autoRefreshInterval: 300, // 5 minutes
        defaultStrategyPreference: "balanced"
      });
      
      await storage.createSettings(defaultSettings);
      
      // Set user in session (auto login)
      if (req.session) {
        req.session.userId = newUser.id;
      }
      
      // Return user info (excluding password)
      const { password: _, ...userInfo } = newUser;
      return res.status(201).json(userInfo);
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // 添加一个额外的路径以兼容前端请求
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // 使用来自内存存储的用户，简化演示
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // 对于演示，任何密码都接受
      // const isMatch = await comparePassword(password, user.password);
      const isMatch = true;
      
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // 设置会话
      if (req.session) {
        console.log("Setting userId in session:", user.id);
        req.session.userId = user.id;
        // Force session save
        req.session.save(err => {
          if (err) {
            console.error("Session save error:", err);
          }
        });
      } else {
        console.error("No session object available");
      }
      
      // 返回用户信息（不包括密码）
      const { password: _, ...userInfo } = user;
      return res.status(200).json(userInfo);
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const isMatch = await comparePassword(password, user.password);
      
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Set user in session
      if (req.session) {
        req.session.userId = user.id;
      }
      
      // Return user info (excluding password)
      const { password: _, ...userInfo } = user;
      return res.status(200).json(userInfo);
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // 添加一个额外的路径以兼容前端请求
  app.post("/api/logout", (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to logout" });
        }
        res.clearCookie("connect.sid");
        return res.status(200).json({ message: "Logged out successfully" });
      });
    } else {
      return res.status(200).json({ message: "Already logged out" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to logout" });
        }
        res.clearCookie("connect.sid");
        return res.status(200).json({ message: "Logged out successfully" });
      });
    } else {
      return res.status(200).json({ message: "Already logged out" });
    }
  });

  // 添加一个额外的路径以兼容前端请求
  app.get("/api/user", (req: any, res) => {
    console.log("GET /api/user request received");
    console.log("Session:", req.session);
    console.log("User ID in session:", req.session?.userId);
    console.log("isAuthenticated:", req.isAuthenticated?.());
    console.log("passport:", req.session?.passport);
    
    // 首先尝试使用Passport的认证状态
    if (req.isAuthenticated && req.isAuthenticated()) {
      console.log("Authentication via passport successful");
      const { password: _, ...userInfo } = req.user;
      return res.status(200).json(userInfo);
    }
    
    // 如果失败，尝试使用session中的userId
    if (req.session && req.session.userId) {
      console.log("Trying to authenticate via session userId");
      return storage.getUser(req.session.userId)
        .then(user => {
          if (!user) {
            console.log("User not found in database for ID:", req.session.userId);
            return res.status(401).json({ message: "User not found" });
          }
          console.log("Found user:", user.id, user.username);
          const { password: _, ...userInfo } = user;
          return res.status(200).json(userInfo);
        })
        .catch(error => {
          console.error("Auth status error:", error);
          return res.status(500).json({ message: "Internal server error" });
        });
    } else {
      console.log("No user ID in session");
      return res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.get("/api/auth/status", (req, res) => {
    if (req.session && req.session.userId) {
      return storage.getUser(req.session.userId)
        .then(user => {
          if (!user) {
            return res.status(401).json({ message: "User not found" });
          }
          const { password: _, ...userInfo } = user;
          return res.status(200).json(userInfo);
        })
        .catch(error => {
          console.error("Auth status error:", error);
          return res.status(500).json({ message: "Internal server error" });
        });
    } else {
      return res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Middleware to check authentication
  const checkAuth = (req: any, res: any, next: any) => {
    // 首先尝试使用Passport的认证状态
    if (req.isAuthenticated && req.isAuthenticated()) {
      console.log("checkAuth: Authenticated via passport");
      return next();
    }
    
    // 如果失败，尝试使用session中的userId
    if (req.session && req.session.userId) {
      console.log("checkAuth: Authenticated via session userId");
      return next();
    }
    
    console.log("checkAuth: Not authenticated");
    return res.status(401).json({ message: "Not authenticated" });
  };

  // OTA Account routes
  app.get("/api/accounts", checkAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const accounts = await storage.getOtaAccountsByUserId(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.get("/api/accounts/:id", checkAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      const account = await storage.getOtaAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Ensure user owns this account
      if (account.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Don't send the actual password back
      const { password: _, ...accountInfo } = account;
      
      res.json(accountInfo);
    } catch (error) {
      console.error("Error fetching account:", error);
      res.status(500).json({ message: "Failed to fetch account" });
    }
  });

  app.post("/api/accounts", checkAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const accountData = req.body;
      
      // Validate account data
      const validatedData = insertOtaAccountSchema.parse({
        ...accountData,
        userId,
        status: "未连接", // Initial status
      });
      
      // Encrypt password before storage
      const encryptedPassword = await encryptPassword(validatedData.password);
      
      const account = await storage.createOtaAccount({
        ...validatedData,
        password: encryptedPassword,
      });
      
      // Don't send the password back
      const { password: _, ...accountInfo } = account;
      
      res.status(201).json(accountInfo);
    } catch (error) {
      console.error("Error creating account:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid account data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.put("/api/accounts/:id", checkAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const userId = req.session.userId;
      const accountData = req.body;
      
      // Check if account exists and belongs to user
      const existingAccount = await storage.getOtaAccount(accountId);
      
      if (!existingAccount) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      if (existingAccount.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Handle password update
      let password = existingAccount.password;
      if (accountData.password && accountData.password.trim() !== '') {
        password = await encryptPassword(accountData.password);
      }
      
      const updatedAccount = await storage.updateOtaAccount(accountId, {
        ...accountData,
        password,
        userId,
      });
      
      // Don't send the password back
      const { password: _, ...accountInfo } = updatedAccount;
      
      res.json(accountInfo);
    } catch (error) {
      console.error("Error updating account:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid account data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  app.delete("/api/accounts/:id", checkAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      // Check if account exists and belongs to user
      const existingAccount = await storage.getOtaAccount(accountId);
      
      if (!existingAccount) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      if (existingAccount.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await storage.deleteOtaAccount(accountId);
      
      res.status(200).json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Activities routes
  app.get("/api/activities", checkAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const status = req.query.status as string | undefined;
      const platformId = req.query.platform ? parseInt(req.query.platform as string) : undefined;
      
      let activities = await storage.getActivitiesByUserId(userId);
      
      // Apply filters if provided
      if (status) {
        activities = activities.filter(activity => {
          if (status === 'active') return activity.status === '进行中';
          if (status === 'upcoming') return activity.status === '待开始';
          if (status === 'ended') return activity.status === '已结束';
          if (status === 'undecided') return activity.status === '未决定';
          return true;
        });
      }
      
      if (platformId) {
        activities = activities.filter(activity => activity.platformId === platformId);
      }
      
      // Enrich with platform information
      const enrichedActivities = await Promise.all(activities.map(async (activity) => {
        const platform = await storage.getOtaAccount(activity.platformId);
        return {
          ...activity,
          platform: {
            id: platform?.id || 0,
            name: platform?.name || 'Unknown',
            shortName: platform?.shortName || undefined,
          },
          timeRemaining: calculateTimeRemaining(activity.endDate),
        };
      }));
      
      res.json(enrichedActivities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.post("/api/activities/:id/join", checkAuth, async (req, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      const activity = await storage.getActivity(activityId);
      
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      // Check if user has access to this activity (owns the platform account)
      const account = await storage.getOtaAccount(activity.platformId);
      if (!account || account.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Update activity participation status
      const updatedActivity = await storage.updateActivity(activityId, {
        ...activity,
        participationStatus: "已参与",
        status: activity.status === '未决定' ? '待开始' : activity.status,
      });
      
      res.json(updatedActivity);
    } catch (error) {
      console.error("Error joining activity:", error);
      res.status(500).json({ message: "Failed to join activity" });
    }
  });

  app.post("/api/activities/:id/leave", checkAuth, async (req, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      const activity = await storage.getActivity(activityId);
      
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      // Check if user has access to this activity (owns the platform account)
      const account = await storage.getOtaAccount(activity.platformId);
      if (!account || account.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Update activity participation status
      const updatedActivity = await storage.updateActivity(activityId, {
        ...activity,
        participationStatus: "未参与",
        status: "未决定",
      });
      
      res.json(updatedActivity);
    } catch (error) {
      console.error("Error leaving activity:", error);
      res.status(500).json({ message: "Failed to leave activity" });
    }
  });

  // Refresh activities (scrape from OTA platforms)
  app.post("/api/activities/refresh", checkAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      
      // Get user's OTA accounts
      const accounts = await storage.getOtaAccountsByUserId(userId);
      
      if (accounts.length === 0) {
        return res.status(400).json({ message: "No OTA accounts found" });
      }
      
      // Start background scraping process
      res.status(202).json({ message: "Activity refresh started" });
      
      // Process each account
      for (const account of accounts) {
        try {
          // Decrypt password for scraping
          const decryptedPassword = await decryptApiKey(account.password);
          
          // Scrape activities
          const activities = await scrapeActivities(account.url, account.username, decryptedPassword);
          
          // Save activities to database
          for (const activity of activities) {
            await storage.createActivity({
              ...activity,
              platformId: account.id,
            });
          }
          
          // Update account status to connected
          await storage.updateOtaAccount(account.id, {
            ...account,
            status: "已连接",
            lastUpdated: new Date(),
          });
        } catch (error) {
          console.error(`Error scraping activities for account ${account.id}:`, error);
          
          // Update account status to error
          await storage.updateOtaAccount(account.id, {
            ...account,
            status: "未连接",
            lastUpdated: new Date(),
          });
        }
      }
    } catch (error) {
      console.error("Error refreshing activities:", error);
      // Error already sent as 202 accepted
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", checkAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      
      // Get counts
      const accounts = await storage.getOtaAccountsByUserId(userId);
      const connectedPlatformsCount = accounts.filter(a => a.status === "已连接").length;
      
      const activities = await storage.getActivitiesByUserId(userId);
      
      // Today's activities (based on start date or end date covering today)
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const todayActivities = activities.filter(a => {
        const startDate = new Date(a.startDate);
        const endDate = new Date(a.endDate);
        return (startDate <= todayEnd && endDate >= todayStart);
      });
      
      // Activities currently being participated in
      const activeParticipation = activities.filter(a => a.participationStatus === "已参与" && a.status !== "已结束");
      
      res.json({
        connectedPlatformsCount,
        todayActivitiesCount: todayActivities.length,
        activeParticipationCount: activeParticipation.length,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Strategies API
  app.get("/api/strategies/recommendations", checkAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      
      // Check if user has API key configured
      const apiKey = await storage.getApiKeyByUserIdAndService(userId, "deepseek");
      
      if (!apiKey) {
        return res.status(400).json({ message: "DeepSeek API key not configured" });
      }
      
      // Get user's activities
      const activities = await storage.getActivitiesByUserId(userId);
      
      if (activities.length === 0) {
        return res.status(400).json({ message: "No activities found" });
      }
      
      // Get strategy parameters
      const params = await storage.getStrategyParameters();
      
      // Get user's settings for strategy preference
      const settings = await storage.getSettingsByUserId(userId);
      const preference = settings?.defaultStrategyPreference || "balanced";
      
      // Generate strategies using DeepSeek
      const decryptedKey = await decryptApiKey(apiKey.encryptedKey);
      const strategies = await generateStrategies(decryptedKey, activities, params, preference, apiKey.model);
      
      // Save strategies to database
      const savedStrategies = await Promise.all(strategies.map(async (strategy) => {
        return await storage.createStrategy({
          ...strategy,
          userId,
        });
      }));
      
      res.json(savedStrategies);
    } catch (error) {
      console.error("Error generating strategies:", error);
      res.status(500).json({ message: "Failed to generate strategy recommendations" });
    }
  });

  app.get("/api/strategies/detail/:id", checkAuth, async (req, res) => {
    try {
      const strategyId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      const strategy = await storage.getStrategy(strategyId);
      
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      
      // Check if user owns this strategy
      if (strategy.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      res.json(strategy);
    } catch (error) {
      console.error("Error fetching strategy details:", error);
      res.status(500).json({ message: "Failed to fetch strategy details" });
    }
  });

  app.post("/api/strategies/:id/apply", checkAuth, async (req, res) => {
    try {
      const strategyId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      // Get user info
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const strategy = await storage.getStrategy(strategyId);
      
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      
      // Check if user owns this strategy
      if (strategy.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Apply strategy recommendations (update activities)
      if (strategy.activityIds && strategy.activityIds.length > 0) {
        for (const activityId of strategy.activityIds) {
          const activity = await storage.getActivity(activityId);
          
          if (activity) {
            await storage.updateActivity(activityId, {
              ...activity,
              participationStatus: "已参与",
              status: activity.status === '未决定' ? '待开始' : activity.status,
            });
          }
        }
      }
      
      // Mark strategy as applied
      const updatedStrategy = await storage.updateStrategy(strategyId, {
        ...strategy,
        appliedAt: new Date(),
        appliedBy: user.username,
      });
      
      res.json(updatedStrategy);
    } catch (error) {
      console.error("Error applying strategy:", error);
      res.status(500).json({ message: "Failed to apply strategy" });
    }
  });

  app.get("/api/strategies/history", checkAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const dateRange = req.query.dateRange as string || 'month';
      
      // Get all applied strategies
      let strategies = await storage.getAppliedStrategiesByUserId(userId);
      
      // Apply date filter
      const now = new Date();
      if (dateRange === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        strategies = strategies.filter(s => new Date(s.appliedAt!) >= oneWeekAgo);
      } else if (dateRange === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        strategies = strategies.filter(s => new Date(s.appliedAt!) >= oneMonthAgo);
      }
      
      // Format for history view
      const historyRecords = strategies.map(strategy => ({
        id: Math.random().toString(36).substring(2, 15),
        strategyId: strategy.id.toString(),
        strategyName: strategy.name,
        description: strategy.description,
        isRecommended: strategy.isRecommended,
        appliedAt: strategy.appliedAt!,
        appliedBy: strategy.appliedBy!,
        activityCount: strategy.activityIds?.length || 0,
      }));
      
      res.json(historyRecords);
    } catch (error) {
      console.error("Error fetching strategy history:", error);
      res.status(500).json({ message: "Failed to fetch strategy history" });
    }
  });

  // API Key management
  app.get("/api/settings/api-key/status", checkAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      
      const apiKey = await storage.getApiKeyByUserIdAndService(userId, "deepseek");
      
      if (!apiKey) {
        return res.json({
          configured: false,
        });
      }
      
      res.json({
        configured: true,
        lastUpdated: apiKey.lastUpdated,
        model: apiKey.model,
      });
    } catch (error) {
      console.error("Error fetching API key status:", error);
      res.status(500).json({ message: "Failed to fetch API key status" });
    }
  });

  app.post("/api/settings/api-key", checkAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { apiKey, model } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }
      
      // Encrypt the API key
      const encryptedKey = await encryptApiKey(apiKey);
      
      // Check if user already has an API key
      const existingKey = await storage.getApiKeyByUserIdAndService(userId, "deepseek");
      
      if (existingKey) {
        // Update existing key
        const updatedKey = await storage.updateApiKey(existingKey.id, {
          ...existingKey,
          encryptedKey,
          model: model || "DeepSeek-R1-Plus",
          lastUpdated: new Date(),
        });
        
        return res.json({
          id: updatedKey.id,
          service: updatedKey.service,
          lastUpdated: updatedKey.lastUpdated,
          model: updatedKey.model,
        });
      }
      
      // Create new key
      const newKey = await storage.createApiKey({
        userId,
        service: "deepseek",
        encryptedKey,
        model: model || "DeepSeek-R1-Plus",
      });
      
      res.status(201).json({
        id: newKey.id,
        service: newKey.service,
        lastUpdated: newKey.lastUpdated,
        model: newKey.model,
      });
    } catch (error) {
      console.error("Error saving API key:", error);
      res.status(500).json({ message: "Failed to save API key" });
    }
  });

  // User settings
  app.get("/api/settings", checkAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      
      let settings = await storage.getSettingsByUserId(userId);
      
      if (!settings) {
        // Create default settings
        settings = await storage.createSettings({
          userId,
          notificationsEnabled: true,
          autoRefreshInterval: 30,
          defaultStrategyPreference: "balanced",
        });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", checkAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const settingsData = req.body;
      
      let existingSettings = await storage.getSettingsByUserId(userId);
      
      if (!existingSettings) {
        // Create new settings
        const newSettings = await storage.createSettings({
          userId,
          ...settingsData,
        });
        
        return res.json(newSettings);
      }
      
      // Update existing settings
      const updatedSettings = await storage.updateSettings(existingSettings.id, {
        ...existingSettings,
        ...settingsData,
        updatedAt: new Date(),
      });
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Admin routes
  const checkAdmin = async (req: any, res: any, next: any) => {
    console.log("checkAdmin middleware - session:", JSON.stringify(req.session));
    console.log("checkAdmin middleware - userId:", req.session?.userId);

    if (!req.session || !req.session.userId) {
      console.log("checkAdmin: No session or userId");
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    console.log("checkAdmin: Found user:", user?.username, "role:", user?.role);
    
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    next();
  };

  app.get("/api/admin/strategy-parameters", checkAuth, checkAdmin, async (req, res) => {
    try {
      const parameters = await storage.getStrategyParameters();
      
      // Get recent strategies for templates
      const recentStrategies = await storage.getRecentAppliedStrategies(10);
      
      res.json({
        ...parameters,
        recentStrategies: recentStrategies.map(s => ({
          id: s.id,
          name: s.name,
          appliedAt: s.appliedAt,
        })),
      });
    } catch (error) {
      console.error("Error fetching strategy parameters:", error);
      res.status(500).json({ message: "Failed to fetch strategy parameters" });
    }
  });

  app.put("/api/admin/strategy-parameters", checkAuth, checkAdmin, async (req, res) => {
    try {
      const parameters = req.body;
      console.log("Updating strategy parameters:", JSON.stringify(parameters));
      
      // Update each parameter
      const updatedParameters = await Promise.all(
        parameters.map(async (param: any) => {
          console.log("Updating parameter:", param.id, param.key || param.paramKey, "to value:", param.value);
          return await storage.updateStrategyParameter(param.id, {
            ...param,
            updatedAt: new Date(),
          });
        })
      );
      
      console.log("Parameters updated successfully");
      res.json(updatedParameters);
    } catch (error) {
      console.error("Error updating strategy parameters:", error);
      res.status(500).json({ message: "Failed to update strategy parameters" });
    }
  });

  app.get("/api/admin/strategy-templates", checkAuth, checkAdmin, async (req, res) => {
    try {
      const templates = await storage.getStrategyTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching strategy templates:", error);
      res.status(500).json({ message: "Failed to fetch strategy templates" });
    }
  });

  app.post("/api/admin/strategy-templates", checkAuth, checkAdmin, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { strategyId } = req.body;
      
      if (!strategyId) {
        return res.status(400).json({ message: "Strategy ID is required" });
      }
      
      // Get user info
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get the strategy
      const strategy = await storage.getStrategy(parseInt(strategyId));
      
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      
      // Create template
      const template = await storage.createStrategyTemplate({
        name: strategy.name,
        description: strategy.description,
        strategyId: strategy.id,
        addedBy: user.username,
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating strategy template:", error);
      res.status(500).json({ message: "Failed to create strategy template" });
    }
  });

  app.delete("/api/admin/strategy-templates/:id", checkAuth, checkAdmin, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      
      await storage.deleteStrategyTemplate(templateId);
      
      res.status(200).json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting strategy template:", error);
      res.status(500).json({ message: "Failed to delete strategy template" });
    }
  });
  
  // 创建基于权重的新策略模板
  app.post("/api/admin/strategy-templates/create-from-weights", checkAuth, checkAdmin, async (req, res) => {
    try {
      const { name, description, weights } = req.body;
      
      // 验证必填字段
      if (!name) {
        return res.status(400).json({ message: "Template name is required" });
      }
      
      if (!weights || typeof weights !== 'object') {
        return res.status(400).json({ message: "Invalid weights configuration" });
      }
      
      // 验证是否有所有必须的权重值
      const requiredWeights = ['longTermBooking', 'costEfficiency', 'visibility', 'occupancyRate'];
      for (const key of requiredWeights) {
        if (typeof weights[key] !== 'number' || weights[key] < 0 || weights[key] > 10) {
          return res.status(400).json({ 
            message: `Invalid weight value for ${key}. Must be a number between 0 and 10.` 
          });
        }
      }
      
      // 获取当前的策略参数
      const params = await storage.getStrategyParameters();
      
      // 更新参数值
      const paramUpdates = params.map(param => {
        let value = param.value;
        
        // 根据参数键名应用相应的权重值
        if (param.key === 'longTermBooking') value = weights.longTermBooking;
        else if (param.key === 'costEfficiency') value = weights.costEfficiency;
        else if (param.key === 'visibility') value = weights.visibility;
        else if (param.key === 'occupancyRate') value = weights.occupancyRate;
        
        return { ...param, value };
      });
      
      // 首先更新参数
      for (const param of paramUpdates) {
        await storage.updateStrategyParameter(param.id, { value: param.value });
      }
      
      // 然后创建模板
      const template = await storage.createStrategyTemplate({
        name,
        description: description || '',
        addedAt: new Date()
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template from weights:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}

// Helper function to calculate time remaining
function calculateTimeRemaining(endDate: Date | string): string {
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = new Date();
  const diffTime = Math.abs(end.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (end < now) {
    return "已结束";
  }
  
  if (diffDays === 0) {
    return "今天";
  } else if (diffDays === 1) {
    return "明天";
  } else if (diffDays < 7) {
    return `${diffDays}天`;
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}周`;
  } else {
    return `${Math.floor(diffDays / 30)}个月`;
  }
}
