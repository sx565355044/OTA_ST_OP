import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import { postgresStorage as storage } from "./storage-pg";
import { comparePassword } from "./utils/encryption";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// 扩展请求类型
interface AuthRequest extends Request {
  user?: any;
  login(user: any, callback: (err: any) => void): void;
  logout(callback: (err: any) => void): void;
  isAuthenticated(): boolean;
}

export function setupAuth(app: Express) {
  // 设置 Passport.js 认证（必须在session中间件之后设置）
  app.use(passport.initialize());
  app.use(passport.session());

  // 配置本地策略
  passport.use(
    new LocalStrategy(async (username: string, password: string, done: any) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid credentials" });
        }
        
        // 检查密码
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid credentials" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  // 序列化和反序列化用户对象
  passport.serializeUser((user: any, done: any) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done: any) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // 注册路由
  app.post("/api/register", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;
      
      // 检查用户名是否已存在
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // 创建新用户
      const newUser = await storage.createUser({
        username,
        password,
        role: req.body.role || 'user',
        hotel: req.body.hotel || null
      });

      // 自动登录
      req.login(newUser, (err) => {
        if (err) return next(err);
        
        // 设置会话中的userId (双重保险)
        req.session.userId = newUser.id;
        
        // 返回用户信息（不包含密码）
        const { password: _, ...userInfo } = newUser;
        return res.status(201).json(userInfo);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req: AuthRequest, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        
        // 设置会话中的userId (双重保险)
        req.session.userId = user.id;
        
        console.log("Login success, session ID:", req.session.id);
        console.log("User ID in session:", req.session.userId);
        console.log("User authenticated:", req.isAuthenticated());
        console.log("Passport session:", req.session.passport);
        
        // 返回用户信息（不包含密码）
        const { password: _, ...userInfo } = user;
        return res.status(200).json(userInfo);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: AuthRequest, res: Response, next: NextFunction) => {
    // 清除会话中的userId
    if (req.session) {
      req.session.userId = undefined;
    }
    
    req.logout((err) => {
      if (err) return next(err);
      
      // 清除cookie
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            return res.status(500).json({ message: "Failed to logout" });
          }
          res.clearCookie("connect.sid");
          return res.status(200).json({ message: "Logged out successfully" });
        });
      } else {
        return res.status(200).json({ message: "Logged out successfully" });
      }
    });
  });

  app.get("/api/user", (req: AuthRequest, res: Response) => {
    console.log("GET /api/user request received");
    console.log("Session:", req.session);
    console.log("User ID in session:", req.session?.userId);
    console.log("isAuthenticated:", req.isAuthenticated());
    console.log("passport:", req.session?.passport);
    
    if (req.isAuthenticated()) {
      console.log("User is authenticated via passport");
      const { password: _, ...userInfo } = req.user;
      return res.status(200).json(userInfo);
    } else if (req.session && req.session.userId) {
      console.log("User is authenticated via session userId");
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
      console.log("No user authentication found");
      return res.status(401).json({ message: "Not authenticated" });
    }
  });
}