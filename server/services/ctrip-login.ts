/**
 * 携程商家平台(ebooking.ctrip.com)登录服务
 * 使用Puppeteer实现真实的登录流程，包括短信验证码验证
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { encrypt } from '../utils/crypto';
import { log } from '../vite';

// 携程商家平台登录URL
const CTRIP_LOGIN_URL = 'https://ebooking.ctrip.com/home/mainland';

/**
 * 携程商家平台登录服务
 */
export class CtripLoginService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isInitialized = false;
  private loginState: 'not_started' | 'username_entered' | 'password_entered' | 'sms_sent' | 'logged_in' | 'failed' = 'not_started';
  private cookies: any[] = [];

  /**
   * 初始化浏览器实例
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      log('[CtripLogin] 初始化浏览器...', 'ctrip');
      this.browser = await puppeteer.launch({
        headless: true, // 使用无头模式
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      this.page = await this.browser.newPage();
      
      // 设置视窗大小
      await this.page.setViewport({ width: 1280, height: 800 });
      
      // 设置超时时间为60秒
      await this.page.setDefaultNavigationTimeout(60000);
      
      // 启用请求拦截，以便日志记录和调试
      await this.page.setRequestInterception(true);
      this.page.on('request', (request) => {
        // 记录 POST 请求和登录相关的 GET 请求
        if (request.method() === 'POST' || (request.method() === 'GET' && request.url().includes('login'))) {
          log(`[CtripLogin] 请求: ${request.method()} ${request.url()}`, 'ctrip');
        }
        request.continue();
      });

      // 监听控制台消息
      this.page.on('console', (msg) => {
        log(`[CtripLogin] 浏览器控制台: ${msg.text()}`, 'ctrip');
      });

      this.isInitialized = true;
      log('[CtripLogin] 浏览器初始化完成', 'ctrip');
    } catch (error) {
      log(`[CtripLogin] 浏览器初始化失败: ${error instanceof Error ? error.message : String(error)}`, 'ctrip');
      throw new Error(`浏览器初始化失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 关闭浏览器实例
   */
  public async close(): Promise<void> {
    if (this.browser) {
      log('[CtripLogin] 关闭浏览器...', 'ctrip');
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isInitialized = false;
      this.loginState = 'not_started';
      log('[CtripLogin] 浏览器已关闭', 'ctrip');
    }
  }

  /**
   * 打开携程商家平台登录页
   */
  public async navigateToLoginPage(): Promise<void> {
    try {
      await this.initialize();
      if (!this.page) throw new Error('浏览器未初始化');

      log('[CtripLogin] 正在打开携程商家平台登录页...', 'ctrip');
      await this.page.goto(CTRIP_LOGIN_URL, { waitUntil: 'networkidle2' });
      
      // 等待登录框加载
      await this.page.waitForSelector('input[name="username"]', { timeout: 10000 })
        .catch(() => {
          throw new Error('登录页面加载失败，无法找到用户名输入框');
        });
      
      log('[CtripLogin] 登录页面加载完成', 'ctrip');
      this.loginState = 'not_started';

      // 拍摄截图用于调试（可选）
      // await this.page.screenshot({ path: 'login-page.png' });
    } catch (error) {
      log(`[CtripLogin] 打开登录页失败: ${error instanceof Error ? error.message : String(error)}`, 'ctrip');
      this.loginState = 'failed';
      throw new Error(`打开登录页失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 输入用户名和密码
   * @param username 用户名
   * @param password 密码
   */
  public async enterCredentials(username: string, password: string): Promise<void> {
    try {
      if (!this.page) throw new Error('浏览器未初始化');
      if (this.loginState === 'failed') throw new Error('登录过程已失败，请重新开始');

      log(`[CtripLogin] 正在输入用户名: ${username}`, 'ctrip');
      
      // 清空并输入用户名
      await this.page.click('input[name="username"]', { clickCount: 3 }); // 点击三次全选
      await this.page.type('input[name="username"]', username);
      this.loginState = 'username_entered';
      
      log('[CtripLogin] 正在输入密码', 'ctrip');
      
      // 清空并输入密码
      await this.page.click('input[name="password"]', { clickCount: 3 }); // 点击三次全选
      await this.page.type('input[name="password"]', password);
      this.loginState = 'password_entered';
      
      log('[CtripLogin] 凭据输入完成', 'ctrip');

      // 拍摄截图用于调试（可选）
      // await this.page.screenshot({ path: 'credentials-entered.png' });
    } catch (error) {
      log(`[CtripLogin] 输入凭据失败: ${error instanceof Error ? error.message : String(error)}`, 'ctrip');
      this.loginState = 'failed';
      throw new Error(`输入凭据失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 点击登录按钮并等待短信验证码页面
   */
  public async submitCredentialsAndWaitForSmsVerification(): Promise<void> {
    try {
      if (!this.page) throw new Error('浏览器未初始化');
      if (this.loginState !== 'password_entered') throw new Error('请先输入用户名和密码');

      log('[CtripLogin] 点击登录按钮', 'ctrip');
      
      // 查找并点击登录按钮
      const loginButtonSelector = 'button[type="submit"], button.login-button, .btn-login';
      await this.page.waitForSelector(loginButtonSelector, { visible: true, timeout: 5000 });
      await this.page.click(loginButtonSelector);
      
      // 等待页面变化，可能是短信验证码输入页面或登录成功页面
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
        .catch(() => {
          log('[CtripLogin] 等待页面导航超时，尝试检查是否有验证码输入框', 'ctrip');
        });
      
      // 检查是否出现短信验证码输入框
      const hasSmsInput = await this.page.$('input[name="smsCode"], input.sms-code-input')
        .then(element => !!element)
        .catch(() => false);
      
      if (hasSmsInput) {
        log('[CtripLogin] 已进入短信验证码页面', 'ctrip');
        this.loginState = 'sms_sent';
      } else {
        // 检查是否已登录成功
        const isLoggedIn = await this.checkIfLoggedIn();
        if (isLoggedIn) {
          log('[CtripLogin] 无需短信验证，已成功登录', 'ctrip');
          this.loginState = 'logged_in';
        } else {
          log('[CtripLogin] 未检测到验证码输入框或登录成功页面，可能遇到错误', 'ctrip');
          // 拍摄截图用于调试
          // await this.page.screenshot({ path: 'login-error.png' });
          this.loginState = 'failed';
          throw new Error('登录过程中遇到未知页面状态');
        }
      }
    } catch (error) {
      log(`[CtripLogin] 提交凭据失败: ${error instanceof Error ? error.message : String(error)}`, 'ctrip');
      this.loginState = 'failed';
      throw new Error(`提交凭据失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 输入短信验证码
   * @param smsCode 6位短信验证码
   */
  public async enterSmsVerificationCode(smsCode: string): Promise<void> {
    try {
      if (!this.page) throw new Error('浏览器未初始化');
      if (this.loginState !== 'sms_sent') throw new Error('当前状态不是等待输入短信验证码');
      if (!/^\d{6}$/.test(smsCode)) throw new Error('无效的验证码格式，应为6位数字');

      log(`[CtripLogin] 正在输入短信验证码: ${smsCode}`, 'ctrip');
      
      // 尝试不同的验证码输入框选择器
      const smsInputSelectors = [
        'input[name="smsCode"]', 
        'input.sms-code-input', 
        'input[placeholder*="验证码"]',
        'input[type="text"][maxlength="6"]'
      ];
      
      let smsInputFound = false;
      for (const selector of smsInputSelectors) {
        const smsInput = await this.page.$(selector);
        if (smsInput) {
          await smsInput.click({ clickCount: 3 }); // 点击三次全选
          await smsInput.type(smsCode);
          smsInputFound = true;
          log(`[CtripLogin] 使用选择器 ${selector} 找到验证码输入框`, 'ctrip');
          break;
        }
      }
      
      if (!smsInputFound) {
        throw new Error('无法找到短信验证码输入框');
      }
      
      // 查找并点击提交/验证按钮
      const submitButtonSelectors = [
        'button[type="submit"]', 
        'button.submit-button',
        'button.verify-button',
        'button:contains("验证")',
        'button:contains("提交")',
        'button:contains("确认")'
      ];
      
      let submitButtonFound = false;
      for (const selector of submitButtonSelectors) {
        const submitButton = await this.page.$(selector);
        if (submitButton) {
          await submitButton.click();
          submitButtonFound = true;
          log(`[CtripLogin] 使用选择器 ${selector} 找到提交按钮`, 'ctrip');
          break;
        }
      }
      
      if (!submitButtonFound) {
        throw new Error('无法找到验证码提交按钮');
      }
      
      // 等待页面加载完成
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
        .catch(() => {
          log('[CtripLogin] 等待页面导航超时，将尝试检查登录状态', 'ctrip');
        });
      
      // 检查是否登录成功
      const isLoggedIn = await this.checkIfLoggedIn();
      if (isLoggedIn) {
        log('[CtripLogin] 短信验证成功，已成功登录', 'ctrip');
        this.loginState = 'logged_in';
        
        // 保存登录后的cookies
        this.cookies = await this.page.cookies();
      } else {
        log('[CtripLogin] 验证后未能成功登录', 'ctrip');
        this.loginState = 'failed';
        throw new Error('短信验证后未能成功登录');
      }
    } catch (error) {
      log(`[CtripLogin] 输入验证码失败: ${error instanceof Error ? error.message : String(error)}`, 'ctrip');
      this.loginState = 'failed';
      throw new Error(`输入验证码失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 检查是否已成功登录
   * @returns 是否已登录
   */
  public async checkIfLoggedIn(): Promise<boolean> {
    try {
      if (!this.page) throw new Error('浏览器未初始化');
      
      // 检查URL是否包含已登录用户才能访问的路径
      const currentUrl = this.page.url();
      if (currentUrl.includes('/HotelDynamicMan/DynamicInfoNew') || 
          currentUrl.includes('/dashboard') || 
          currentUrl.includes('/user/') ||
          !currentUrl.includes('login')) {
        log(`[CtripLogin] URL检查判断已登录: ${currentUrl}`, 'ctrip');
        return true;
      }
      
      // 检查是否存在登录后才会出现的元素
      const loggedInSelectors = [
        '.user-info', 
        '.user-profile', 
        '.logout-button',
        '.username-display',
        'a:contains("退出登录")',
        'a:contains("Logout")'
      ];
      
      for (const selector of loggedInSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          log(`[CtripLogin] 元素检查判断已登录: ${selector}`, 'ctrip');
          return true;
        }
      }
      
      log('[CtripLogin] 未检测到登录状态', 'ctrip');
      return false;
    } catch (error) {
      log(`[CtripLogin] 检查登录状态失败: ${error instanceof Error ? error.message : String(error)}`, 'ctrip');
      return false;
    }
  }

  /**
   * 获取登录后的cookies
   * @returns 登录cookies或null
   */
  public getCookies(): any[] | null {
    if (this.loginState !== 'logged_in' || this.cookies.length === 0) {
      return null;
    }
    return this.cookies;
  }

  /**
   * 获取加密的cookie字符串
   * @returns 加密的cookie字符串或null
   */
  public getEncryptedCookiesString(): string | null {
    if (this.loginState !== 'logged_in' || this.cookies.length === 0) {
      return null;
    }
    
    try {
      const cookiesString = JSON.stringify(this.cookies);
      return encrypt(cookiesString);
    } catch (error) {
      log(`[CtripLogin] 加密cookies失败: ${error instanceof Error ? error.message : String(error)}`, 'ctrip');
      return null;
    }
  }

  /**
   * 获取当前登录状态
   * @returns 登录状态
   */
  public getLoginState(): string {
    return this.loginState;
  }
}

// 导出单例实例
export const ctripLoginService = new CtripLoginService();