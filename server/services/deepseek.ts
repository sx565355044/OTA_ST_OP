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
You are an expert hotel revenue manager tasked with analyzing OTA (Online Travel Agency) platform promotion activities and recommending participation strategies to maximize revenue and occupancy.

## Hotel OTA Promotion Activities
${JSON.stringify(activities, null, 2)}

## Strategy Generation Parameters
${JSON.stringify(parameters, null, 2)}

## User Preference
${preference}

Based on the above information, generate 3 different participation strategies for these OTA promotion activities. Each strategy should include:

1. A strategy name
2. A detailed description of the strategy approach
3. Whether this is the recommended strategy (only one should be recommended)
4. A list of 3-5 specific advantages of this strategy
5. A list of 2-3 specific disadvantages or risks
6. A list of 4-6 specific, actionable steps to implement this strategy
7. 2-3 important notes or warnings about execution
8. IDs of activities that should be participated in as part of this strategy
9. Metrics information including:
   - Projected growth (value and type: revenue/traffic/etc.)
   - Complexity level (low/medium/high)

Return the strategies in a structured JSON format only, without any explanation before or after.

{
  "strategies": [
    {
      "name": "Strategy name",
      "description": "Strategy description",
      "isRecommended": true/false,
      "advantages": ["advantage 1", "advantage 2", ...],
      "disadvantages": ["disadvantage 1", "disadvantage 2", ...],
      "steps": ["step 1", "step 2", ...],
      "notes": ["note 1", "note 2", ...],
      "activityIds": [1, 2, ...],
      "metrics": {
        "projectedGrowth": {
          "value": "+X%",
          "percentage": 70,
          "type": "revenue/traffic/balanced"
        },
        "complexity": {
          "value": "low/medium/high",
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
 * Generate fallback strategies for development/testing
 * This is only used when the API call fails in development mode
 * @returns A JSON string with fallback strategies
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
          "登录携程商家平台，参与"暑期特惠房"活动，并将折扣调整至15%（而非之前的20%）",
          "取消参与美团平台的"周末特价"活动，改为参加"会员专享"活动，可提高10%的利润率",
          "重新连接飞猪平台，参与"双十一预售"活动，但限定房型为"高级大床房"和"商务套房"",
          "统一调整所有平台佣金结构，将携程平台佣金降至7%，美团维持在10%，飞猪调整为9%"
        ],
        "notes": [
          "价格调整应在低峰时段进行，避免影响当前订单",
          "活动切换需提前24小时操作，确保系统同步",
          "佣金调整可能需与平台客户经理沟通确认"
        ],
        "activityIds": [1, 3],
        "metrics": {
          "projectedGrowth": {
            "value": "+12%",
            "percentage": 80,
            "type": "revenue"
          },
          "complexity": {
            "value": "中等",
            "percentage": 50
          }
        }
      },
      {
        "name": "流量提升策略",
        "description": "参与多平台高曝光活动，提升预订流量，优先考虑能够带来更多访问量和预订量的促销活动，提高酒店在各OTA平台的曝光率和搜索排名。",
        "isRecommended": false,
        "advantages": [
          "预计流量增长20%",
          "提高平台搜索排名",
          "增加品牌曝光",
          "扩大客户获取渠道"
        ],
        "disadvantages": [
          "佣金成本较高",
          "利润率可能降低",
          "需监控转化率"
        ],
        "steps": [
          "同时参与所有平台的热门促销活动，接受较高佣金率",
          "在携程和飞猪平台购买额外的展示位置和搜索优先级",
          "针对所有活动提供更具吸引力的折扣，如15-20%",
          "开放更多房型参与各平台活动",
          "增加预订窗口期，允许提前3个月预订"
        ],
        "notes": [
          "密切监控预订转化率，及时调整低效渠道",
          "注意不同平台之间的价格一致性，避免价格战"
        ],
        "activityIds": [1, 2, 3],
        "metrics": {
          "projectedGrowth": {
            "value": "+20%",
            "percentage": 90,
            "type": "traffic"
          },
          "complexity": {
            "value": "高",
            "percentage": 70
          }
        }
      },
      {
        "name": "平衡策略",
        "description": "平衡短期收益和长期声誉，稳步提升酒店在OTA平台的表现，既保证当前收益，又不损害长期价格体系和品牌价值。",
        "isRecommended": false,
        "advantages": [
          "收益与声誉的平衡取舍",
          "维持价格体系稳定",
          "降低运营压力",
          "适合长期发展"
        ],
        "disadvantages": [
          "短期收益增长有限",
          "竞争优势不明显"
        ],
        "steps": [
          "选择性参与携程"暑期特惠房"活动，但限定特定房型",
          "参与美团"周末特惠"活动，但仅针对周五至周日入住",
          "暂不参与飞猪"双十一预售"，等待竞争情况后再决定",
          "保持现有佣金结构不变"
        ],
        "notes": [
          "每周评估活动效果，按需微调参与力度",
          "与平台保持良好沟通，获取更多支持资源"
        ],
        "activityIds": [1, 2],
        "metrics": {
          "projectedGrowth": {
            "value": "+8%",
            "percentage": 60,
            "type": "balanced"
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
