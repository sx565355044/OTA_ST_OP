import { mysqlTable, text, serial, int, boolean, timestamp, json, real } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("manager"),
  hotel: text("hotel"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  hotel: true,
});

// OTA platform accounts
export const otaAccounts = mysqlTable("ota_accounts", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  url: text("url").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  verificationMethod: text("verification_method").default("none"), // 验证方法：none, sms, email, captcha
  phoneNumber: text("phone_number"), // 如果需要手机验证码，存储手机号
  sessionData: text("session_data"), // 存储加密的会话数据，用于API访问
  screenshotPath: text("screenshot_path"), // 存储截图文件路径
  accountType: text("account_type").notNull(),
  status: text("status").notNull().default("未连接"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOtaAccountSchema = createInsertSchema(otaAccounts).pick({
  userId: true,
  name: true,
  shortName: true,
  url: true,
  username: true,
  password: true,
  verificationMethod: true,
  phoneNumber: true,
  sessionData: true,
  screenshotPath: true, 
  accountType: true,
  status: true,
});

// OTA promotion activities
export const activities = mysqlTable("activities", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  platformId: int("platform_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  discount: text("discount").notNull(),
  commissionRate: text("commission_rate").notNull(),
  roomTypes: json("room_types").$type<string[]>(), // 使用JSON类型代替数组类型
  minimumStay: int("minimum_stay"),
  maxBookingWindow: int("max_booking_window"),
  status: text("status").notNull().default("未决定"),
  tag: text("tag"),
  participationStatus: text("participation_status").default("未参与"),
  screenshotPath: text("screenshot_path"), // 主截图路径
  ocrData: text("ocr_data"), // OCR提取数据的JSON字符串
  vectorId: text("vector_id"), // 向量数据ID
  ocrConfidence: real("ocr_confidence"), // OCR识别置信度
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  userId: true,   // 添加用户ID
  platformId: true,
  name: true,
  description: true,
  startDate: true,
  endDate: true,
  discount: true,
  commissionRate: true,
  roomTypes: true,
  minimumStay: true,
  maxBookingWindow: true,
  status: true,
  tag: true,
  participationStatus: true,
  screenshotPath: true,
  ocrData: true,
  vectorId: true,
  ocrConfidence: true,
});

// AI Strategy recommendations
export const strategies = mysqlTable("strategies", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  isRecommended: boolean("is_recommended").default(false),
  advantages: json("advantages").$type<string[]>(), // 使用JSON类型代替数组类型
  disadvantages: json("disadvantages").$type<string[]>(), // 使用JSON类型代替数组类型
  steps: json("steps").$type<string[]>(), // 使用JSON类型代替数组类型
  notes: json("notes").$type<string[]>(), // 使用JSON类型代替数组类型
  metrics: json("metrics").notNull(),
  activityIds: json("activity_ids").$type<number[]>(), // 使用JSON类型代替数组类型
  appliedAt: timestamp("applied_at"),
  appliedBy: text("applied_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStrategySchema = createInsertSchema(strategies).pick({
  userId: true,
  name: true,
  description: true,
  isRecommended: true,
  advantages: true,
  disadvantages: true,
  steps: true,
  notes: true,
  metrics: true,
  activityIds: true,
});

// API Keys for third-party services
export const apiKeys = mysqlTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  service: text("service").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  model: text("model"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  userId: true,
  service: true,
  encryptedKey: true,
  model: true,
});

// User preferences and settings
export const settings = mysqlTable("settings", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull().unique(),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  autoRefreshInterval: int("auto_refresh_interval").default(30),
  defaultStrategyPreference: text("default_strategy_preference").default("balanced"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settings).pick({
  userId: true,
  notificationsEnabled: true,
  autoRefreshInterval: true,
  defaultStrategyPreference: true,
});

// Strategy parameters for admin configuration
export const strategyParameters = mysqlTable("strategy_parameters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  paramKey: text("param_key").notNull().unique(),
  value: real("value").notNull().default(5.0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStrategyParameterSchema = createInsertSchema(strategyParameters).pick({
  name: true,
  description: true,
  paramKey: true,
  value: true,
});

// Strategy templates (saved successful strategies)
export const strategyTemplates = mysqlTable("strategy_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  strategyId: int("strategy_id").notNull(),
  addedBy: text("added_by").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

export const insertStrategyTemplateSchema = createInsertSchema(strategyTemplates).pick({
  name: true,
  description: true,
  strategyId: true,
  addedBy: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type OtaAccount = typeof otaAccounts.$inferSelect;
export type InsertOtaAccount = z.infer<typeof insertOtaAccountSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Strategy = typeof strategies.$inferSelect;
export type InsertStrategy = z.infer<typeof insertStrategySchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingsSchema>;

export type StrategyParameter = typeof strategyParameters.$inferSelect;
export type InsertStrategyParameter = z.infer<typeof insertStrategyParameterSchema>;

export type StrategyTemplate = typeof strategyTemplates.$inferSelect;
export type InsertStrategyTemplate = z.infer<typeof insertStrategyTemplateSchema>;