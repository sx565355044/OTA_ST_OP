import { pgTable, text, serial, integer, boolean, timestamp, json, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Platform Accounts table
export const platformAccounts = pgTable("platform_accounts", {
  id: serial("id").primaryKey(),
  platformName: text("platform_name").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(), // Will be encrypted
  loginUrl: text("login_url").notNull(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlatformAccountSchema = createInsertSchema(platformAccounts).pick({
  platformName: true,
  username: true,
  password: true,
  loginUrl: true,
  logoUrl: true,
});

// Promotion Activities table
export const promotionActivities = pgTable("promotion_activities", {
  id: serial("id").primaryKey(),
  platformId: integer("platform_id").notNull(),
  activityName: text("activity_name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  discount: text("discount"),
  commission: text("commission"),
  rooms: text("rooms"),
  status: text("status").default("pending").notNull(), // pending, joined, not_joined
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPromotionActivitySchema = createInsertSchema(promotionActivities).pick({
  platformId: true,
  activityName: true,
  startDate: true,
  endDate: true,
  discount: true,
  commission: true,
  rooms: true,
  status: true,
  description: true,
});

// AI Strategies table
export const strategies = pgTable("strategies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  activitiesAffected: integer("activities_affected").notNull(),
  performanceMetric: text("performance_metric"),
  executionSteps: json("execution_steps").notNull(),
  advantages: json("advantages").notNull(),
  disadvantages: json("disadvantages").notNull(),
  isTemplate: boolean("is_template").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStrategySchema = createInsertSchema(strategies).pick({
  name: true,
  description: true,
  activitiesAffected: true,
  performanceMetric: true,
  executionSteps: true,
  advantages: true,
  disadvantages: true,
  isTemplate: true,
});

// Strategy Executions table - records when a strategy is executed
export const strategyExecutions = pgTable("strategy_executions", {
  id: serial("id").primaryKey(),
  strategyId: integer("strategy_id").notNull(),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
  activitiesAffected: json("activities_affected").notNull(),
  notes: text("notes"),
});

export const insertStrategyExecutionSchema = createInsertSchema(strategyExecutions).pick({
  strategyId: true,
  activitiesAffected: true,
  notes: true,
});

// AI Settings table - stores API keys and model preferences
export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  apiKey: text("api_key").notNull(), // Will be encrypted
  model: text("model").default("Deepseek r1").notNull(),
  apiEndpoint: text("api_endpoint"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAiSettingsSchema = createInsertSchema(aiSettings).pick({
  apiKey: true,
  model: true, 
  apiEndpoint: true,
});

// AI Parameters table - stores weight parameters for AI strategy generation
export const aiParameters = pgTable("ai_parameters", {
  id: serial("id").primaryKey(),
  paramName: text("param_name").notNull().unique(),
  paramValue: integer("param_value").notNull(),
  paramDescription: text("param_description").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAiParameterSchema = createInsertSchema(aiParameters).pick({
  paramName: true,
  paramValue: true,
  paramDescription: true,
});

// Type exports
export type PlatformAccount = typeof platformAccounts.$inferSelect;
export type InsertPlatformAccount = z.infer<typeof insertPlatformAccountSchema>;

export type PromotionActivity = typeof promotionActivities.$inferSelect;
export type InsertPromotionActivity = z.infer<typeof insertPromotionActivitySchema>;

export type Strategy = typeof strategies.$inferSelect;
export type InsertStrategy = z.infer<typeof insertStrategySchema>;

export type StrategyExecution = typeof strategyExecutions.$inferSelect;
export type InsertStrategyExecution = z.infer<typeof insertStrategyExecutionSchema>;

export type AiSetting = typeof aiSettings.$inferSelect;
export type InsertAiSetting = z.infer<typeof insertAiSettingsSchema>;

export type AiParameter = typeof aiParameters.$inferSelect;
export type InsertAiParameter = z.infer<typeof insertAiParameterSchema>;
