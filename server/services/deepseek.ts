import { Activity, StrategyParameter } from "@shared/schema";

/**
 * Generate strategy recommendations using the DeepSeek API
 * @param apiKey The DeepSeek API key
 * @param activities The activities to analyze
 * @param parameters The strategy parameters
 * @param preference The user's strategy preference
 * @param model The DeepSeek model to use
 * @returns A promise resolving to an array of strategies
 */
export async function generateStrategies(
  apiKey: string,
  activities: Activity[],
  parameters: StrategyParameter[],
  preference: string = "balanced",
  model: string = "DeepSeek-R1-Plus"
): Promise<any[]> {
  try {
    console.log(`Generating strategies using DeepSeek API with model: ${model}`);
    
    // Prepare data for the model
    const activitiesData = prepareActivitiesData(activities);
    const parametersData = prepareParametersData(parameters);
    
    // Construct prompt for DeepSeek
    const prompt = constructPrompt(activitiesData, parametersData, preference);
    
    // Call DeepSeek API
    const response = await callDeepSeekAPI(apiKey, prompt, model);
    
    // Parse and format the response into strategy objects
    const strategies = parseStrategies(response, activities);
    
    return strategies;
  } catch (error) {
    console.error("Error generating strategies:", error);
    throw new Error(`Failed to generate strategies: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Prepare activities data for the prompt
 * @param activities The activities to analyze
 * @returns Formatted activities data
 */
function prepareActivitiesData(activities: Activity[]): any[] {
  return activities.map(activity => {
    return {
      id: activity.id,
      name: activity.name,
      description: activity.description,
      platform: activity.platformId, // Will need to be resolved later
      startDate: new Date(activity.startDate).toISOString().split('T')[0],
      endDate: new Date(activity.endDate).toISOString().split('T')[0],
      discount: activity.discount,
      commissionRate: activity.commissionRate,
      roomTypes: activity.roomTypes,
      minimumStay: activity.minimumStay,
      maxBookingWindow: activity.maxBookingWindow,
      status: activity.status,
      participationStatus: activity.participationStatus,
      tag: activity.tag,
    };
  });
}

/**
 * Prepare parameters data for the prompt
 * @param parameters The strategy parameters
 * @returns Formatted parameters data
 */
function prepareParametersData(parameters: StrategyParameter[]): any {
  const paramObject: Record<string, number> = {};
  
  parameters.forEach(param => {
    paramObject[param.paramKey] = param.value;
  });
  
  return paramObject;
}

/**
 * Construct a prompt for the DeepSeek API
 * @param activities Formatted activities data
 * @param parameters Formatted parameters data
 * @param preference The user's strategy preference
 * @returns The constructed prompt
 */
function constructPrompt(activities: any[], parameters: any, preference: string): string {
  return `
请使用中文回答。你是一位专业的酒店收益管理专家，负责分析OTA（在线旅行平台）促销活动，并为酒店提供最佳参与策略，以最大化收益和入住率。

## 酒店OTA促销活动数据
${JSON.stringify(activities, null, 2)}

## 策略生成参数
${JSON.stringify(parameters, null, 2)}

## 用户偏好
${preference}

基于以上信息，请为这些OTA促销活动生成3种不同的参与策略。每个策略必须包含以下内容（所有内容必须使用中文）：

1. 策略名称
2. 详细的策略方法描述
3. 是否为推荐策略（只能有一个被推荐）
4. 此策略的3-5个具体优势
5. 此策略的2-3个具体劣势或风险
6. 4-6个具体、可执行的实施步骤
7. 2-3条关于执行的重要注意事项或警告
8. 作为此策略一部分应当参与的活动ID
9. 指标信息，包括：
   - 预计增长（数值和类型：收益/流量等）
   - 复杂度级别（低/中/高）

只返回结构化的JSON格式，不要在JSON前后添加任何解释。所有内容必须使用简体中文，不允许使用英文或其他语言。

{
  "strategies": [
    {
      "name": "策略名称",
      "description": "策略描述",
      "isRecommended": true/false,
      "advantages": ["优势1", "优势2", ...],
      "disadvantages": ["劣势1", "劣势2", ...],
      "steps": ["步骤1", "步骤2", ...],
      "notes": ["注意事项1", "注意事项2", ...],
      "activityIds": [1, 2, ...],
      "metrics": {
        "projectedGrowth": {
          "value": "+X%",
          "percentage": 70,
          "type": "收益/流量/平衡"
        },
        "complexity": {
          "value": "低/中/高",
          "percentage": 30
        }
      }
    },
    ...
  ]
}
`;
}

/**
 * Call the DeepSeek API to generate strategies
 * @param apiKey The DeepSeek API key
 * @param prompt The constructed prompt
 * @param model The DeepSeek model to use
 * @returns The API response
 */
async function callDeepSeekAPI(apiKey: string, prompt: string, model: string): Promise<string> {
  try {
    const apiUrl = "https://api.deepseek.com/v1/chat/completions";
    
    const response = await fetch(apiUrl, {
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
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling DeepSeek API:", error);
    
    // For development/testing, return mock strategies if the API call fails
    // In production, this should be removed
    if (process.env.NODE_ENV !== "production") {
      console.warn("Using fallback strategies for development due to API error");
      return generateFallbackStrategies();
    }
    
    throw error;
  }
}

/**
 * Parse the DeepSeek API response into strategy objects
 * @param response The API response
 * @param activities The original activities for reference
 * @returns An array of parsed strategies
 */
function parseStrategies(response: string, activities: Activity[]): any[] {
  try {
    // Extract JSON from response (handling potential text before/after JSON)
    let jsonStr = response;
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const data = JSON.parse(jsonStr);
    
    if (!data.strategies || !Array.isArray(data.strategies)) {
      throw new Error("Invalid response format: missing strategies array");
    }
    
    return data.strategies.map((strategy: any) => {
      // Validate and ensure all required fields are present
      if (!strategy.name || !strategy.description) {
        throw new Error("Invalid strategy format: missing required fields");
      }
      
      // Check that activityIds refer to valid activities
      const validActivityIds = strategy.activityIds.filter((id: number) => 
        activities.some(activity => activity.id === id)
      );
      
      return {
        name: strategy.name,
        description: strategy.description,
        isRecommended: Boolean(strategy.isRecommended),
        advantages: Array.isArray(strategy.advantages) ? strategy.advantages : [],
        disadvantages: Array.isArray(strategy.disadvantages) ? strategy.disadvantages : [],
        steps: Array.isArray(strategy.steps) ? strategy.steps : [],
        notes: Array.isArray(strategy.notes) ? strategy.notes : [],
        activityIds: validActivityIds,
        metrics: strategy.metrics || {
          projectedGrowth: { value: "+0%", percentage: 50, type: "balanced" },
          complexity: { value: "medium", percentage: 50 }
        }
      };
    });
  } catch (error) {
    console.error("Error parsing DeepSeek response:", error);
    throw new Error(`Failed to parse strategies: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 生成备用策略用于开发/测试阶段
 * 仅在开发模式下API调用失败时使用
 * @returns 包含备用策略的JSON字符串
 */
function generateFallbackStrategies(): string {
  return `{
    "strategies": [
      {
        "name": "收益优化策略",
        "description": "此策略通过精选高收益潜力的OTA活动，优化您的收入和利润。我们综合考虑了平台佣金、活动折扣、预期流量和时间冲突因素，为您推荐最具收益潜力的活动组合。",
        "isRecommended": true,
        "advantages": [
          "预计收益提升12%",
          "平衡短期收益和长期增长",
          "避免了活动时间冲突",
          "优化了平台佣金结构"
        ],
        "disadvantages": [
          "需要频繁调整价格",
          "执行复杂度中等",
          "部分平台曝光率可能降低"
        ],
        "steps": [
          "筛选并分析所有携程平台活动，识别高收益潜力的促销",
          "调整活动参数，将折扣控制在合理范围以保证利润",
          "关注飞猪平台的优质活动，特别关注佣金率较低的促销",
          "避免同时参与多个相似活动，减少竞争和资源浪费"
        ],
        "notes": [
          "定期评估各活动的投入产出比，及时调整策略",
          "关注市场竞争情况，保持价格竞争力"
        ],
        "activityIds": [1, 3],
        "metrics": {
          "projectedGrowth": {
            "value": "+12%",
            "percentage": 80,
            "type": "收益"
          },
          "complexity": {
            "value": "中",
            "percentage": 50
          }
        }
      },
      {
        "name": "流量提升策略",
        "description": "此策略关注OTA平台的曝光和流量提升，优先考虑能够带来更多访问量和预订量的促销活动，提高酒店在各OTA平台的曝光率和搜索排名。",
        "isRecommended": false,
        "advantages": [
          "预计流量增长20%",
          "提高平台搜索排名",
          "增加品牌曝光",
          "扩大客户获取渠道"
        ],
        "disadvantages": [
          "可能面临较高佣金成本",
          "利润率可能降低",
          "需密切监控转化率"
        ],
        "steps": [
          "识别并优先参与携程和飞猪平台的高曝光活动",
          "适当提高折扣力度以增加活动吸引力",
          "考虑购买额外的展示位置提升曝光",
          "开放更多房型参与各平台活动",
          "增加预订窗口期，允许提前较长时间预订"
        ],
        "notes": [
          "密切监控预订转化率，及时调整低效渠道",
          "注意不同平台之间的价格一致性，避免价格混乱"
        ],
        "activityIds": [1, 2, 3],
        "metrics": {
          "projectedGrowth": {
            "value": "+20%",
            "percentage": 90,
            "type": "流量"
          },
          "complexity": {
            "value": "高",
            "percentage": 70
          }
        }
      },
      {
        "name": "平衡发展策略",
        "description": "此策略平衡短期收益和长期声誉，稳步提升酒店在OTA平台的表现，既保证当前收益，又不损害长期价格体系和品牌价值。",
        "isRecommended": false,
        "advantages": [
          "兼顾收益与声誉",
          "维持价格体系稳定",
          "降低运营压力",
          "适合长期可持续发展"
        ],
        "disadvantages": [
          "短期收益增长有限",
          "在竞争激烈环境中优势不明显"
        ],
        "steps": [
          "精选性价比高的OTA活动，避免过度参与",
          "维持合理的折扣水平，避免价格战",
          "重点关注品质高、口碑好的平台活动",
          "保持各渠道价格体系的相对稳定"
        ],
        "notes": [
          "每周评估活动效果，按需微调策略",
          "与OTA平台保持良好沟通，争取更多支持资源"
        ],
        "activityIds": [1, 2],
        "metrics": {
          "projectedGrowth": {
            "value": "+8%",
            "percentage": 60,
            "type": "平衡"
          },
          "complexity": {
            "value": "低",
            "percentage": 30
          }
        }
      }
    ]
  }`;
}
