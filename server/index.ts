import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import { postgresStorage } from "./storage-pg";
import MemoryStore from "memorystore";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config();

// 声明session中的userId和passport
declare module 'express-session' {
  interface SessionData {
    userId: number;
    passport?: {
      user: number | string;
    };
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 根据环境变量决定使用内存存储还是 PostgreSQL 存储
const usePostgres = process.env.USE_POSTGRES === "true";

// 设置 Session 配置
const sessionSecret = process.env.SESSION_SECRET || "otainsight_secret_key";
const sessionConfig: session.SessionOptions = {
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === "production", // 生产环境中使用 HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/'
  }
};

// 添加会话存储
const MemoryStoreSession = MemoryStore(session);
if (usePostgres) {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required when USE_POSTGRES=true");
    throw new Error("DATABASE_URL is required when USE_POSTGRES=true");
  }
  sessionConfig.store = postgresStorage.sessionStore;
  console.log("Using PostgreSQL session store");
  console.log("Database connection string available:", !!process.env.DATABASE_URL);
} else {
  sessionConfig.store = new MemoryStoreSession({ checkPeriod: 86400000 });
  console.log("Using Memory session store");
}

// 应用会话中间件
app.use(session(sessionConfig));

// 设置uploads目录为静态资源目录
app.use('/uploads', express.static('uploads'));

// 重要: 移除passport的初始化，确保只在setupAuth中初始化一次
// Passport初始化将在registerRoutes/setupAuth中完成

// 添加调试中间件
app.use((req, res, next) => {
  console.log("Session ID:", req.session.id);
  console.log("Session User ID:", req.session.userId);
  console.log("Is Authenticated:", req.isAuthenticated?.());
  console.log("Passport session:", (req.session as any).passport);
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use environment variable for port with fallback to 3000
  // this serves both the API and the client
  const port = process.env.PORT || 3000;

  // Log port configuration for debugging
  log(`Authentication setup with ALLOW_ANY_PASSWORD=${process.env.ALLOW_ANY_PASSWORD || false}`);
  log(`Using PostgreSQL: ${usePostgres}`);
  log(`Server configured to listen on port ${port}`);
  server.listen({
    port,
    host: "0.0.0.0", // Listen on all interfaces
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();