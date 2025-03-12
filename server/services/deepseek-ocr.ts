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
  private isInitialized: boolean = false;
  private connectionTested: boolean = false;
  private connectionValid: boolean = false;

  constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.warn('DeepSeek API key not found in environment variables, OCR functionality may be limited');
      this.apiKey = 'missing_key';
    } else {
      this.apiKey = apiKey;
      this.isInitialized = true;
      // 启动时自动测试连接
      this.testConnection().catch(err => {
        console.error("DeepSeek API 连接测试失败:", err);
      });
    }
  }
  
  /**
   * 测试DeepSeek API连接
   * @returns 连接是否有效
   */
  async testConnection(): Promise<boolean> {
    if (!this.isInitialized || this.apiKey === 'missing_key') {
      console.error("DeepSeek API密钥未配置，无法测试连接");
      this.connectionTested = true;
      this.connectionValid = false;
      return false;
    }
    
    // 超时控制，确保不会无限等待
    const timeout = (ms: number) => {
      return new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`连接超时 (${ms}ms)`)), ms)
      );
    };
    
    // 捕获所有可能的错误，包括DNS解析问题
    try {
      console.log("测试DeepSeek API连接...");
      
      // 使用超时控制的fetch请求
      const fetchPromise = fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      // 使用Promise.race在超时和正常响应之间竞争
      const response = await Promise.race([
        fetchPromise,
        timeout(8000) // 增加到8秒以适应较慢的网络
      ]);
      
      if (response.ok) {
        console.log("DeepSeek API连接测试成功");
        this.connectionTested = true;
        this.connectionValid = true;
        return true;
      } else {
        const error = await response.text();
        console.error(`DeepSeek API连接测试失败: HTTP ${response.status} - ${error}`);
        this.connectionTested = true;
        this.connectionValid = false;
        return false;
      }
    } catch (error) {
      // 提供更具体的错误信息
      let errorMessage = "未知错误";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // 检查是否是DNS解析错误
      if (error && typeof error === 'object' && 'errno' in error && 'code' in error) {
        const networkError = error as any;
        if (networkError.code === 'ENOTFOUND') {
          console.error("DeepSeek API DNS解析失败，无法解析主机名。这可能是由于网络连接问题或DNS设置问题导致。");
        } else if (networkError.code === 'ETIMEDOUT') {
          console.error("DeepSeek API连接超时，服务器未响应。");
        } else if (networkError.code === 'ECONNREFUSED') {
          console.error("DeepSeek API拒绝连接，服务器可能未运行或防火墙阻止了连接。");
        } else {
          console.error(`DeepSeek API网络错误 (${networkError.code}): ${errorMessage}`);
        }
      } else {
        console.error(`DeepSeek API连接测试异常: ${errorMessage}`);
      }
      
      this.connectionTested = true;
      this.connectionValid = false;
      return false;
    }
  }
  
  /**
   * 获取连接状态
   * @returns 连接状态对象
   */
  getConnectionStatus(): { tested: boolean; valid: boolean; apiKey: boolean } {
    return {
      tested: this.connectionTested,
      valid: this.connectionValid,
      apiKey: this.isInitialized && this.apiKey !== 'missing_key'
    };
  }

  /**
   * 使用DeepSeek R1模型进行OCR识别
   * @param imagePath 图片文件路径
   * @returns OCR识别结果
   */
  async performOcr(imagePath: string): Promise<DeepSeekOcrResponse> {
    try {
      console.log(`开始处理图片OCR: ${imagePath}`);

      // 检查API密钥是否配置
      if (!this.apiKey || this.apiKey === 'missing_key') {
        console.error("DeepSeek API密钥未配置，无法使用OCR服务");
        throw new Error("DeepSeek API密钥未配置，请在环境变量中设置DEEPSEEK_API_KEY");
      }

      // 检查文件是否存在
      if (!fs.existsSync(imagePath)) {
        console.error(`图片文件不存在: ${imagePath}`);
        throw new Error(`图片文件不存在: ${imagePath}`);
      }

      // 读取图片文件
      console.log("读取图片文件...");
      let imageBuffer;
      try {
        imageBuffer = await fs.promises.readFile(imagePath);
        console.log(`成功读取图片，大小: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
      } catch (readError) {
        console.error(`读取图片文件失败: ${readError instanceof Error ? readError.message : readError}`);
        throw new Error(`读取图片文件失败: ${readError instanceof Error ? readError.message : "未知错误"}`);
      }

      // 转换为base64，检查大小是否超出限制
      const base64Image = imageBuffer.toString('base64');
      const imageSizeInMB = (base64Image.length * 0.75) / (1024 * 1024);
      console.log(`图片base64大小: ${imageSizeInMB.toFixed(2)} MB`);

      if (imageSizeInMB > 20) {
        console.error(`图片大小(${imageSizeInMB.toFixed(2)} MB)超过DeepSeek API限制(20MB)`);
        throw new Error(`图片过大，请使用小于20MB的图片`);
      }

      // 增加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn("DeepSeek API请求即将超时，准备中止请求");
        controller.abort();
      }, 15000); // 15秒超时，更保守的设置
      
      let apiResponse: Response | null = null;
      let apiResult: DeepSeekOcrApiResponse | null = null;
      
      try {
        console.log("发送请求到DeepSeek OCR API...");

        // 记录开始时间
        const startTime = Date.now();
        
        // 调用DeepSeek AI API，根据最新文档调整请求结构
        apiResponse = await fetch(`${this.baseUrl}/inference`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'User-Agent': 'OTA-Optimizer/1.0'
          },
          body: JSON.stringify({
            model: 'deepseek-vl',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: '请执行OCR识别，提取图片中所有文本内容，特别关注任何与优惠活动、会员折扣、酒店促销等有关的信息。请以纯文本形式返回结果，不要包含解释或分析。'
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
          }),
          signal: controller.signal
        });
        
        // 记录API调用耗时
        const responseTime = Date.now() - startTime;
        console.log(`DeepSeek API响应时间: ${responseTime}ms`);
        
        // 检查响应状态
        if (!apiResponse.ok) {
          let errorMessage = apiResponse.statusText;
          let errorStatus = apiResponse.status;
          
          try {
            const errorData = await apiResponse.json() as DeepSeekOcrApiResponse;
            if (errorData.error && errorData.error.message) {
              errorMessage = errorData.error.message;
            }
          } catch (_) {
            // 忽略JSON解析错误
          }
          
          console.error(`DeepSeek API错误(${errorStatus}): ${errorMessage}`);
          throw new Error(`DeepSeek API请求失败: ${errorMessage}`);
        }
        
        // 解析API响应
        console.log("解析DeepSeek API响应...");
        try {
          apiResult = await apiResponse.json() as DeepSeekOcrApiResponse;
        } catch (jsonError) {
          console.error("解析API响应JSON失败:", jsonError);
          throw new Error("无法解析DeepSeek API响应");
        }
        
        // 从DeepSeek响应中提取文本内容
        let content = '';
        if (apiResult && apiResult.choices && 
            apiResult.choices.length > 0 && 
            apiResult.choices[0].message && 
            typeof apiResult.choices[0].message.content === 'string') {
          content = apiResult.choices[0].message.content;
        } else {
          console.warn("DeepSeek响应中未找到有效文本内容");
          if (apiResult) {
            console.log("API响应结构:", JSON.stringify(apiResult).substring(0, 200) + "...");
          }
        }
        
        // 验证提取的内容
        if (!content || content.trim().length === 0) {
          console.warn("DeepSeek OCR未返回任何文本内容");
          throw new Error("OCR识别未返回任何文本内容，图片可能不包含文字或不清晰");
        }
        
        console.log("DeepSeek OCR 提取到的文本内容长度:", content.length);
        if (content.length > 100) {
          console.log("文本样本:", content.substring(0, 100) + "...");
        }
        
        // 使用VL模型进行OCR，没有置信度数据，根据文本长度设置一个相对合理的置信度
        // 文本越长，置信度略高
        const confidenceScore = Math.min(0.95, 0.7 + (content.length / 1000) * 0.25);
        
        return {
          text: content,
          confidence: confidenceScore,
          box: undefined  // DeepSeek VL模型不提供文本框位置
        };
        
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.error("DeepSeek OCR请求超时");
            throw new Error('OCR请求超时，请检查网络连接或尝试使用较小的图片');
          }
          
          console.error("DeepSeek API调用错误:", error.message);
          throw new Error(`DeepSeek API错误: ${error.message}`);
        }
        
        console.error("未知错误:", error);
        throw new Error("DeepSeek OCR过程中发生未知错误");
      } finally {
        clearTimeout(timeoutId);
        console.log("DeepSeek OCR处理完成");
      }
    } catch (error: unknown) {
      console.error("DeepSeek OCR处理失败:", error);
      if (error instanceof Error) {
        throw new Error(`DeepSeek OCR failed: ${error.message}`);
      }
      throw new Error('DeepSeek OCR failed with unknown error');
    }
  }

  /**
   * 对多张图片进行批量OCR识别，带有错误处理
   * @param imagePaths 图片文件路径数组
   * @returns OCR识别结果数组
   */
  async performBatchOcr(imagePaths: string[]): Promise<DeepSeekOcrResponse[]> {
    console.log(`开始批量OCR处理 ${imagePaths.length} 张图片`);
    
    if (!imagePaths || imagePaths.length === 0) {
      console.error("未提供有效的图片路径");
      throw new Error("批量OCR处理需要至少一张图片");
    }
    
    // 过滤无效路径
    const validPaths = imagePaths.filter(path => {
      const exists = fs.existsSync(path);
      if (!exists) {
        console.warn(`图片路径无效，已跳过: ${path}`);
      }
      return exists;
    });
    
    if (validPaths.length === 0) {
      console.error("所有图片路径都无效");
      throw new Error("无有效图片可供OCR处理");
    }
    
    console.log(`实际处理 ${validPaths.length} 张有效图片`);
    
    // 使用Promise.allSettled代替Promise.all，确保部分失败不会导致整体失败
    const results = await Promise.allSettled(validPaths.map(async (path, index) => {
      try {
        console.log(`处理第 ${index + 1}/${validPaths.length} 张图片: ${path}`);
        return await this.performOcr(path);
      } catch (error) {
        console.error(`第 ${index + 1} 张图片OCR处理失败:`, error);
        // 返回带错误信息的占位结果
        return {
          text: `[OCR处理失败: ${error instanceof Error ? error.message : "未知错误"}]`,
          confidence: 0.1,
          error: true
        };
      }
    }));
    
    // 处理结果，将rejected的Promise转换为带错误信息的结果
    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`图片处理失败(${index + 1}/${validPaths.length}): ${result.reason}`);
        // 返回一个带错误信息的基本结果
        return {
          text: `[OCR处理失败: ${result.reason}]`,
          confidence: 0.1,
          error: true
        };
      }
    });
    
    console.log(`批量OCR处理完成，成功: ${processedResults.filter(r => !('error' in r)).length}/${processedResults.length}`);
    
    return processedResults as DeepSeekOcrResponse[];
  }
}

export const deepseekOcrService = new DeepSeekOcrService();