/**
 * 向量存储工具
 * 负责将OCR处理后的数据转换为向量并存储
 */

import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from '@xenova/transformers';
import { OcrResult } from './ocr-processor';

// 向量数据接口
export interface VectorData {
  id: string;
  text: string;
  vector: number[];
  metadata: {
    platformId: number;
    imagePaths: string[];
    extractedData: OcrResult['extractedData'];
    createdAt: Date;
  };
}

// 向量存储类
export class VectorStorage {
  private vectorsPath: string;
  private embedder: any; // Transformer模型
  
  constructor() {
    this.vectorsPath = path.join(process.cwd(), 'data', 'vectors');
    
    // 确保存储目录存在
    if (!fs.existsSync(this.vectorsPath)) {
      fs.mkdirSync(this.vectorsPath, { recursive: true });
    }
    
    // 初始化嵌入模型
    this.initEmbedder();
  }
  
  /**
   * 初始化文本嵌入模型
   */
  private async initEmbedder() {
    try {
      // 使用多语言模型以支持中文
      this.embedder = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
      console.log('文本嵌入模型已加载');
    } catch (error) {
      console.error('加载文本嵌入模型失败:', error);
      // 出错时将embedder设为null，使用备用方法
      this.embedder = null;
    }
  }
  
  /**
   * 从文本创建嵌入向量
   * @param text 输入文本
   * @returns 嵌入向量
   */
  async textToEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.embedder) {
        // 模型未加载成功，使用简单哈希作为备用方法
        return this.simpleHashEmbedding(text);
      }
      
      const output = await this.embedder(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (error) {
      console.error('创建嵌入向量失败:', error);
      return this.simpleHashEmbedding(text);
    }
  }
  
  /**
   * 简单哈希嵌入方法（备用方案）
   * @param text 输入文本
   * @returns 简单的哈希向量
   */
  private simpleHashEmbedding(text: string): number[] {
    // 创建一个长度为256的向量，基于文本的简单哈希
    const vector = new Array(256).fill(0);
    
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      const pos = i % 256;
      vector[pos] = (vector[pos] + code / 255) % 1; // 归一化到0-1之间
    }
    
    return vector;
  }
  
  /**
   * 存储OCR结果和向量
   * @param ocrResult OCR处理结果
   * @param platformId 平台ID
   * @param imagePaths 图片路径数组
   * @returns 存储的向量数据
   */
  async storeOcrResult(ocrResult: OcrResult, platformId: number, imagePaths: string[]): Promise<VectorData> {
    try {
      console.log(`开始处理OCR结果并转换为向量数据，平台ID: ${platformId}`);
      
      // 组合所有文本，增加错误处理
      const combinedText = [
        ocrResult?.extractedData?.activityName || '',
        ocrResult?.extractedData?.description || '',
        ocrResult?.text || '无文本内容'
      ].filter(text => text).join(' ');
      
      if (combinedText.trim().length < 10) {
        console.warn(`警告: OCR提取的文本内容过少 (${combinedText.length} 字符)`);
      }
      
      // 创建向量，使用try-catch处理可能的错误
      let vector: number[] = [];
      try {
        console.log("开始创建文本嵌入向量...");
        vector = await this.textToEmbedding(combinedText);
        console.log(`向量创建成功，维度: ${vector.length}`);
      } catch (embeddingError) {
        console.error("创建文本嵌入向量失败，使用简单哈希替代:", embeddingError);
        // 使用简单哈希作为应急方案
        vector = this.simpleHashEmbedding(combinedText);
      }
      
      // 创建唯一ID，确保包含足够的随机性
      const uniqueId = `vec_${Date.now()}_${platformId}_${Math.floor(Math.random() * 100000)}`;
      
      // 创建向量数据对象
      const vectorData: VectorData = {
        id: uniqueId,
        text: combinedText,
        vector,
        metadata: {
          platformId,
          imagePaths: imagePaths || [],
          extractedData: ocrResult?.extractedData || {},
          createdAt: new Date()
        }
      };
      
      // 安全保存向量数据
      try {
        this.saveVectorData(vectorData);
        console.log(`向量数据已保存，ID: ${uniqueId}`);
      } catch (saveError) {
        console.error("保存向量数据失败:", saveError);
        // 即使保存失败，仍然返回向量数据以便继续处理
      }
      
      return vectorData;
    } catch (error) {
      console.error("存储OCR结果为向量数据时出错:", error);
      // 创建一个基本的向量数据对象作为应急方案
      return {
        id: `fallback_${Date.now()}_${platformId}`,
        text: "向量处理失败",
        vector: new Array(384).fill(0), // 创建一个全零向量
        metadata: {
          platformId,
          imagePaths: imagePaths || [],
          extractedData: ocrResult?.extractedData || {},
          createdAt: new Date()
        }
      };
    }
  }
  
  /**
   * 保存向量数据到文件
   * @param vectorData 向量数据
   */
  private saveVectorData(vectorData: VectorData): void {
    const filePath = path.join(this.vectorsPath, `${vectorData.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(vectorData, null, 2));
  }
  
  /**
   * 获取特定平台的所有向量数据
   * @param platformId 平台ID
   * @returns 向量数据数组
   */
  getVectorsByPlatform(platformId: number): VectorData[] {
    const vectors: VectorData[] = [];
    
    try {
      const files = fs.readdirSync(this.vectorsPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.vectorsPath, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as VectorData;
          
          if (data.metadata.platformId === platformId) {
            vectors.push(data);
          }
        }
      }
    } catch (error) {
      console.error('读取向量数据失败:', error);
    }
    
    return vectors;
  }
  
  /**
   * 获取所有向量数据
   * @returns 向量数据数组
   */
  getAllVectors(): VectorData[] {
    const vectors: VectorData[] = [];
    
    try {
      const files = fs.readdirSync(this.vectorsPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.vectorsPath, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as VectorData;
          vectors.push(data);
        }
      }
    } catch (error) {
      console.error('读取向量数据失败:', error);
    }
    
    return vectors;
  }
  
  /**
   * 计算两个向量之间的余弦相似度
   * @param vec1 向量1
   * @param vec2 向量2
   * @returns 相似度分数（0-1之间，1表示完全相同）
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('向量长度不匹配');
    }
    
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }
    
    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);
    
    if (mag1 === 0 || mag2 === 0) {
      return 0;
    }
    
    return dotProduct / (mag1 * mag2);
  }
  
  /**
   * 查找与给定文本最相似的向量
   * @param text 查询文本
   * @param limit 返回结果数量
   * @returns 按相似度排序的向量数据
   */
  async findSimilarVectors(text: string, limit = 5): Promise<Array<{ vector: VectorData; similarity: number }>> {
    // 将查询文本转换为向量
    const queryVector = await this.textToEmbedding(text);
    
    // 获取所有向量
    const allVectors = this.getAllVectors();
    
    // 计算相似度并排序
    const results = allVectors.map(vector => ({
      vector,
      similarity: this.cosineSimilarity(queryVector, vector.vector)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
    
    return results;
  }
}

// 创建单例实例
export const vectorStorage = new VectorStorage();