/**
 * OCR处理工具
 * 负责从上传的图片中提取文本和结构化数据
 */

import * as path from 'path';
import * as fs from 'fs';
import { deepseekOcrService } from '../services/deepseek-ocr';

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
  errorMessage?: string; // 错误信息
  [key: string]: any; // 允许额外字段
}

// OCR文本提取结果
export interface TextExtractionResult {
  text: string;
  confidence: number;
  source?: string; // OCR引擎来源: deepseek 或 tesseract
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
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
  // 扩展属性
  processingTime?: string;
  ocrEngine?: string;
  error?: boolean;
  errorDetails?: any;
}

/**
 * 从图片中提取文本
 * @param imagePath 图片文件路径
 * @returns 提取的文本和OCR置信度
 */
export async function extractTextFromImage(imagePath: string): Promise<TextExtractionResult> {
  // 检查文件是否存在
  if (!fs.existsSync(imagePath)) {
    console.error(`图片文件不存在: ${imagePath}`);
    throw new Error(`文件不存在: ${imagePath}`);
  }

  // 检查文件是否为图片
  try {
    const fileStats = fs.statSync(imagePath);
    // 检查文件是否为空
    if (fileStats.size === 0) {
      throw new Error(`图片文件为空: ${imagePath}`);
    }
    
    // 图片大小检查 (超过20MB可能会导致某些OCR服务失败)
    const fileSizeMB = fileStats.size / (1024 * 1024);
    if (fileSizeMB > 20) {
      console.warn(`图片大小(${fileSizeMB.toFixed(2)}MB)较大，可能影响OCR处理性能`);
    }
  } catch (statError) {
    console.error(`检查图片文件时出错:`, statError);
    throw new Error(`无法读取图片文件: ${statError instanceof Error ? statError.message : '未知错误'}`);
  }
  
  let deepseekError = null;
  
  try {
    // 首先尝试使用DeepSeek OCR服务
    try {
      // 检查DeepSeek服务是否可用
      const connectionStatus = deepseekOcrService.getConnectionStatus();
      
      if (connectionStatus.tested && !connectionStatus.valid) {
        // DeepSeek服务已测试但不可用
        console.log("DeepSeek服务不可用，直接使用Tesseract OCR");
        throw new Error("DeepSeek连接测试失败，跳过尝试");
      }
      
      // 尝试DeepSeek OCR处理
      console.log(`尝试DeepSeek OCR处理图片: ${path.basename(imagePath)}`);
      const startTime = Date.now();
      const result = await deepseekOcrService.performOcr(imagePath);
      const processTime = Date.now() - startTime;
      
      console.log(`DeepSeek OCR处理成功, 耗时: ${processTime}ms, 置信度: ${result.confidence.toFixed(2)}, 文本长度: ${result.text.length}`);
      
      // 对提取的文本进行简单验证
      if (result.text.trim().length === 0) {
        console.warn("DeepSeek OCR未提取到有效文本，切换到Tesseract");
        throw new Error("DeepSeek OCR返回空文本");
      }
      
      return {
        text: result.text,
        confidence: result.confidence,
        source: 'deepseek' // 标记OCR源
      };
    } catch (error) {
      // 保存DeepSeek错误信息用于日志
      deepseekError = error;
      
      // 捕获特定错误类型
      let errorMessage = error instanceof Error ? error.message : String(error);
      let errorType = "未知错误";
      
      // 检查是否是网络连接错误
      if (error && typeof error === 'object' && 'code' in error) {
        const networkError = error as any;
        if (['ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET'].includes(networkError.code)) {
          errorType = "网络连接错误";
        }
      } 
      
      // 检查是否是API密钥错误
      if (errorMessage.includes('API key') || errorMessage.includes('认证失败')) {
        errorType = "API密钥错误";
      }
      
      // 检查是否是请求超时
      if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
        errorType = "请求超时";
      }
      
      console.error(`DeepSeek OCR处理失败[${errorType}]: ${errorMessage}`);
      console.log('回退到Tesseract OCR...');
      
      // 记录到error.log进行分析
      try {
        const errorLog = `[${new Date().toISOString()}] DeepSeek OCR错误: ${errorType} - ${errorMessage}\n`;
        fs.appendFileSync('error.log', errorLog);
      } catch (logError) {
        // 忽略日志写入错误
      }
      
      // 抛出异常继续流程到Tesseract
      throw error; 
    }
  } catch (error) {
    // 如果DeepSeek服务失败，则使用Tesseract作为备选
    console.log('使用Tesseract OCR作为备选...');
    
    try {
      // 使用worker创建Tesseract实例，支持中文和英文
      console.log('初始化Tesseract引擎...');
      // 使用动态导入替代require
      const tesseractModule = await import('tesseract.js');
      const { createWorker } = tesseractModule.default || tesseractModule;
      
      // 避免传递无法序列化的logger函数
      console.log('创建Tesseract worker，加载中英文语言包...');
      // 使用简化版配置，不传递logger函数
      const worker = await createWorker('chi_sim+eng');
      
      console.log('开始Tesseract文本识别...');
      const startTime = Date.now();
      
      // 识别图片文本
      const { data } = await worker.recognize(imagePath);
      const processTime = Date.now() - startTime;
      
      // 释放worker资源
      await worker.terminate();
      
      console.log(`Tesseract OCR识别成功, 耗时: ${processTime}ms, 置信度: ${data.confidence}, 文本长度: ${data.text.length}`);
      
      // 验证结果
      if (data.text.trim().length === 0) {
        throw new Error('Tesseract未识别出任何文本');
      }
      
      return {
        text: data.text,
        confidence: data.confidence / 100, // Tesseract的置信度是0-100，转换为0-1
        source: 'tesseract' // 标记OCR源
      };
    } catch (tesseractError) {
      // Tesseract也失败，记录两种OCR方法的错误
      console.error('Tesseract OCR处理失败:', tesseractError);
      console.error('所有OCR方法都失败，无法提取文本');
      
      // 合并错误信息
      const combinedError = `DeepSeek错误: ${deepseekError ? (typeof deepseekError === 'object' && 'message' in deepseekError ? deepseekError.message : String(deepseekError)) : 'N/A'}\nTesseract错误: ${typeof tesseractError === 'object' && 'message' in tesseractError ? tesseractError.message : String(tesseractError)}`;
      
      throw new Error(`文本提取失败: ${combinedError}`);
    }
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
  console.log(`处理图片: ${path.basename(imagePath)}`);
  
  try {
    // 检查文件是否存在
    if (!fs.existsSync(imagePath)) {
      throw new Error(`图片文件不存在: ${imagePath}`);
    }
    
    // 检查文件大小
    try {
      const stats = fs.statSync(imagePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      console.log(`图片大小: ${fileSizeMB.toFixed(2)} MB`);
      
      if (stats.size === 0) {
        throw new Error(`图片文件为空: ${imagePath}`);
      }
      
      if (fileSizeMB > 10) {
        console.warn(`大图片警告: ${fileSizeMB.toFixed(2)} MB超过10MB，可能会影响处理性能`);
      }
    } catch (statError) {
      console.error(`检查文件状态时出错:`, statError);
      // 继续处理，不中断流程
    }
    
    // 提取文本 - 带完整错误处理
    let ocrResult;
    try {
      ocrResult = await extractTextFromImage(imagePath);
      console.log(`成功提取文本，长度: ${ocrResult.text.length}, 置信度: ${ocrResult.confidence.toFixed(2)}`);
      
      // 验证文本内容
      if (ocrResult.text.trim().length === 0) {
        throw new Error("OCR提取的文本为空");
      }
    } catch (ocrError) {
      console.error(`OCR文本提取失败:`, ocrError);
      throw new Error(`无法从图片中提取文本: ${ocrError instanceof Error ? ocrError.message : "未知OCR错误"}`);
    }
    
    const { text, confidence, source } = ocrResult;
    
    // 记录OCR源
    console.log(`OCR引擎来源: ${source || "未知"}`);
    
    // 检测平台 - 带错误处理
    let detectedPlatform;
    try {
      detectedPlatform = detectPlatform(text);
      if (detectedPlatform) {
        console.log(`平台检测结果: ${detectedPlatform.name} (${detectedPlatform.code}), 置信度: ${detectedPlatform.confidence.toFixed(2)}%`);
      } else {
        console.log('未检测到平台信息');
        detectedPlatform = { name: '未知', code: 'unknown', confidence: 0 };
      }
    } catch (platformError) {
      console.error(`平台检测失败:`, platformError);
      detectedPlatform = { name: '未知', code: 'unknown', confidence: 0 };
    }
    
    // 从文本中提取结构化数据 - 带错误处理
    let extractedData: OcrResult['extractedData'] = {};
    try {
      extractedData = extractActivityData(text);
      console.log(`成功提取活动数据: ${Object.keys(extractedData).filter(k => extractedData[k]).length} 个字段`);
    } catch (dataExtractionError) {
      console.error(`结构化数据提取失败:`, dataExtractionError);
      // 提供基本的数据结构以保持类型兼容性
      extractedData = {
        activityName: `图片数据 ${path.basename(imagePath)}`,
        description: "自动识别失败，请手动填写活动详情",
        status: "未确定"
      };
    }
    
    // 将检测到的平台信息添加到结构化数据中
    if (detectedPlatform && detectedPlatform.code !== 'unknown') {
      extractedData.platform = detectedPlatform.name;
    }
    
    // 返回完整的OCR结果
    return {
      text,
      confidence,
      detectedPlatform,
      extractedData,
      processingTime: new Date().toISOString(),  // 添加处理时间戳
      ocrEngine: source || "standard"  // 记录使用的OCR引擎
    };
  } catch (error) {
    console.error(`图片处理完全失败:`, error);
    
    // 返回带错误信息的基本结果，确保API仍能继续工作
    return {
      text: `[图片处理错误: ${error instanceof Error ? error.message : "未知错误"}]`,
      confidence: 0.1,
      detectedPlatform: { name: '未知', code: 'unknown', confidence: 0 },
      extractedData: {
        activityName: `OCR失败 - ${path.basename(imagePath)}`,
        description: `无法处理图片: ${error instanceof Error ? error.message : "未知错误"}`,
        status: "处理失败",
        errorMessage: error instanceof Error ? error.message : "未知错误"
      },
      error: true
    };
  }
}

/**
 * 处理多张图片并合并结果
 * @param imagePaths 图片文件路径数组
 * @returns 合并后的OCR结果
 */
export async function processMultipleImages(imagePaths: string[]): Promise<OcrResult> {
  console.log(`开始批量处理 ${imagePaths.length} 张图片...`);
  
  // 检查参数
  if (!imagePaths || imagePaths.length === 0) {
    console.error("未提供有效的图片路径");
    throw new Error("需要至少一张图片进行OCR处理");
  }
  
  // 检查图片路径是否存在
  const validPaths = imagePaths.filter(path => {
    try {
      const exists = fs.existsSync(path);
      if (!exists) {
        console.warn(`图片路径无效，跳过: ${path}`);
      }
      return exists;
    } catch (error) {
      console.warn(`检查图片路径出错: ${path}`, error);
      return false;
    }
  });
  
  if (validPaths.length === 0) {
    console.error("没有有效的图片可处理");
    throw new Error("所有图片路径都无效");
  }
  
  console.log(`处理 ${validPaths.length} 张有效图片...`);
  
  // 使用 Promise.allSettled 替代 Promise.all，允许部分失败
  console.log("开始OCR处理...");
  const ocrPromises = validPaths.map(async (imagePath, index) => {
    try {
      console.log(`处理第 ${index + 1}/${validPaths.length} 张图片: ${imagePath}`);
      const result = await processImage(imagePath);
      console.log(`第 ${index + 1} 张图片处理成功，文本长度: ${result.text.length}`);
      return { success: true, result };
    } catch (error) {
      console.error(`处理第 ${index + 1} 张图片失败:`, error);
      // 返回一个基本的错误结果
      return { 
        success: false, 
        error,
        // 创建一个基本的结果以保持类型兼容
        result: {
          text: `[OCR处理失败 ${imagePath}: ${error instanceof Error ? error.message : "未知错误"}]`,
          confidence: 0.1,
          detectedPlatform: { name: "未知平台", code: "unknown", confidence: 0 },
          extractedData: {
            activityName: "OCR处理失败",
            description: "无法提取文本内容",
            status: "未确定"
          }
        }
      };
    }
  });
  
  const settledResults = await Promise.allSettled(ocrPromises);
  
  // 过滤出成功的结果
  const successfulResults = settledResults
    .filter(r => r.status === 'fulfilled' && r.value.success)
    .map(r => (r as PromiseFulfilledResult<any>).value.result);
  
  // 计算成功率
  console.log(`OCR处理完成，成功: ${successfulResults.length}/${validPaths.length}`);
  
  // 如果没有成功的结果，创建一个基本的结果
  if (successfulResults.length === 0) {
    console.error("所有图片OCR处理都失败了");
    
    return {
      text: "OCR处理失败，无法提取任何文本内容",
      confidence: 0.1,
      detectedPlatform: { name: "未知平台", code: "unknown", confidence: 0 },
      extractedData: {
        activityName: "OCR处理失败",
        description: "无法提取任何有效文本",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: "未确定"
      }
    };
  }
  
  // 使用成功的结果
  const ocrResults = successfulResults;
  
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
        'name' in bestPlatform) {
      // 类型断言确保TypeScript知道bestPlatform.name是一个字符串
      const platformName = (bestPlatform as {name: string}).name;
      mergedResult.extractedData.platform = platformName;
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