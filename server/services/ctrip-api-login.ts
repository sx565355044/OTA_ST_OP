/**
 * 携程商家平台(ebooking.ctrip.com)API登录服务
 * 使用直接API调用而不是Puppeteer，更加可靠和轻量
 */

import fetch from 'node-fetch';
import { encrypt } from '../utils/crypto';
import { log } from '../vite';

// 携程API端点
const CTRIP_API_ENDPOINTS = {
  LOGIN: 'https://ebooking.ctrip.com/api/auth/login',
  SEND_SMS: 'https://ebooking.ctrip.com/api/auth/sendSmsCode',
  VERIFY_SMS: 'https://ebooking.ctrip.com/api/auth/verifySmsCode',
  CHECK_SESSION: 'https://ebooking.ctrip.com/api/user/profile'
};

/**
 * 携程商家平台API登录服务
 */
export class CtripApiLoginService {
  private loginState: 'not_started' | 'credentials_entered' | 'sms_sent' | 'logged_in' | 'failed' = 'not_started';
  private sessionToken: string | null = null;
  private sessionCookies: string[] = [];
  private sessionData: any = null;
  private userId: string | null = null;
  private phoneNumber: string | null = null;

  /**
   * 初始化会话
   */
  public async initialize(): Promise<void> {
    log('[CtripApiLogin] 初始化会话...', 'ctrip');
    this.loginState = 'not_started';
    this.sessionToken = null;
    this.sessionCookies = [];
    this.sessionData = null;
    this.userId = null;
    this.phoneNumber = null;
    log('[CtripApiLogin] 会话初始化完成', 'ctrip');
  }

  /**
   * 使用用户名和密码登录
   * @param username 用户名
   * @param password 密码
   * @returns 登录结果对象
   */
  public async login(username: string, password: string): Promise<{
    success: boolean;
    requiresSms: boolean;
    message: string;
    phoneNumber?: string;
  }> {
    try {
      log(`[CtripApiLogin] 尝试登录用户: ${username}`, 'ctrip');
      
      // 为演示目的，我们将直接模拟API调用结果
      // 在真实集成中，应该使用实际的API endpoint
      
      // 模拟API调用
      const loginResponse = await this.simulateLoginCall(username, password);
      
      if (loginResponse.success) {
        if (loginResponse.requiresSms) {
          this.phoneNumber = loginResponse.phoneNumber || null;
          this.loginState = 'credentials_entered';
          log('[CtripApiLogin] 需要短信验证', 'ctrip');
          return {
            success: true,
            requiresSms: true,
            message: "需要短信验证",
            phoneNumber: this.phoneNumber || undefined
          };
        } else {
          // 登录成功，无需短信验证
          this.sessionToken = loginResponse.token || null;
          this.sessionCookies = loginResponse.cookies || [];
          this.sessionData = loginResponse.userData || null;
          this.loginState = 'logged_in';
          log('[CtripApiLogin] 登录成功，无需短信验证', 'ctrip');
          return {
            success: true,
            requiresSms: false,
            message: "登录成功"
          };
        }
      } else {
        this.loginState = 'failed';
        log(`[CtripApiLogin] 登录失败: ${loginResponse.message}`, 'ctrip');
        return {
          success: false,
          requiresSms: false,
          message: loginResponse.message || "用户名或密码错误"
        };
      }
    } catch (error) {
      this.loginState = 'failed';
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`[CtripApiLogin] 登录过程发生错误: ${errorMessage}`, 'ctrip');
      return {
        success: false,
        requiresSms: false,
        message: `登录过程发生错误: ${errorMessage}`
      };
    }
  }

  /**
   * 模拟登录API调用
   * 在实际实现中，这应该是一个真实的API调用
   */
  private async simulateLoginCall(username: string, password: string): Promise<any> {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 根据用户名判断是否需要短信验证
    // 在实际集成中，这应该由服务器端响应决定
    const requiresSms = true; // 假设总是需要短信验证
    
    if (username && password) {
      if (requiresSms) {
        return {
          success: true,
          requiresSms: true,
          message: "需要短信验证",
          phoneNumber: "186****1234", // 脱敏的手机号
          userId: "user_123456"
        };
      } else {
        return {
          success: true,
          requiresSms: false,
          message: "登录成功",
          token: "simulated_session_token_12345",
          cookies: ["session=abc123", "user_id=123456"],
          userData: {
            username: username,
            userId: "user_123456",
            role: "merchant"
          }
        };
      }
    } else {
      return {
        success: false,
        message: "用户名或密码错误"
      };
    }
  }

  /**
   * 发送短信验证码
   * @returns 发送结果
   */
  public async sendSmsCode(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (this.loginState !== 'credentials_entered') {
        throw new Error("请先输入登录凭据");
      }
      
      log('[CtripApiLogin] 请求发送短信验证码', 'ctrip');
      
      // 模拟API调用
      const smsResponse = await this.simulateSendSmsCall();
      
      if (smsResponse.success) {
        this.loginState = 'sms_sent';
        log('[CtripApiLogin] 短信验证码发送成功', 'ctrip');
        return {
          success: true,
          message: "短信验证码已发送"
        };
      } else {
        log(`[CtripApiLogin] 短信验证码发送失败: ${smsResponse.message}`, 'ctrip');
        return {
          success: false,
          message: smsResponse.message || "短信验证码发送失败"
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`[CtripApiLogin] 发送短信验证码过程发生错误: ${errorMessage}`, 'ctrip');
      return {
        success: false,
        message: `发送短信验证码过程发生错误: ${errorMessage}`
      };
    }
  }

  /**
   * 模拟发送短信API调用
   */
  private async simulateSendSmsCall(): Promise<any> {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      message: "短信验证码已发送",
      expiresIn: 300 // 5分钟有效期
    };
  }

  /**
   * 验证短信验证码
   * @param smsCode 短信验证码
   * @returns 验证结果
   */
  public async verifySmsCode(smsCode: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (this.loginState !== 'sms_sent') {
        throw new Error("请先请求发送短信验证码");
      }
      
      if (!smsCode || !/^\d{6}$/.test(smsCode)) {
        throw new Error("无效的验证码格式，应为6位数字");
      }
      
      log(`[CtripApiLogin] 尝试验证短信验证码: ${smsCode}`, 'ctrip');
      
      // 模拟API调用
      const verifyResponse = await this.simulateVerifySmsCall(smsCode);
      
      if (verifyResponse.success) {
        this.sessionToken = verifyResponse.token || null;
        this.sessionCookies = verifyResponse.cookies || [];
        this.sessionData = verifyResponse.userData || null;
        this.loginState = 'logged_in';
        log('[CtripApiLogin] 短信验证成功，已登录', 'ctrip');
        return {
          success: true,
          message: "验证成功，已登录"
        };
      } else {
        log(`[CtripApiLogin] 短信验证失败: ${verifyResponse.message}`, 'ctrip');
        return {
          success: false,
          message: verifyResponse.message || "验证码错误或已过期"
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`[CtripApiLogin] 验证短信验证码过程发生错误: ${errorMessage}`, 'ctrip');
      return {
        success: false,
        message: `验证短信验证码过程发生错误: ${errorMessage}`
      };
    }
  }

  /**
   * 模拟验证短信验证码API调用
   */
  private async simulateVerifySmsCall(smsCode: string): Promise<any> {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 在实际集成中，需要检查验证码是否正确
    if (smsCode === '123456') { // 假设有效的验证码是123456
      return {
        success: true,
        message: "验证成功",
        token: "simulated_session_token_12345_after_sms",
        cookies: ["session=sms_verified_abc123", "user_id=123456"],
        userData: {
          username: "demo_user",
          userId: "user_123456",
          role: "merchant"
        }
      };
    } else {
      return {
        success: false,
        message: "验证码错误或已过期"
      };
    }
  }

  /**
   * 检查是否已登录
   * @returns 是否已登录
   */
  public isLoggedIn(): boolean {
    return this.loginState === 'logged_in' && !!this.sessionToken;
  }

  /**
   * 获取当前登录状态
   * @returns 登录状态
   */
  public getLoginState(): string {
    return this.loginState;
  }

  /**
   * 获取加密的会话数据
   * @returns 加密的会话数据字符串或null
   */
  public getEncryptedSessionData(): string | null {
    if (!this.isLoggedIn() || !this.sessionData) {
      return null;
    }
    
    try {
      const sessionDataString = JSON.stringify({
        token: this.sessionToken,
        cookies: this.sessionCookies,
        userData: this.sessionData
      });
      return encrypt(sessionDataString);
    } catch (error) {
      log(`[CtripApiLogin] 加密会话数据失败: ${error instanceof Error ? error.message : String(error)}`, 'ctrip');
      return null;
    }
  }

  /**
   * 关闭会话
   */
  public close(): void {
    log('[CtripApiLogin] 关闭会话', 'ctrip');
    this.loginState = 'not_started';
    this.sessionToken = null;
    this.sessionCookies = [];
    this.sessionData = null;
    this.userId = null;
    this.phoneNumber = null;
  }
}

// 导出单例实例
export const ctripApiLoginService = new CtripApiLoginService();