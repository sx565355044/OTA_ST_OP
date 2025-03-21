import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage"; // Use the default storage
import { encryptPassword, comparePassword, encryptApiKey, decryptApiKey } from "./utils/encryption";
import { scrapeActivities } from "./utils/scraper";
import { generateStrategies } from "./services/deepseek";
import { ctripApiLoginService } from "./services/ctrip-api-login";
import { processMultipleImages, processImage } from "./utils/ocr-processor";
import { vectorStorage } from "./utils/vector-storage";
import { deepseekOcrService, DeepSeekOcrService } from "./services/deepseek-ocr";
import { z } from "zod";
import { setupAuth } from "./auth";
import session from 'express-session';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
  login: any; // Using any to bypass type incompatibilities
  logout: any; // Using any to bypass type incompatibilities
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
} from "@shared/schema-mysql";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize HTTP server
  const httpServer = createServer(app);
  
  // 确保上传目录存在
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // 配置multer用于文件上传
  const multerStorage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function(req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
  
  const upload = multer({ 
    storage: multerStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 限制文件大小为5MB
    },
    fileFilter: function(req, file, cb) {
      // 只接受图片文件
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('只允许上传图片文件!'), false);
      }
      cb(null, true);
    }
  });
  
  // 设置认证
  setupAuth(app);

  // Ctrip Authentication Routes
  app.post("/api/ctrip-auth/init", async (req: AuthRequest, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      // 初始化携程API登录服务
      ctripApiLoginService.close(); // 确保关闭之前的会话
      await ctripApiLoginService.initialize();
      
      res.json({
        success: true,
        message: "Ctrip login session initialized",
        state: ctripApiLoginService.getLoginState()
      });
    } catch (error) {
      console.error("Error initializing Ctrip login:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to initialize Ctrip login session",
        state: ctripApiLoginService.getLoginState()
      });
    }
  });
  
  app.post("/api/ctrip-auth/credentials", async (req: AuthRequest, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required"
      });
    }
    
    try {
      // 使用API登录服务进行登录
      const loginResult = await ctripApiLoginService.login(username, password);
      const currentState = ctripApiLoginService.getLoginState();
      
      if (loginResult.success) {
        if (loginResult.requiresSms) {
          // 需要短信验证
          // 自动发送短信验证码
          const sendSmsResult = await ctripApiLoginService.sendSmsCode();
          
          res.json({
            success: true,
            message: "SMS verification required",
            state: currentState,
            requiresSms: true,
            phoneNumber: loginResult.phoneNumber
          });
        } else {
          // 如果已经成功登录（无需短信验证）
          const sessionData = ctripApiLoginService.getEncryptedSessionData();
          
          res.json({
            success: true,
            message: "Successfully logged in without SMS verification",
            state: currentState,
            requiresSms: false,
            sessionData
          });
        }
      } else {
        // 登录失败
        res.json({
          success: false,
          message: loginResult.message || "Login failed",
          state: currentState
        });
      }
    } catch (error) {
      console.error("Error submitting Ctrip credentials:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to submit credentials",
        state: ctripApiLoginService.getLoginState()
      });
    }
  });
  
  app.post("/api/ctrip-auth/verify-sms", async (req: AuthRequest, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const { smsCode } = req.body;
    
    if (!smsCode) {
      return res.status(400).json({
        success: false,
        message: "SMS verification code is required"
      });
    }
    
    try {
      // 验证短信验证码
      const verifyResult = await ctripApiLoginService.verifySmsCode(smsCode);
      const currentState = ctripApiLoginService.getLoginState();
      
      if (verifyResult.success) {
        // 获取会话数据用于后续操作
        const sessionData = ctripApiLoginService.getEncryptedSessionData();
        
        res.json({
          success: true,
          message: "Successfully verified SMS code and logged in",
          state: currentState,
          sessionData
        });
      } else {
        res.json({
          success: false,
          message: verifyResult.message || "SMS verification failed",
          state: currentState
        });
      }
    } catch (error) {
      console.error("Error verifying SMS code:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to verify SMS code",
        state: ctripApiLoginService.getLoginState()
      });
    }
  });
  
  app.post("/api/ctrip-auth/close", async (req: AuthRequest, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      ctripApiLoginService.close();
      
      res.json({
        success: true,
        message: "Ctrip login session closed"
      });
    } catch (error) {
      console.error("Error closing Ctrip login session:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to close Ctrip login session"
      });
    }
  });

  // Authentication endpoints are now handled in auth.ts



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

  app.post("/api/accounts", checkAuth, upload.array('screenshots', 10), async (req, res) => {
    try {
      const userId = req.session.userId;
      const accountData = req.body;
      const screenshotFiles = req.files as Express.Multer.File[] || [];
      
      // 验证是否有上传的截图
      if (screenshotFiles.length === 0) {
        return res.status(400).json({ 
          message: "至少需要上传一张平台截图" 
        });
      }
      
      // 确保上传目录存在
      const screenshotsDir = path.join(process.cwd(), 'uploads', `account_${Date.now()}`);
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      
      // 获取所有截图路径
      const allScreenshotPaths = screenshotFiles.map(file => file.path);
      
      // 保存包含多图路径的JSON数据
      const screenshotsDataPath = path.join(screenshotsDir, 'screenshots.json');
      fs.writeFileSync(screenshotsDataPath, JSON.stringify({
        paths: allScreenshotPaths,
        uploadedAt: new Date()
      }));
      
      // 存储每个截图的平台检测结果
      const platformDetectionResults = [];
      const createdAccounts = [];
      const platformSet = new Set(); // 用于跟踪已创建的平台，避免重复
      
      // 逐个处理每张截图
      for (let i = 0; i < screenshotFiles.length; i++) {
        const file = screenshotFiles[i];
        
        try {
          // 先输出匹配度信息用于调试
          console.log(`处理第 ${i+1} 张图片...`);
          
          // 使用try-catch包装处理过程，确保一张图片的错误不会影响整个流程
          let result;
          try {
            result = await processImage(file.path);
            console.log(`第 ${i+1} 张图片处理成功，提取文本长度: ${result.text.length}`);
            platformDetectionResults.push(result);
          } catch (ocrError) {
            console.error(`处理第 ${i+1} 张图片时出错:`, ocrError);
            // 跳过这张图片的处理，继续下一张
            continue;
          }
          
          // 从OCR结果中提取平台信息
          const detectedPlatform = result?.detectedPlatform;
          console.log(`第 ${i+1} 张图片的平台检测结果:`, detectedPlatform);
          
          // 只有当置信度达到阈值且平台尚未创建时才创建新账户
          if (detectedPlatform && detectedPlatform.confidence >= 10 && !platformSet.has(detectedPlatform.code)) {
            // 记录此平台已被处理
            platformSet.add(detectedPlatform.code);
            
            const platformName = detectedPlatform.name;
            console.log(`平台自动识别结果: ${JSON.stringify(detectedPlatform)}`);
            
            // 创建OTA账户的基本数据
            const accountInfo = {
              name: platformName, // 使用自动检测的平台名称
              url: "vector_data", // 使用新占位符，表示我们使用向量数据存储
              accountType: accountData.accountType || accountData.account_type || "酒店",
              userId,
              status: "处理中", // 初始状态为处理中
              username: "ocr_data", // 使用新默认值
              password: "vector_storage", // 占位密码
              shortName: platformName.length > 2 ? platformName.substring(0, 2) : platformName, // 使用平台名称的缩写
              screenshotPath: file.path, // 保存当前截图路径为主截图
            };
            
            try {
              // 验证账户数据
              const validatedData = insertOtaAccountSchema.parse(accountInfo);
              
              // 创建账户
              const account = await storage.createOtaAccount(validatedData);
              createdAccounts.push(account);
              
              // 异步处理当前图片的OCR和创建活动
              (async () => {
                try {
                  console.log(`开始处理账户 ${account.id} 的图片...`);
                  
                  // 将OCR结果转换为向量数据并存储
                  const vectorData = await vectorStorage.storeOcrResult(result, account.id, [file.path]);
                  
                  // 更新账户状态为已连接
                  await storage.updateOtaAccount(account.id, {
                    status: "已连接",
                    lastUpdated: new Date()
                  });
                  
                  console.log(`账户 ${account.id} 的截图处理完成，成功创建向量数据: ${vectorData.id}`);
                  
                  // 从OCR结果创建活动
                  try {
                    // 处理OCR结果并创建活动
                    await processOcrAndCreateActivity(account.id, [file.path], userId);
                    console.log(`已从OCR结果为账户 ${account.id} 创建了活动`);
                  } catch (activityError) {
                    console.error(`从OCR结果创建活动失败:`, activityError);
                  }
                } catch (error) {
                  console.error(`处理账户 ${account.id} 的截图时出错:`, error);
                  
                  // 更新账户状态为错误
                  await storage.updateOtaAccount(account.id, {
                    status: "处理失败",
                    lastUpdated: new Date()
                  });
                }
              })();
            } catch (error) {
              console.error(`创建平台 ${platformName} 的账户失败:`, error);
            }
          } else if (detectedPlatform) {
            console.log(`平台 ${detectedPlatform.name} 置信度不足或已创建，跳过`);
          } else {
            console.log(`未检测到平台信息，跳过第 ${i+1} 张图片`);
          }
        } catch (error) {
          console.error(`处理第 ${i+1} 张图片时出错:`, error);
        }
      }
      
      // 返回创建的账户信息
      if (createdAccounts.length > 0) {
        const accountsInfo = createdAccounts.map(account => {
          const { password: _, ...info } = account;
          return info;
        });
        
        return res.status(201).json({
          accounts: accountsInfo,
          message: `成功创建 ${accountsInfo.length} 个平台账户，截图正在后台处理中`,
          screenshotCount: screenshotFiles.length
        });
      } else {
        return res.status(200).json({
          message: "未能检测到任何有效平台，请尝试上传更清晰的截图",
          screenshotCount: screenshotFiles.length
        });
      }
    } catch (error) {
      console.error("Error creating account:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "无效的账户数据", errors: error.errors });
      }
      
      res.status(500).json({ message: "创建账户失败" });
    }
  });

  app.put("/api/accounts/:id", checkAuth, upload.array('screenshots', 5), async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const userId = req.session.userId;
      const accountData = req.body;
      const screenshotFiles = req.files as Express.Multer.File[] || [];
      
      // 检查账户是否存在且属于用户
      const existingAccount = await storage.getOtaAccount(accountId);
      
      if (!existingAccount) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      if (existingAccount.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // 准备更新数据
      const updateData: any = {
        accountType: accountData.accountType || accountData.account_type || existingAccount.accountType,
        userId,
      };
      
      // 如果表单中提供了平台名称和缩写，使用表单中的值
      if (accountData.name) {
        updateData.name = accountData.name;
      } else if (existingAccount.name) {
        updateData.name = existingAccount.name;
      }
      
      if (accountData.shortName) {
        updateData.shortName = accountData.shortName;
      } else if (existingAccount.shortName) {
        updateData.shortName = existingAccount.shortName;
      }
      
      // 如果上传了新的截图，尝试识别平台名称（仅当没有手动指定名称时）
      if (screenshotFiles.length > 0 && !accountData.name) {
        try {
          // 从第一张截图中检测平台信息
          const platformDetectionResult = await processImage(screenshotFiles[0].path);
          const detectedPlatform = platformDetectionResult?.detectedPlatform;
          
          // 如果检测到平台且置信度足够高，更新平台名称
          if (detectedPlatform && detectedPlatform.confidence >= 10) {
            updateData.name = detectedPlatform.name;
            // 只有当没有手动指定缩写时才自动生成
            if (!accountData.shortName) {
              updateData.shortName = detectedPlatform.name.length > 2 
                ? detectedPlatform.name.substring(0, 2) 
                : detectedPlatform.name;
            }
            
            console.log(`账户更新: 检测到新的平台名称 ${detectedPlatform.name}，置信度: ${detectedPlatform.confidence.toFixed(2)}%`);
          }
        } catch (error) {
          console.error("检测平台名称时出错:", error);
          // 检测失败时不更新平台名称，保持原有名称
        }
      }
      
      // 如果上传了新的截图
      if (screenshotFiles.length > 0) {
        // 确保上传目录存在
        const screenshotsDir = path.join(process.cwd(), 'uploads', `account_${accountId}_${Date.now()}`);
        if (!fs.existsSync(screenshotsDir)) {
          fs.mkdirSync(screenshotsDir, { recursive: true });
        }
        
        // 提取主截图路径和所有截图路径
        const mainScreenshotPath = screenshotFiles[0].path;
        const allScreenshotPaths = screenshotFiles.map(file => file.path);
        
        // 保存包含多图路径的JSON数据
        const screenshotsDataPath = path.join(screenshotsDir, 'screenshots.json');
        fs.writeFileSync(screenshotsDataPath, JSON.stringify({
          paths: allScreenshotPaths,
          uploadedAt: new Date()
        }));
        
        // 更新主截图路径和状态
        updateData.screenshotPath = mainScreenshotPath;
        updateData.status = "处理中";
        
        // 异步处理OCR并创建活动
        (async () => {
          try {
            console.log(`开始处理账户 ${accountId} 的 ${screenshotFiles.length} 张图片...`);
            
            // 处理所有截图并提取数据
            const ocrResult = await processMultipleImages(allScreenshotPaths);
            
            // 将OCR结果转换为向量数据并存储
            const vectorData = await vectorStorage.storeOcrResult(ocrResult, accountId, allScreenshotPaths);
            
            // 更新账户状态为已连接
            await storage.updateOtaAccount(accountId, {
              status: "已连接",
              lastUpdated: new Date()
            });
            
            console.log(`账户 ${accountId} 的截图处理完成，成功更新向量数据: ${vectorData.id}`);
            
            // 从OCR结果创建活动
            try {
              // 处理OCR结果并创建活动
              await processOcrAndCreateActivity(accountId, allScreenshotPaths, userId);
              console.log(`已从OCR结果为账户 ${accountId} 创建了活动`);
            } catch (activityError) {
              console.error(`从OCR结果创建活动失败:`, activityError);
            }
          } catch (error) {
            console.error(`处理账户 ${accountId} 的截图时出错:`, error);
            
            // 更新账户状态为错误
            await storage.updateOtaAccount(accountId, {
              status: "处理失败",
              lastUpdated: new Date()
            });
          }
        })();
      }
      
      // 执行更新
      const updatedAccount = await storage.updateOtaAccount(accountId, updateData);
      
      // 不要返回密码和会话数据
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

  // 平台检测测试API (无需认证，用于测试)
  app.post("/api/test/detectplatform", upload.single('screenshot'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "没有上传文件" });
      }
      
      console.log("收到文件上传:", req.file.originalname, req.file.path);
      
      // 简化版的平台识别测试，避免完整OCR处理
      // 根据文件名来模拟识别结果
      const filename = req.file.originalname.toLowerCase();
      let detectedPlatform = {
        name: "未知平台",
        code: "unknown",
        confidence: 0
      };
      
      if (filename.includes("ctrip") || filename.includes("携程")) {
        detectedPlatform = { name: "携程", code: "ctrip", confidence: 90 };
      } else if (filename.includes("meituan") || filename.includes("美团")) {
        detectedPlatform = { name: "美团", code: "meituan", confidence: 90 };
      } else if (filename.includes("fliggy") || filename.includes("飞猪")) {
        detectedPlatform = { name: "飞猪", code: "fliggy", confidence: 90 };
      } else {
        // 实际场景下，会对图片内容进行OCR处理和平台识别
        console.log("文件名中未包含明确的平台关键词，测试版默认为携程平台");
        detectedPlatform = { name: "携程", code: "ctrip", confidence: 50 };
      }
      
      // 返回平台识别结果
      res.status(200).json({
        success: true,
        filePath: req.file.path,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        detectedPlatform: detectedPlatform,
        extractedData: {
          activityName: "测试活动",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          discount: "8折",
          commissionRate: "5%"
        }
      });
      
    } catch (error) {
      console.error("Error processing platform detection:", error);
      res.status(500).json({ 
        success: false,
        message: "处理平台识别失败", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
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

  // 已删除活动参与和离开的相关API路由，因为系统现在专注于策略生成，不再支持活动参与操作

  // Refresh activities (scrape from OTA platforms)
  // 上传活动截图API - 支持多图OCR识别和自动识别平台
  app.post("/api/activities/screenshots", checkAuth, upload.array('screenshots', 10), async (req, res) => {
    try {
      const userId = req.session.userId;
      const { autoOcr = 'true' } = req.body;
      // 移除platformId参数，始终使用自动检测
      const screenshotFiles = req.files as Express.Multer.File[] || [];
      
      if (screenshotFiles.length === 0) {
        return res.status(400).json({ message: "至少需要上传一张活动截图" });
      }
      
      console.log("接收到截图上传请求，开始自动平台识别流程");
      
      // 确保上传目录存在
      const screenshotsDir = path.join(process.cwd(), 'uploads', `activity_${Date.now()}`);
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      
      // 保存所有截图路径
      const allScreenshotPaths = screenshotFiles.map(file => file.path);
      
      // 获取用户的所有OTA平台账号
      const userPlatforms = await storage.getOtaAccountsByUserId(userId as number);
      
      if (userPlatforms.length === 0) {
        return res.status(400).json({ 
          message: "用户没有关联任何OTA平台账号。请先添加平台账号后再上传截图。" 
        });
      }
      
      let selectedPlatform;
      let platformIdInt: number;
      
      // 始终使用自动检测平台功能
      {
        // 从截图中自动识别平台
        console.log("开始自动识别平台...");
        
        // 先进行OCR处理以识别平台
        try {
          console.log("开始处理多张截图以识别平台...");
          let ocrResult;
          
          try {
            ocrResult = await processMultipleImages(allScreenshotPaths);
            console.log("多图OCR处理成功，识别文本长度:", ocrResult.text.length);
          } catch (ocrError) {
            console.error("多图OCR处理失败:", ocrError);
            return res.status(400).json({ 
              message: "截图OCR处理失败，无法识别文本内容。请尝试上传更清晰的图片，或者手动选择平台。",
              error: ocrError instanceof Error ? ocrError.message : "Unknown OCR error"
            });
          }
          
          if (ocrResult.detectedPlatform && ocrResult.detectedPlatform.code !== 'unknown') {
            // 找到平台代码对应的用户平台账号
            const platformCode = ocrResult.detectedPlatform.code;
            const platformName = ocrResult.detectedPlatform.name;
            console.log(`成功识别平台: ${platformName}(${platformCode})，置信度: ${ocrResult.detectedPlatform.confidence.toFixed(2)}%`);
            
            // 在用户的OTA账号中查找匹配的平台
            const matchedPlatform = userPlatforms.find(platform => {
              // 检查名称或URL中是否包含平台代码
              return platform.name.toLowerCase().includes(platformCode) || 
                     (platform.url && platform.url.toLowerCase().includes(platformCode));
            });
            
            if (matchedPlatform) {
              selectedPlatform = matchedPlatform;
              platformIdInt = matchedPlatform.id;
              console.log(`自动识别到平台：${platformName}，匹配到用户平台账号ID: ${platformIdInt}`);
            } else {
              // 如果没有匹配到，使用第一个平台
              selectedPlatform = userPlatforms[0];
              platformIdInt = selectedPlatform.id;
              console.log(`识别到平台${platformName}但未找到匹配账号，使用默认平台ID: ${platformIdInt}`);
            }
          } else {
            // 未能识别平台，使用第一个平台
            selectedPlatform = userPlatforms[0];
            platformIdInt = selectedPlatform.id;
            console.log(`未能识别平台，使用默认平台ID: ${platformIdInt}`);
          }
        } catch (error) {
          console.error("平台自动识别失败:", error);
          // 识别失败，使用第一个平台
          selectedPlatform = userPlatforms[0];
          platformIdInt = selectedPlatform.id;
        }
      }
      
      // 保存包含多图路径和识别到的平台ID的JSON数据
      const screenshotsDataPath = path.join(screenshotsDir, 'screenshots.json');
      fs.writeFileSync(screenshotsDataPath, JSON.stringify({
        paths: allScreenshotPaths,
        platformId: platformIdInt,
        platformName: selectedPlatform.name,
        uploadedAt: new Date()
      }));
      
      // 如果不使用OCR，则直接从表单创建活动
      const useAutoOcr = autoOcr === 'true';
      
      if (!useAutoOcr) {
        try {
          // 从表单数据直接创建活动
          const activityData = {
            userId: userId as number, // 添加用户ID
            name: req.body.name || `手动活动-${Date.now()}`,
            description: req.body.description || "",
            platformId: platformIdInt,
            startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
            endDate: req.body.endDate ? new Date(req.body.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: req.body.status || "未决定",
            participationStatus: "未参与",
            tag: req.body.tag || "手动",
            discount: req.body.discount || "未知",
            commissionRate: req.body.commissionRate || "未知",
            ocrData: JSON.stringify({
              confidence: 0,
              text: "手动录入活动",
              extractedAt: new Date()
            }),
            screenshotPath: allScreenshotPaths[0] || "", // 保存第一张截图作为主截图
          };
          
          // 验证活动数据
          const validatedData = insertActivitySchema.parse(activityData);
          
          // 创建活动
          const activity = await storage.createActivity(validatedData);
          
          return res.status(201).json({
            success: true,
            message: "活动已成功创建",
            processing: false,
            activityId: activity.id
          });
        } catch (error) {
          console.error("Error creating activity from form data:", error);
          return res.status(500).json({ 
            message: "创建活动失败", 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      }
      
      // 返回初始状态，并在后台处理OCR
      res.status(202).json({
        success: true,
        message: "活动截图已接收，正在后台处理中",
        processing: true,
        screenshotCount: screenshotFiles.length
      });
      
      // 在单独的事件循环中处理OCR，避免阻塞服务器
      setTimeout(() => {
        processOcrAndCreateActivity(platformIdInt, allScreenshotPaths, userId).catch(err => {
          console.error(`OCR处理失败:`, err);
        });
      }, 100);
    } catch (error) {
      console.error("Error processing screenshots:", error);
      res.status(500).json({ 
        message: "处理活动截图失败", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
// 辅助函数，用于OCR处理和活动创建，与主请求处理分离
async function processOcrAndCreateActivity(platformId: number, screenshotPaths: string[], userId: number) {
  try {
    console.log(`开始处理平台 ${platformId} 的 ${screenshotPaths.length} 张活动截图...`);
    
    if (screenshotPaths.length === 0) {
      console.error("没有有效的截图路径");
      return;
    }
    
    // 验证所有图片路径是否有效
    const validScreenshotPaths: string[] = [];
    for (const path of screenshotPaths) {
      try {
        if (fs.existsSync(path)) {
          validScreenshotPaths.push(path);
        } else {
          console.warn(`截图路径无效: ${path}`);
        }
      } catch (error) {
        console.warn(`检查截图路径出错: ${path}`, error);
      }
    }
    
    if (validScreenshotPaths.length === 0) {
      console.error("没有有效的截图文件");
      return;
    }
    
    console.log(`有效截图数量: ${validScreenshotPaths.length}`);
    
    // 处理所有截图并提取数据，增加错误处理
    let ocrResult;
    try {
      console.log("开始进行多图OCR处理...");
      ocrResult = await processMultipleImages(validScreenshotPaths);
      console.log("OCR识别成功，文本长度:", ocrResult.text.length);
      console.log("OCR识别结果:", JSON.stringify(ocrResult.extractedData, null, 2));
    } catch (ocrError) {
      console.error("OCR处理失败，使用备用数据:", ocrError);
      // 创建一个基本的OCR结果，避免其他代码失败
      ocrResult = {
        text: "OCR识别失败，无法提取文本内容",
        confidence: 0.1,
        extractedData: {
          activityName: null,
          description: "OCR识别失败，无法提取活动详情",
          startDate: null,
          endDate: null,
          discount: null,
          commissionRate: null,
          status: "未确定",
          tag: "其他",
          platform: null
        }
      };
    }
    
    // 生成默认活动名称 - 使用更好的格式
    const defaultActivityName = `活动${new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '')}`;
    
    // 从OCR结果中提取活动数据，增加错误处理
    const activityData = {
      userId, // 确保用户ID位于最前面
      name: ocrResult.extractedData.activityName || defaultActivityName,
      description: ocrResult.extractedData.description || "通过OCR从截图中提取的活动信息",
      platformId,
      // 提供合理的默认日期处理
      startDate: (() => {
        try {
          return ocrResult.extractedData.startDate ? new Date(ocrResult.extractedData.startDate) : new Date();
        } catch (e) {
          console.warn("开始日期解析错误，使用当前日期", e);
          return new Date();
        }
      })(),
      // 提供合理的默认结束日期处理
      endDate: (() => {
        try {
          return ocrResult.extractedData.endDate 
            ? new Date(ocrResult.extractedData.endDate) 
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 默认30天后
        } catch (e) {
          console.warn("结束日期解析错误，使用30天后", e);
          return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
      })(),
      // 基于开始和结束日期计算合适的活动状态
      status: (() => {
        try {
          const now = new Date();
          const startDate = new Date(ocrResult.extractedData.startDate || new Date());
          const endDate = new Date(ocrResult.extractedData.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
          
          if (startDate > now) {
            return "待开始";
          } else if (endDate < now) {
            return "已结束";
          } else {
            return "进行中";
          }
        } catch (e) {
          console.warn("状态计算错误，使用默认状态", e);
          return ocrResult.extractedData.status || "未确定";
        }
      })(),
      participationStatus: "未参与", // 默认未参与
      tag: ocrResult.extractedData.tag || "其他",
      discount: ocrResult.extractedData.discount || "未知",
      commissionRate: ocrResult.extractedData.commissionRate || "未知",
      ocrData: JSON.stringify({
        extractedData: ocrResult.extractedData,
        confidence: ocrResult.confidence,
        text: ocrResult.text.substring(0, 1000), // 保存更多提取文本，但有限制
        extractedAt: new Date(),
        processedScreenshots: validScreenshotPaths.length
      }),
      screenshotPath: validScreenshotPaths[0] || "", // 保存第一张截图作为主截图
    };
    
    // 验证活动数据
    const validatedData = insertActivitySchema.parse(activityData);
    
    // 创建活动
    const activity = await storage.createActivity(validatedData);
    
    // 将OCR结果转换为向量数据并存储
    const vectorData = await vectorStorage.storeOcrResult(ocrResult, platformId, screenshotPaths);
    
    console.log(`平台 ${platformId} 的活动截图处理完成，成功创建活动ID: ${activity.id}`);
    
    // 更新平台状态
    await storage.updateOtaAccount(platformId, {
      status: "已连接",
      lastUpdated: new Date(),
    });
    
    return activity;
  } catch (error) {
    console.error(`处理平台 ${platformId} 的活动截图时出错:`, error);
    throw error;
  }
  }
  
  // 保留原API接口以兼容性
  app.post("/api/activities/screenshot", checkAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { platformId, activityData } = req.body;
      
      if (!platformId || !activityData) {
        return res.status(400).json({ message: "Platform ID and activity data are required" });
      }
      
      // 验证平台ID是否属于用户
      const platform = await storage.getOtaAccount(platformId);
      if (!platform || platform.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to platform" });
      }
      
      // 处理前端传来的日期字符串
      let processedData = {
        ...activityData,
        platformId,
        status: activityData.status || "未决定",
        participationStatus: activityData.participationStatus || "未参与"
      };
      
      // 将字符串日期转换为日期对象
      if (typeof activityData.startDate === 'string') {
        processedData.startDate = new Date(activityData.startDate);
      }
      
      if (typeof activityData.endDate === 'string') {
        processedData.endDate = new Date(activityData.endDate);
      }
      
      // 验证并创建活动数据
      try {
        const validatedData = insertActivitySchema.parse(processedData);
        
        const activity = await storage.createActivity(validatedData);
        
        // 更新平台状态为已连接
        await storage.updateOtaAccount(platformId, {
          status: "已连接",
          lastUpdated: new Date(),
        });
        
        return res.status(201).json({
          success: true,
          message: "活动数据已通过截图成功添加",
          activity
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "活动数据格式无效", errors: error.errors });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error adding activity from screenshot:", error);
      res.status(500).json({ message: "添加活动数据失败" });
    }
  });

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
      
      // 不再区分参与状态，我们只计算活跃活动的总数
      const activeActivities = activities.filter(a => a.status !== "已结束");
      
      res.json({
        connectedPlatformsCount,
        todayActivitiesCount: todayActivities.length,
        activeActivitiesCount: activeActivities.length, // 使用新名称，表示活跃中的活动数量而不是参与的活动数
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
      
      // 我们不再自动更新活动的参与状态，只记录策略的应用
      console.log(`策略 ${strategyId} 已被应用，但不再自动修改活动参与状态`);
      // 策略包含的活动ID保留用于参考，但不再修改活动状态
      
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
      
      // 获取DeepSeek OCR服务的连接状态
      const connectionStatus = deepseekOcrService.getConnectionStatus();
      
      res.json({
        configured: true,
        lastUpdated: apiKey.lastUpdated,
        model: apiKey.model,
        connection: connectionStatus
      });
    } catch (error) {
      console.error("Error fetching API key status:", error);
      res.status(500).json({ message: "Failed to fetch API key status" });
    }
  });
  
  // 测试DeepSeek API连接
  app.post("/api/settings/api-key/test", checkAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ 
          success: false,
          message: "需要提供API密钥才能测试连接"
        });
      }
      
      // 临时设置API密钥到环境变量（只在当前请求中有效）
      process.env.DEEPSEEK_API_KEY = apiKey;
      
      // 创建一个临时的DeepSeek OCR服务实例用于测试
      const testService = new DeepSeekOcrService();
      
      // 测试连接
      console.log("测试用户提供的DeepSeek API密钥...");
      const isValid = await testService.testConnection();
      
      if (isValid) {
        console.log("DeepSeek API连接测试成功");
        return res.json({
          success: true,
          message: "DeepSeek API连接测试成功，密钥有效"
        });
      } else {
        console.log("DeepSeek API连接测试失败");
        return res.status(400).json({
          success: false,
          message: "DeepSeek API连接测试失败，密钥无效或API服务不可用"
        });
      }
      
    } catch (error) {
      console.error("Error testing API key:", error);
      res.status(500).json({ 
        success: false,
        message: "API密钥测试失败，请检查网络连接或联系管理员" 
      });
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
    console.log("checkAdmin middleware - passport user:", req.user);
    console.log("checkAdmin middleware - isAuthenticated:", req.isAuthenticated?.());
    
    // Get the user ID from the session or passport
    let userId: number | undefined;
    
    // 首先尝试从req.user获取ID（Passport方式）
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      userId = req.user.id;
      console.log("checkAdmin: Found userId via Passport:", userId);
    } 
    // 如果失败，尝试从session中获取
    else if (req.session && req.session.userId) {
      userId = req.session.userId;
      console.log("checkAdmin: Found userId via session:", userId);
    }
    
    if (!userId) {
      console.log("checkAdmin: No userId found in session or passport");
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(userId);
      console.log("checkAdmin: Found user:", user?.username, "role:", user?.role);
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // 将当前获取到的用户ID更新到session中确保同步
      if (req.session) {
        req.session.userId = userId;
      }
      
      next();
    } catch (error) {
      console.error("checkAdmin error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
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
        if (param.paramKey === 'future_booking_weight') value = weights.longTermBooking;
        else if (param.paramKey === 'cost_optimization_weight') value = weights.costEfficiency;
        else if (param.paramKey === 'visibility_optimization_weight') value = weights.visibility;
        else if (param.paramKey === 'daily_occupancy_weight') value = weights.occupancyRate;
        
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
        addedBy: (req as any).user.username,
        strategyId: 0 // 这里使用0表示这是一个手动创建的模板而非基于现有策略
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template from weights:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // 应用策略模板 - 加载模板设置并应用到当前权重
  app.post("/api/admin/strategy-templates/:id/apply", checkAuth, checkAdmin, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      
      // 获取模板
      const template = await storage.getStrategyTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      // 获取当前的策略参数
      const params = await storage.getStrategyParameters();
      
      // 获取模板关联的策略，如果存在的话
      let weights = {
        longTermBooking: 5,
        costEfficiency: 5,
        visibility: 5,
        occupancyRate: 5
      };
      
      // 如果是基于现有策略创建的模板，尝试从存储中获取相关权重
      if (template.strategyId) {
        try {
          const strategy = await storage.getStrategy(template.strategyId);
          if (strategy) {
            // 通过解析策略描述或其他字段尝试提取权重值
            // 这里是一个简化的实现
            // 实际情况可能需要根据您的数据结构调整
            weights = {
              longTermBooking: 6,
              costEfficiency: 7,
              visibility: 6,
              occupancyRate: 5
            };
          }
        } catch (error) {
          console.error("Error retrieving strategy:", error);
          // 继续使用默认权重
        }
      } else {
        // 这是一个手动创建的模板
        // 尝试从模板名称或描述中推断权重，或使用最近一次保存的权重值
        // 这里是一个简化的实现
        // 实际情况可能需要根据您的数据结构调整
        for (const param of params) {
          if (param.paramKey === 'future_booking_weight') weights.longTermBooking = param.value;
          else if (param.paramKey === 'cost_optimization_weight') weights.costEfficiency = param.value;
          else if (param.paramKey === 'visibility_optimization_weight') weights.visibility = param.value;
          else if (param.paramKey === 'daily_occupancy_weight') weights.occupancyRate = param.value;
        }
      }
      
      // 更新参数值
      const paramUpdates = params.map(param => {
        let value = param.value;
        
        // 根据参数键名应用相应的权重值
        if (param.paramKey === 'future_booking_weight') value = weights.longTermBooking;
        else if (param.paramKey === 'cost_optimization_weight') value = weights.costEfficiency;
        else if (param.paramKey === 'visibility_optimization_weight') value = weights.visibility;
        else if (param.paramKey === 'daily_occupancy_weight') value = weights.occupancyRate;
        
        return { id: param.id, value };
      });
      
      // 更新参数
      for (const param of paramUpdates) {
        await storage.updateStrategyParameter(param.id, { value: param.value });
      }
      
      // 返回应用的权重值
      res.status(200).json({ 
        message: "Template applied successfully",
        template,
        weights
      });
    } catch (error) {
      console.error("Error applying template:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // 携程API状态查询
  app.get("/api/ctrip-auth/status", checkAuth, (req, res) => {
    const state = ctripApiLoginService.getLoginState();
    const isLoggedIn = ctripApiLoginService.isLoggedIn();
    
    return res.status(200).json({
      success: true,
      state,
      isLoggedIn
    });
  });
  
  // 路由定义结束

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
