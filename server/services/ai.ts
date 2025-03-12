import { Activity, InsertStrategy, StrategyParameter } from "@shared/schema";
import { storage } from "../storage";
import { generateStrategies as deepseekGenerateStrategies } from "./deepseek";
import { decryptApiKey } from "../utils/encryption";

/**
 * Service for interacting with the DeepSeek AI API
 */
export class AiService {
  /**
   * Generate strategy recommendations
   * @param activities - List of promotion activities to analyze
   * @returns Array of recommended strategies
   */
  async generateStrategies(activities: Activity[]): Promise<InsertStrategy[]> {
    try {
      if (!activities || activities.length === 0) {
        throw new Error("No activities provided for strategy generation");
      }
      
      // 从活动中获取用户ID
      const userId = activities[0].userId as number;
      if (!userId) {
        throw new Error("Invalid user ID in activities");
      }
      
      // 获取API密钥
      const apiKey = await storage.getApiKeyByUserIdAndService(userId, "deepseek");
      if (!apiKey) {
        throw new Error("DeepSeek API key not configured");
      }

      // 获取策略参数
      const parameters = await storage.getStrategyParameters();
      if (parameters.length === 0) {
        throw new Error("Strategy parameters not configured");
      }

      // 获取用户偏好设置
      const settings = await storage.getSettingsByUserId(userId);
      const preference = settings?.defaultStrategyPreference || "balanced";

      // 解密API密钥
      const decryptedKey = await decryptApiKey(apiKey.encryptedKey);
      
      console.log(`Generating strategies using DeepSeek API with model: ${apiKey.model || "DeepSeek-R1-Plus"}`);
      console.log(`Using preference: ${preference}`);
      console.log(`Analyzing ${activities.length} activities`);

      // 调用DeepSeek API生成策略
      const strategies = await deepseekGenerateStrategies(
        decryptedKey,
        activities,
        parameters,
        preference,
        apiKey.model || "DeepSeek-R1-Plus"
      );

      // 添加用户ID
      return strategies.map(strategy => ({
        ...strategy,
        userId,
      }));
    } catch (error) {
      console.error("Error generating AI strategies:", error);
      
      // 在开发环境中，如果API调用失败，提供更详细的错误消息
      if (process.env.NODE_ENV !== "production") {
        console.warn("AI API failed:", error);
      }
      
      throw error;
    }
  }

  /**
   * Test the DeepSeek API connection
   * @param apiKey 解密后的API密钥
   * @param model 模型名称
   * @returns 连接测试结果
   */
  async testConnection(apiKey: string, model: string = "DeepSeek-R1-Plus"): Promise<boolean> {
    try {
      // 构建一个简单的测试请求
      const testPrompt = "请回答：这是一个API连接测试，请回复'连接成功'。";
      
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "user",
              content: testPrompt
            }
          ],
          temperature: 0.5,
          max_tokens: 30
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      const responseText = data.choices[0].message.content;
      
      console.log("API连接测试响应:", responseText);
      return responseText.includes("连接成功") || responseText.includes("测试");
    } catch (error) {
      console.error("API连接测试失败:", error);
      throw error;
    }
  }
}

export const aiService = new AiService();
