/**
 * OCR处理工具
 * 负责从上传的图片中提取文本和结构化数据
 */

import * as path from 'path';
import * as fs from 'fs';
import { createWorker } from 'tesseract.js';

// OCR处理结果接口
// 平台识别结果类型
export interface DetectedPlatform {
  name: string;      // 平台名称，例如：携程、美团、飞猪等
  confidence: number; // 识别置信度
  code: string;      // 平台代码，例如：ctrip, meituan, fliggy
}

// 提取的活动数据类型
export interface ExtractedData {
  activityName?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  discount?: string;
  commissionRate?: string;
  status?: string;
  tag?: string;
  platform?: string;  // 识别出的平台名称
}

// OCR结果类型
export interface OcrResult {
  text: string;
  confidence: number;
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  // 添加平台识别结果
  detectedPlatform?: DetectedPlatform;
  extractedData: ExtractedData;
}

/**
 * 从图片中提取文本
 * @param imagePath 图片文件路径
 * @returns 提取的文本和OCR置信度
 */
export async function extractTextFromImage(imagePath: string): Promise<{ text: string; confidence: number }> {
  try {
    const worker = await createWorker('chi_sim+eng');
    const { data } = await worker.recognize(imagePath);
    await worker.terminate();
    
    return {
      text: data.text,
      confidence: data.confidence
    };
  } catch (error) {
    console.error('OCR处理失败:', error);
    throw new Error('文本提取失败');
  }
}

/**
 * 提取活动数据
 * @param text OCR提取的文本
 * @returns 提取的结构化数据
 */
export function extractActivityData(text: string): OcrResult['extractedData'] {
  const result: OcrResult['extractedData'] = {};
  
  // 活动名称 - 扩展搜索模式
  const activityNameMatches = [
    text.match(/(?:活动名称|活动标题|促销名称|优惠活动)[：:]\s*([^\n]+)/i),
    text.match(/(?:活动|促销|优惠)[：:]\s*([^\n]+)/i),
    text.match(/[\d月促销][\s]*([^\n]+)/i),
    text.match(/[\d月活动][\s]*([^\n]+)/i)
  ];
  for (const match of activityNameMatches) {
    if (match && match[1] && match[1].trim().length > 0) {
      result.activityName = match[1].trim();
      // 找到第一个有效匹配就停止
      break;
    }
  }
  
  // 如果没有找到活动名称，尝试提取页面标题作为活动名称
  if (!result.activityName) {
    // 寻找页面中最大的文字/标题
    const titleMatches = text.match(/^[\s\n]*([^\n]{10,50})[\s\n]/);
    if (titleMatches && titleMatches[1]) {
      result.activityName = titleMatches[1].trim();
    }
  }
  
  // 活动描述 - 多种匹配模式
  const descriptionMatches = [
    text.match(/(?:活动描述|活动详情|活动内容|活动说明)[：:]\s*([^\n]{10,})/i),
    text.match(/(?:描述|详情|内容|说明)[：:]\s*([^\n]{10,})/i),
    text.match(/(?:活动规则|规则)[：:]\s*([^\n]{10,})/i)
  ];
  for (const match of descriptionMatches) {
    if (match && match[1] && match[1].trim().length > 10) {
      result.description = match[1].trim();
      break;
    }
  }
  
  // 日期识别 - 各种日期格式
  // 开始日期识别
  const startDateMatches = [
    // 标准日期格式
    text.match(/(?:开始日期|开始时间|活动开始|上线时间|活动时间|活动期间)[\s：:]*(\d{4}[-./年]\d{1,2}[-./月]\d{1,2}[日]?)/i),
    // 时间范围中的第一个日期
    text.match(/(?:活动时间|活动期间|时间|日期)[\s：:]*(\d{4}[-./年]\d{1,2}[-./月]\d{1,2}[日]?)[\s至-]+\d{4}/i),
    // 年月日格式
    text.match(/(\d{4}年\d{1,2}月\d{1,2}日)[\s至-]/i)
  ];
  for (const match of startDateMatches) {
    if (match && match[1]) {
      // 标准化日期格式
      result.startDate = match[1].replace(/[./年]/g, '-').replace(/[月日]/g, '');
      break;
    }
  }
  
  // 结束日期识别
  const endDateMatches = [
    // 标准日期格式
    text.match(/(?:结束日期|结束时间|活动结束|下线时间)[\s：:]*(\d{4}[-./年]\d{1,2}[-./月]\d{1,2}[日]?)/i),
    // 时间范围中的第二个日期
    text.match(/(?:活动时间|活动期间|时间|日期)[\s：:]*\d{4}[-./年]\d{1,2}[-./月]\d{1,2}[日]?[\s至-]+(\d{4}[-./年]\d{1,2}[-./月]\d{1,2}[日]?)/i),
    // 年月日格式
    text.match(/[\s至-](\d{4}年\d{1,2}月\d{1,2}日)/i)
  ];
  for (const match of endDateMatches) {
    if (match && match[1]) {
      // 标准化日期格式
      result.endDate = match[1].replace(/[./年]/g, '-').replace(/[月日]/g, '');
      break;
    }
  }
  
  // 折扣信息 - 扩展匹配模式
  const discountMatches = [
    // 折扣率
    text.match(/(?:折扣|优惠|促销|折)[：:]*\s*([0-9]+(?:\.[0-9]+)?[%％折])/i),
    // 特定折扣描述
    text.match(/([0-9]+(?:\.[0-9]+)?[%％折][优惠促销])/i),
    // X折
    text.match(/([0-9]+(?:\.[0-9]+)?折)/i),
    // 满减 - 提取简单的满减信息
    text.match(/满([0-9]+)元?减([0-9]+)元?/i)
  ];
  for (const match of discountMatches) {
    if (match) {
      if (match[2]) { // 满减格式
        result.discount = `满${match[1]}减${match[2]}`;
      } else if (match[1]) {
        result.discount = match[1];
      }
      break;
    }
  }
  
  // 佣金比例 - 扩展匹配模式
  const commissionMatches = [
    text.match(/(?:佣金|分成|返点|提成)[：:\s]*([0-9]+(?:\.[0-9]+)?[%％])/i),
    text.match(/([0-9]+(?:\.[0-9]+)?[%％](?:佣金|分成|返点|提成))/i),
    text.match(/佣金(?:比例|率)[：:\s]*([0-9]+(?:\.[0-9]+)?)/i)
  ];
  for (const match of commissionMatches) {
    if (match && match[1]) {
      result.commissionRate = match[1].includes('%') || match[1].includes('％') 
                             ? match[1] 
                             : `${match[1]}%`;
      break;
    }
  }
  
  // 活动状态 - 改进状态识别
  const statusKeywords = {
    '进行中': ['进行中', '已开始', '正在进行', '活动中', '已上线', '热卖中', '火热进行'],
    '待开始': ['未开始', '即将开始', '预热中', '预售', '即将上线', '未上线', '规划中'],
    '已结束': ['已结束', '已过期', '已下线', '已完成', '已停止', '已截止', '已关闭'],
  };
  
  let foundStatus = false;
  for (const [status, keywords] of Object.entries(statusKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        result.status = status;
        foundStatus = true;
        break;
      }
    }
    if (foundStatus) break;
  }
  
  // 如果没有明确的状态关键词，尝试根据日期推断
  if (!foundStatus) {
    if (result.startDate || result.endDate) {
      try {
        const now = new Date();
        const startDate = result.startDate ? new Date(result.startDate) : new Date(0); // 过去的日期
        const endDate = result.endDate ? new Date(result.endDate) : new Date(8640000000000000); // 未来的日期
        
        if (now < startDate) {
          result.status = '待开始';
        } else if (now > endDate) {
          result.status = '已结束';
        } else {
          result.status = '进行中';
        }
      } catch (e) {
        // 日期解析错误，设为默认状态
        result.status = '未确定';
      }
    } else {
      result.status = '未确定';
    }
  }
  
  // 活动标签 - 增强识别标签类型
  const tagKeywords = {
    '限时': ['限时', '闪购', '秒杀', '限量', '限定', '抢购'],
    '节日': ['节日', '节庆', '春节', '中秋', '国庆', '元旦', '五一', '十一', '圣诞', '新年'],
    '促销': ['促销', '特惠', '折扣', '满减', '立减', '优惠', '返券', '赠品'],
    '季节': ['春季', '夏季', '秋季', '冬季', '开学季', '毕业季', '暑期', '春节'],
    '新品': ['新品', '首发', '新上市', '新上线', '新款', '首销', '首发', '新推出'],
    '会员': ['会员', 'VIP', '专享', '特权', '专属', '会员日'],
    '爆款': ['爆款', '热销', '热卖', '畅销', '明星产品', '爆品']
  };
  
  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        result.tag = tag;
        return result; // 找到标签后返回
      }
    }
  }
  
  // 未找到任何匹配标签时的默认值
  result.tag = '其他';
  
  return result;
}

/**
 * 从OCR文本中识别OTA平台
 * @param text OCR提取的文本
 * @returns 检测到的平台信息
 */
export function detectPlatform(text: string): OcrResult['detectedPlatform'] {
  // 将文本转换为小写以便不区分大小写匹配
  const lowerText = text.toLowerCase();
  
  // 定义平台特征关键词 - 扩展了更多关键词和UI元素特征
  const platformSignatures = [
    {
      name: '携程',
      code: 'ctrip',
      keywords: [
        '携程', 'ctrip', 'ebooking', '商家中心', '酒店管理', 'EBK', '携程旅行网', 
        'trip.com group', 'trip.com', 'ebooking.', '日房价套餐', '周边游', '自由行',
        '促销活动', '满房保障', 'ota活动', '转让收益', '直连房价'
      ],
      domains: ['ctrip.com', 'ebooking-ctrip.com', 'ebooking.ctrip.com'],
      // 界面元素特征
      uiElements: ['蓝色顶栏', 'Trip.com Group', '促销活动', '日房套餐', '特惠客房']
    },
    {
      name: '美团',
      code: 'meituan',
      keywords: [
        '美团', 'meituan', '商家后台', '美团酒店', '酒店商家', '美团旅行', 
        '点评', '大众点评', '推广服务', '袋鼠', '商家中心', '酒店管理平台',
        '自助促销', '补贴优惠', '客源保障', '酒店CRM', '酒店营销', '快验通'
      ],
      domains: ['meituan.com', 'dianping.com', 'ebooking.meituan.com'],
      // 界面元素特征
      uiElements: ['黄黑配色', '袋鼠图标', '促销频道', '商家工作台']
    },
    {
      name: '飞猪',
      code: 'fliggy',
      keywords: [
        '飞猪', 'fliggy', '阿里旅行', '飞猪旅行', '商家中心', '飞猪酒店',
        '阿里', '淘宝旅行', '天猫', '淘宝', '飞猪平台', '达人', '超级会员',
        '酒店直连', '飞猪酒店', '信用住', '飞猪商家'
      ],
      domains: ['fliggy.com', 'alitrip.com', 'taobao.com', 'tmall.com', 'aliyun.com'],
      // 界面元素特征
      uiElements: ['橙色系', '飞猪标志', '橙色猪图标', '淘宝风格']
    },
    {
      name: '去哪儿',
      code: 'qunar',
      keywords: [
        '去哪儿', 'qunar', '商家后台', '去哪儿网', '商家管理', '酒店商家',
        '旅游度假', '酒店管理系统', '去哪儿商家', '商家平台', '营销中心',
        '预订引擎', '特价推广', '去哪儿酒店'
      ],
      domains: ['qunar.com', 'qunarman.com'],
      // 界面元素特征
      uiElements: ['蓝绿色调', '去哪儿标志', '商家平台']
    },
    {
      name: '艺龙',
      code: 'elong',
      keywords: [
        '艺龙', 'elong', '商家后台', '艺龙旅行', '酒店商家', '艺龙网',
        '商家管理系统', '艺龙酒店', '营销平台', '分销系统'
      ],
      domains: ['elong.com', 'elongstatic.com'],
      // 界面元素特征
      uiElements: ['绿色系', '艺龙标志']
    },
    {
      name: '同程',
      code: 'ly',
      keywords: [
        '同程', '同程旅行', '同程商家', 'LY', '同程酒店', '商家后台',
        '同程商家中心', '商家服务', '酒店管理系统', '分销平台'
      ],
      domains: ['ly.com', '17u.cn', 'tongcheng.com'],
      // 界面元素特征
      uiElements: ['蓝色系', '同程标志']
    },
    {
      name: '途家',
      code: 'tujia',
      keywords: [
        '途家', 'tujia', '民宿', '短租', '途家商家', '房东后台',
        '途家网', '途家平台', '房屋管理', '房源管理'
      ],
      domains: ['tujia.com'],
      // 界面元素特征
      uiElements: ['橙色系', '途家标志', '民宿管理']
    }
  ];

  // 使用更先进的匹配算法 - 考虑关键词、域名和UI元素的综合匹配
  const matches = platformSignatures.map(platform => {
    let matchScore = 0;
    let keywordMatches = 0;
    let domainMatches = 0;
    let uiElementMatches = 0;
    
    // 关键词匹配 - 每个关键词有不同权重
    platform.keywords.forEach(keyword => {
      // 全字匹配(更高权重)
      if (new RegExp(`\\b${keyword.toLowerCase()}\\b`).test(lowerText)) {
        keywordMatches += 2;
      }
      // 部分匹配(较低权重)
      else if (lowerText.includes(keyword.toLowerCase())) {
        keywordMatches += 1;
      }
    });
    
    // 域名匹配 - 域名是重要识别点
    platform.domains.forEach(domain => {
      if (lowerText.includes(domain.toLowerCase())) {
        // 域名是强匹配项，权重更高
        domainMatches += 3;
      }
    });
    
    // UI元素特征匹配
    platform.uiElements.forEach(element => {
      if (lowerText.includes(element.toLowerCase())) {
        uiElementMatches += 1.5;
      }
    });
    
    // 计算总分
    matchScore = keywordMatches + domainMatches + uiElementMatches;
    
    // 计算置信度 - 根据匹配项占总特征数的比例
    const totalFeatures = platform.keywords.length + platform.domains.length + platform.uiElements.length;
    // 最大可能匹配分数 (关键词*2 + 域名*3 + UI元素*1.5)
    const maxPossibleScore = platform.keywords.length * 2 + platform.domains.length * 3 + platform.uiElements.length * 1.5;
    const confidence = (matchScore / maxPossibleScore) * 100;
    
    // 特殊规则检测 - 如果URL直接包含域名，显著提高置信度
    platform.domains.forEach(domain => {
      if (lowerText.includes(`http://${domain}`) || lowerText.includes(`https://${domain}`) || lowerText.includes(`www.${domain}`)) {
        // URL直接显示是非常强的证据
        matchScore += 5;
        // 也提高置信度
        confidence * 1.5;
      }
    });
    
    return {
      name: platform.name,
      code: platform.code,
      confidence: Math.min(confidence, 100), // 确保置信度不超过100%
      matchScore // 保留原始匹配分数以便调试
    };
  });
  
  // 找出匹配度最高的平台
  type PlatformMatch = {
    name: string;
    code: string;
    confidence: number;
    matchScore: number;
  };
  
  const bestMatch = matches.reduce<PlatformMatch>((best, current) => 
    current.confidence > best.confidence ? current as PlatformMatch : best, 
    { name: '未知', code: 'unknown', confidence: 0, matchScore: 0 }
  );
  
  // 调试信息
  console.log("平台匹配结果:", matches.map(m => `${m.name}(${m.code}): ${m.confidence.toFixed(2)}%, 分数: ${m.matchScore}`).join(', '));
  
  // 只有当置信度超过阈值时才返回确定的平台
  if (bestMatch.confidence >= 10) { // 进一步降低阈值到10%以增加平台识别成功率
    // 清理返回对象，移除调试数据
    const { matchScore, ...cleanResult } = bestMatch as { matchScore: number, name: string, code: string, confidence: number };
    return cleanResult;
  }
  
  // 无法确定平台
  return {
    name: '未知',
    code: 'unknown',
    confidence: 0
  };
}

/**
 * 处理单张图片并提取活动数据
 * @param imagePath 图片文件路径
 * @returns 提取的OCR结果，包含文本和结构化数据
 */
export async function processImage(imagePath: string): Promise<OcrResult> {
  // 提取文本
  const { text, confidence } = await extractTextFromImage(imagePath);
  
  // 检测平台
  const detectedPlatform = detectPlatform(text);
  
  // 从文本中提取结构化数据
  const extractedData = extractActivityData(text);
  
  // 将检测到的平台信息添加到结构化数据中
  if (detectedPlatform && detectedPlatform.code !== 'unknown') {
    extractedData.platform = detectedPlatform.name;
  }
  
  return {
    text,
    confidence,
    detectedPlatform,
    extractedData
  };
}

/**
 * 处理多张图片并合并结果
 * @param imagePaths 图片文件路径数组
 * @returns 合并后的OCR结果
 */
export async function processMultipleImages(imagePaths: string[]): Promise<OcrResult> {
  // 并行处理所有图片
  const ocrPromises = imagePaths.map(imagePath => processImage(imagePath));
  const ocrResults = await Promise.all(ocrPromises);
  
  // 初始化合并结果
  const mergedResult: OcrResult = {
    text: ocrResults.map(r => r.text).join('\n'),
    confidence: ocrResults.reduce((sum, r) => sum + r.confidence, 0) / ocrResults.length,
    extractedData: {}
  };
  
  // 汇总平台识别结果，找出置信度最高的平台
  const platformVotes: {[key: string]: {count: number, confidence: number, name: string, code: string}} = {};
  ocrResults.forEach(result => {
    if (result.detectedPlatform && result.detectedPlatform.code !== 'unknown') {
      const platform = result.detectedPlatform;
      if (!platformVotes[platform.code]) {
        platformVotes[platform.code] = {
          count: 0,
          confidence: 0,
          name: platform.name,
          code: platform.code
        };
      }
      platformVotes[platform.code].count++;
      platformVotes[platform.code].confidence += platform.confidence;
    }
  });
  
  // 找出得票最多且平均置信度最高的平台
  // 使用我们已经在接口中定义的DetectedPlatform类型
  let bestPlatform: DetectedPlatform | null = null;
  let maxVotes = 0;
  let maxConfidence = 0;
  
  Object.values(platformVotes).forEach(platform => {
    const avgConfidence = platform.confidence / platform.count;
    if (platform.count > maxVotes || 
        (platform.count === maxVotes && avgConfidence > maxConfidence)) {
      maxVotes = platform.count;
      maxConfidence = avgConfidence;
      bestPlatform = {
        name: platform.name,
        code: platform.code,
        confidence: avgConfidence
      };
    }
  });
  
  if (bestPlatform) {
    mergedResult.detectedPlatform = bestPlatform;
    // 确保 extractedData 被初始化为对象并添加平台信息
    mergedResult.extractedData = mergedResult.extractedData || {};
    // 确保bestPlatform不为空并赋值
    if (bestPlatform && 
        typeof bestPlatform === 'object' && 
        bestPlatform !== null &&
        'name' in bestPlatform && 
        typeof bestPlatform.name === 'string') {
      // 使用类型安全的直接赋值
      mergedResult.extractedData.platform = bestPlatform.name;
    }
  }
  
  // 获取最高置信度的数据
  ocrResults.forEach(result => {
    const data = result.extractedData;
    Object.keys(data).forEach(key => {
      const typedKey = key as keyof OcrResult['extractedData'];
      if (
        !mergedResult.extractedData[typedKey] || 
        (result.confidence > (mergedResult.confidence * 0.8) &&
         data[typedKey]
        )
      ) {
        mergedResult.extractedData[typedKey] = data[typedKey];
      }
    });
  });
  
  console.log("平台自动识别结果:", mergedResult.detectedPlatform);
  
  return mergedResult;
}