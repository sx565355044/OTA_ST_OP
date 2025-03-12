/**
 * DeepSeek OCR服务
 * 使用DeepSeek R1模型进行图像文本识别
 */

import fetch from 'node-fetch';
import * as fs from 'fs';

interface DeepSeekOcrApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    code: string;
    param?: string;
    type?: string;
  };
}

interface DeepSeekOcrResponse {
  text: string;
  confidence: number;
  box?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export class DeepSeekOcrService {
  private apiKey: string;
  private baseUrl = 'https://api.deepseek.ai/v1';

  constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DeepSeek API key not found in environment variables');
    }
    this.apiKey = apiKey;
  }

  /**
   * 使用DeepSeek R1模型进行OCR识别
   * @param imagePath 图片文件路径
   * @returns OCR识别结果
   */
  async performOcr(imagePath: string): Promise<DeepSeekOcrResponse> {
    try {
      // 读取图片文件
      const imageBuffer = await fs.promises.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // 调用DeepSeek AI API，根据最新文档调整请求结构
      const response = await fetch(`${this.baseUrl}/inference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-vl',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '请执行OCR识别，提取图片中所有文本内容。请以纯文本形式返回结果，不要包含解释或分析。'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const error = await response.json() as DeepSeekOcrApiResponse;
        throw new Error(`DeepSeek API error: ${error.error?.message || response.statusText}`);
      }

      const result = await response.json() as DeepSeekOcrApiResponse;
      
      // 从DeepSeek响应中提取文本内容
      let content = '';
      if (result.choices && result.choices.length > 0 && 
          result.choices[0].message && typeof result.choices[0].message.content === 'string') {
        content = result.choices[0].message.content;
      }
      
      console.log("DeepSeek OCR 提取到的文本内容长度:", content.length);
      if (content.length > 100) {
        console.log("文本样本:", content.substring(0, 100) + "...");
      }
      
      // 使用VL模型进行OCR，没有置信度数据，设置一个较高的默认值
      return {
        text: content,
        confidence: 0.95,  // 默认较高置信度
        box: undefined     // DeepSeek VL模型不提供文本框位置
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('DeepSeek OCR error:', error.message);
        throw new Error(`DeepSeek OCR failed: ${error.message}`);
      }
      console.error('DeepSeek OCR error:', error);
      throw new Error('DeepSeek OCR failed with unknown error');
    }
  }

  /**
   * 对多张图片进行批量OCR识别
   * @param imagePaths 图片文件路径数组
   * @returns OCR识别结果数组
   */
  async performBatchOcr(imagePaths: string[]): Promise<DeepSeekOcrResponse[]> {
    return Promise.all(imagePaths.map(path => this.performOcr(path)));
  }
}

export const deepseekOcrService = new DeepSeekOcrService();