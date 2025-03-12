/**
 * OCR处理工具
 * 负责从上传的图片中提取文本和结构化数据
 */

import * as path from 'path';
import * as fs from 'fs';
import { createWorker } from 'tesseract.js';

// OCR处理结果接口
export interface OcrResult {
  text: string;
  confidence: number;
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  extractedData: {
    activityName?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    discount?: string;
    commissionRate?: string;
    status?: string;
    tag?: string;
  };
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
  
  // 活动名称 - 寻找"活动名称"或"活动标题"后的内容
  const activityNameMatch = text.match(/(?:活动名称|活动标题)[：:]\s*([^\n]+)/i);
  if (activityNameMatch && activityNameMatch[1]) {
    result.activityName = activityNameMatch[1].trim();
  }
  
  // 活动描述 - 寻找"活动描述"或"活动详情"后的内容
  const descriptionMatch = text.match(/(?:活动描述|活动详情)[：:]\s*([^\n]+)/i);
  if (descriptionMatch && descriptionMatch[1]) {
    result.description = descriptionMatch[1].trim();
  }
  
  // 开始日期 - 寻找"开始"、"起始"日期格式
  const startDateMatch = text.match(/(?:开始日期|开始时间|活动开始)[：:]\s*(\d{4}[-./]\d{1,2}[-./]\d{1,2})/i);
  if (startDateMatch && startDateMatch[1]) {
    result.startDate = startDateMatch[1].replace(/[./]/g, '-');
  }
  
  // 结束日期 - 寻找"结束"、"截止"日期格式
  const endDateMatch = text.match(/(?:结束日期|结束时间|活动结束)[：:]\s*(\d{4}[-./]\d{1,2}[-./]\d{1,2})/i);
  if (endDateMatch && endDateMatch[1]) {
    result.endDate = endDateMatch[1].replace(/[./]/g, '-');
  }
  
  // 折扣信息 - 寻找百分比或折扣字样
  const discountMatch = text.match(/(?:折扣|优惠)[：:]\s*([0-9.]+[%％折])/i);
  if (discountMatch && discountMatch[1]) {
    result.discount = discountMatch[1];
  }
  
  // 佣金比例 - 寻找佣金或分成比例
  const commissionMatch = text.match(/(?:佣金|分成)[：:]\s*([0-9.]+[%％])/i);
  if (commissionMatch && commissionMatch[1]) {
    result.commissionRate = commissionMatch[1];
  }
  
  // 活动状态
  if (text.includes('进行中') || text.includes('已开始')) {
    result.status = '进行中';
  } else if (text.includes('未开始') || text.includes('即将开始') || text.includes('预热中')) {
    result.status = '待开始';
  } else if (text.includes('已结束') || text.includes('已过期')) {
    result.status = '已结束';
  } else {
    result.status = '未决定';
  }
  
  // 活动标签
  if (text.includes('限时') || text.includes('闪购')) {
    result.tag = '限时';
  } else if (text.includes('爆款') || text.includes('热销')) {
    result.tag = '爆款';
  } else if (text.includes('新品') || text.includes('新上线')) {
    result.tag = '新品';
  } else if (text.includes('促销') || text.includes('特价')) {
    result.tag = '促销';
  }
  
  return result;
}

/**
 * 处理单张图片并提取活动数据
 * @param imagePath 图片文件路径
 * @returns 提取的OCR结果，包含文本和结构化数据
 */
export async function processImage(imagePath: string): Promise<OcrResult> {
  // 提取文本
  const { text, confidence } = await extractTextFromImage(imagePath);
  
  // 从文本中提取结构化数据
  const extractedData = extractActivityData(text);
  
  return {
    text,
    confidence,
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
  
  return mergedResult;
}