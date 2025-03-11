import express, { Router } from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scraperService } from "./services/scraper";
import { aiService } from "./services/ai";
import { z } from "zod";
import { 
  insertPlatformAccountSchema, 
  insertPromotionActivitySchema,
  insertStrategySchema,
  insertStrategyExecutionSchema,
  insertAiSettingsSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = Router();
  
  // Platform Accounts Routes
  apiRouter.get("/accounts", async (req, res) => {
    try {
      const accounts = await storage.getPlatformAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch platform accounts" });
    }
  });

  apiRouter.get("/accounts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const account = await storage.getPlatformAccount(id);
      
      if (!account) {
        return res.status(404).json({ message: "Platform account not found" });
      }
      
      res.json(account);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch platform account" });
    }
  });

  apiRouter.post("/accounts", async (req, res) => {
    try {
      const validatedData = insertPlatformAccountSchema.parse(req.body);
      const newAccount = await storage.createPlatformAccount(validatedData);
      res.status(201).json(newAccount);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create platform account" });
    }
  });

  apiRouter.put("/accounts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPlatformAccountSchema.partial().parse(req.body);
      
      const updatedAccount = await storage.updatePlatformAccount(id, validatedData);
      
      if (!updatedAccount) {
        return res.status(404).json({ message: "Platform account not found" });
      }
      
      res.json(updatedAccount);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update platform account" });
    }
  });

  apiRouter.delete("/accounts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePlatformAccount(id);
      
      if (!success) {
        return res.status(404).json({ message: "Platform account not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete platform account" });
    }
  });

  // Promotion Activities Routes
  apiRouter.get("/activities", async (req, res) => {
    try {
      const activities = await storage.getPromotionActivities();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch promotion activities" });
    }
  });

  apiRouter.get("/activities/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const activities = await storage.getRecentPromotionActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent promotion activities" });
    }
  });

  apiRouter.get("/activities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const activity = await storage.getPromotionActivity(id);
      
      if (!activity) {
        return res.status(404).json({ message: "Promotion activity not found" });
      }
      
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch promotion activity" });
    }
  });

  apiRouter.post("/activities", async (req, res) => {
    try {
      const validatedData = insertPromotionActivitySchema.parse(req.body);
      const newActivity = await storage.createPromotionActivity(validatedData);
      res.status(201).json(newActivity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create promotion activity" });
    }
  });

  apiRouter.put("/activities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPromotionActivitySchema.partial().parse(req.body);
      
      const updatedActivity = await storage.updatePromotionActivity(id, validatedData);
      
      if (!updatedActivity) {
        return res.status(404).json({ message: "Promotion activity not found" });
      }
      
      res.json(updatedActivity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update promotion activity" });
    }
  });

  apiRouter.delete("/activities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePromotionActivity(id);
      
      if (!success) {
        return res.status(404).json({ message: "Promotion activity not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete promotion activity" });
    }
  });

  // Strategies Routes
  apiRouter.get("/strategies", async (req, res) => {
    try {
      const isTemplate = req.query.isTemplate === "true" ? true : 
                        req.query.isTemplate === "false" ? false : 
                        undefined;
      
      const strategies = await storage.getStrategies(isTemplate);
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch strategies" });
    }
  });

  apiRouter.get("/strategies/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 3;
      const strategies = await storage.getRecentStrategies(limit);
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent strategies" });
    }
  });

  apiRouter.get("/strategies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const strategy = await storage.getStrategy(id);
      
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      
      res.json(strategy);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch strategy" });
    }
  });

  apiRouter.post("/strategies", async (req, res) => {
    try {
      const validatedData = insertStrategySchema.parse(req.body);
      const newStrategy = await storage.createStrategy(validatedData);
      res.status(201).json(newStrategy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create strategy" });
    }
  });

  apiRouter.put("/strategies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertStrategySchema.partial().parse(req.body);
      
      const updatedStrategy = await storage.updateStrategy(id, validatedData);
      
      if (!updatedStrategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      
      res.json(updatedStrategy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update strategy" });
    }
  });

  apiRouter.delete("/strategies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteStrategy(id);
      
      if (!success) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete strategy" });
    }
  });

  // Strategy Executions Routes
  apiRouter.get("/executions", async (req, res) => {
    try {
      const executions = await storage.getStrategyExecutions();
      res.json(executions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch strategy executions" });
    }
  });

  apiRouter.get("/executions/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const executions = await storage.getRecentStrategyExecutions(limit);
      res.json(executions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent strategy executions" });
    }
  });

  apiRouter.post("/executions", async (req, res) => {
    try {
      const validatedData = insertStrategyExecutionSchema.parse(req.body);
      const newExecution = await storage.createStrategyExecution(validatedData);
      res.status(201).json(newExecution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create strategy execution" });
    }
  });

  // AI Settings Routes
  apiRouter.get("/ai/settings", async (req, res) => {
    try {
      const settings = await storage.getAiSettings();
      
      if (!settings) {
        return res.status(404).json({ message: "AI settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI settings" });
    }
  });

  apiRouter.post("/ai/settings", async (req, res) => {
    try {
      const validatedData = insertAiSettingsSchema.parse(req.body);
      const settings = await storage.saveAiSettings(validatedData);
      res.status(201).json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save AI settings" });
    }
  });

  apiRouter.post("/ai/test", async (req, res) => {
    try {
      const success = await aiService.testConnection();
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to test AI connection", error: (error as Error).message });
    }
  });

  // AI Parameters Routes
  apiRouter.get("/ai/parameters", async (req, res) => {
    try {
      const parameters = await storage.getAiParameters();
      res.json(parameters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI parameters" });
    }
  });

  apiRouter.put("/ai/parameters/:name", async (req, res) => {
    try {
      const name = req.params.name;
      const value = z.number().min(0).max(10).parse(req.body.value);
      
      const updatedParameter = await storage.updateAiParameter(name, value);
      
      if (!updatedParameter) {
        return res.status(404).json({ message: "Parameter not found" });
      }
      
      res.json(updatedParameter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update parameter" });
    }
  });

  // Scraping Routes
  apiRouter.post("/scrape", async (req, res) => {
    try {
      const platformId = z.number().optional().parse(req.body.platformId);
      
      let results;
      if (platformId) {
        results = await scraperService.scrapePromotions(platformId);
      } else {
        results = await scraperService.scrapeAllPromotions();
      }
      
      res.json({ success: true, results });
    } catch (error) {
      res.status(500).json({ message: "Failed to scrape promotions", error: (error as Error).message });
    }
  });

  // AI Strategy Generation Route
  apiRouter.post("/ai/generate", async (req, res) => {
    try {
      // Get all activities or use provided IDs
      const activityIds = Array.isArray(req.body.activityIds) ? req.body.activityIds : undefined;
      
      let activities;
      if (activityIds && activityIds.length > 0) {
        activities = [];
        for (const id of activityIds) {
          const activity = await storage.getPromotionActivity(parseInt(id));
          if (activity) activities.push(activity);
        }
      } else {
        activities = await storage.getPromotionActivities();
      }
      
      if (activities.length === 0) {
        return res.status(400).json({ message: "No activities available for analysis" });
      }
      
      const strategies = await aiService.generateStrategies(activities);
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate AI strategies", error: (error as Error).message });
    }
  });

  // Register the API router
  app.use("/api", apiRouter);

  // Create and return the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
