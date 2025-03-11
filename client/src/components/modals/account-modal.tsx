import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { OtaAccount } from '@/../../shared/schema';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId?: number | null;
}

const accountSchema = z.object({
  platform_name: z.string().min(1, '请输入平台名称'),
  platform_url: z.string().url('请输入有效的URL地址'),
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
  verification_method: z.string(),
  phone_number: z.string()
    .optional()
    .refine(val => {
      if (!val) return true;
      // 检查中国大陆手机号格式 (1xx-xxxx-xxxx)
      return /^1[3-9]\d{9}$/.test(val);
    }, { message: '请输入有效的中国大陆手机号码' }),
  account_type: z.string().min(1, '请选择账户类型'),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export function AccountModal({ isOpen, onClose, accountId }: AccountModalProps) {
  const { toast } = useToast();
  const isEditing = accountId !== undefined && accountId !== null;
  const [showVerificationStep, setShowVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);
  const [accountCreationData, setAccountCreationData] = useState<AccountFormValues | null>(null);
  
  // Fetch account data if editing
  const { data: accountData, isLoading: isLoadingAccount } = useQuery({
    queryKey: ['/api/accounts', accountId],
    enabled: isEditing && isOpen,
    retry: 1,
  });
  
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      platform_name: '',
      platform_url: '',
      username: '',
      password: '',
      verification_method: 'none',
      phone_number: '',
      account_type: '商家账户',
    },
  });
  
  // Watch the verification method to show/hide phone number field
  const verificationMethod = watch('verification_method');
  
  // Set form values when account data is loaded
  useEffect(() => {
    if (accountData && typeof accountData === 'object') {
      const account = accountData as any; // 临时解决类型问题
      reset({
        platform_name: account.name || '',
        platform_url: account.url || '',
        username: account.username || '',
        password: '', // Don't show the actual password
        verification_method: account.verificationMethod || 'none',
        phone_number: account.phoneNumber || '',
        account_type: account.accountType || '商家账户',
      });
    } else if (!isEditing) {
      reset({
        platform_name: '',
        platform_url: '',
        username: '',
        password: '',
        verification_method: 'none',
        phone_number: '',
        account_type: '商家账户',
      });
    }
  }, [accountData, reset, isEditing]);
  
  // 提示用户关于验证码的信息
  const showVerificationInstruction = async () => {
    try {
      console.log('显示验证码说明');
      setIsLoadingVerification(true);
      // 简单模拟查询延迟
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast({
        title: "验证码说明",
        description: "请前往携程商家平台获取验证码，然后在此输入",
        variant: "default",
      });
      console.log('验证码说明显示完成，设置loading为false');
      setIsLoadingVerification(false);
      console.log('验证码说明函数返回true');
      return true;
    } catch (error) {
      console.log('验证码说明出错:', error);
      setIsLoadingVerification(false);
      toast({
        title: "操作失败",
        description: `发生错误：${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive",
      });
      return false;
    }
  };
  
  // Ctrip登录状态
  const [ctripLoginState, setCtripLoginState] = useState<string | null>(null);
  const [ctripLoginStep, setCtripLoginStep] = useState<'init' | 'credentials' | 'sms' | 'complete' | null>(null);
  
  // 初始化Ctrip登录流程
  const initCtripLogin = async () => {
    try {
      setIsLoadingVerification(true);
      setCtripLoginStep('init');
      
      const result = await apiRequest({
        url: '/api/ctrip-auth/init',
        method: 'POST'
      }) as {success: boolean; message: string; state: string};
      
      if (result.success) {
        setCtripLoginState(result.state);
        setCtripLoginStep('credentials');
        toast({
          title: "初始化成功",
          description: "已准备好携程账户验证流程",
          variant: "success",
        });
      } else {
        throw new Error(result.message || "初始化登录流程失败");
      }
      
      setIsLoadingVerification(false);
      return true;
    } catch (error) {
      console.error("初始化Ctrip登录失败:", error);
      setIsLoadingVerification(false);
      setCtripLoginStep(null);
      toast({
        title: "初始化失败",
        description: `无法启动携程验证流程：${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive",
      });
      return false;
    }
  };
  
  // 提交Ctrip凭据
  const submitCtripCredentials = async (username: string, password: string) => {
    try {
      setIsLoadingVerification(true);
      
      const result = await apiRequest({
        url: '/api/ctrip-auth/credentials',
        method: 'POST',
        data: { username, password }
      }) as {success: boolean; message: string; state: string; requiresSms: boolean; cookies?: string};
      
      if (result.success) {
        setCtripLoginState(result.state);
        
        if (result.requiresSms) {
          // 需要短信验证码
          setCtripLoginStep('sms');
          toast({
            title: "需要短信验证",
            description: "请输入您收到的短信验证码",
            variant: "warning",
          });
        } else {
          // 无需短信验证，直接登录成功
          setCtripLoginStep('complete');
          
          // 继续创建账户流程
          await createAccountWithCtripCookies(accountCreationData!, result.cookies);
          
          toast({
            title: "验证成功",
            description: "携程账户验证成功，无需短信验证",
            variant: "success",
          });
        }
      } else {
        throw new Error(result.message || "提交凭据失败");
      }
      
      setIsLoadingVerification(false);
      return true;
    } catch (error) {
      console.error("提交Ctrip凭据失败:", error);
      setIsLoadingVerification(false);
      toast({
        title: "提交凭据失败",
        description: `无法验证携程账户信息：${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive",
      });
      return false;
    }
  };
  
  // 验证短信验证码
  const verifyCtripSmsCode = async (smsCode: string) => {
    try {
      setIsLoadingVerification(true);
      
      const result = await apiRequest({
        url: '/api/ctrip-auth/verify-sms',
        method: 'POST',
        data: { smsCode }
      }) as {success: boolean; message: string; state: string; cookies?: string};
      
      if (result.success) {
        setCtripLoginState(result.state);
        setCtripLoginStep('complete');
        
        // 继续创建账户流程
        await createAccountWithCtripCookies(accountCreationData!, result.cookies);
        
        toast({
          title: "验证成功",
          description: "携程短信验证码验证成功",
          variant: "success",
        });
        
        return true;
      } else {
        throw new Error(result.message || "验证短信验证码失败");
      }
    } catch (error) {
      console.error("验证短信验证码失败:", error);
      setIsLoadingVerification(false);
      toast({
        title: "验证失败",
        description: `验证码验证失败：${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoadingVerification(false);
    }
  };
  
  // 使用Ctrip cookies创建账户
  const createAccountWithCtripCookies = async (accountData: AccountFormValues, cookies?: string) => {
    try {
      // 继续创建账户流程
      const url = isEditing 
        ? `/api/accounts/${accountId}` 
        : '/api/accounts';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: accountData.platform_name,
          url: accountData.platform_url,
          username: accountData.username,
          password: accountData.password,
          verificationMethod: accountData.verification_method,
          accountType: accountData.account_type,
          phoneNumber: accountData.phone_number,
          ctripCookies: cookies // 传递携程cookies
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`账户创建请求失败: ${response.status} ${response.statusText}`, errorData);
        throw new Error(`账户${isEditing ? '更新' : '创建'}失败: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // 刷新账户列表
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      // 重置状态
      setShowVerificationStep(false);
      setAccountCreationData(null);
      setVerificationCode('');
      setCtripLoginStep(null);
      setCtripLoginState(null);
      
      return result;
    } catch (error) {
      console.error(`创建账户错误:`, error);
      toast({
        title: "账户创建失败",
        description: `无法创建携程账户: ${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive",
      });
      throw error;
    }
  };
  
  // 清理Ctrip登录会话
  const cleanupCtripSession = async () => {
    try {
      await apiRequest({
        url: '/api/ctrip-auth/close',
        method: 'POST'
      });
    } catch (error) {
      console.error("关闭Ctrip会话失败:", error);
    }
  };
  
  // 验证验证码
  const verifyCode = async (code: string, accountData: AccountFormValues) => {
    try {
      setIsLoadingVerification(true);
      console.log('开始验证流程，验证码:', code);
      
      // 使用真实的携程SMS验证
      const success = await verifyCtripSmsCode(code);
      
      if (!success) {
        throw new Error("验证码验证失败");
      }
      
      setIsLoadingVerification(false);
      return { success: true };
    } catch (error) {
      setIsLoadingVerification(false);
      toast({
        title: "验证失败",
        description: `验证码验证失败：${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive",
      });
      throw error;
    }
  };
  
  // Create/Update account mutation
  const accountMutation = useMutation({
    mutationFn: async (data: AccountFormValues) => {
      // 如果需要短信验证，显示验证码输入界面
      console.log('账户处理函数:', data);
      console.log('需要短信验证:', data.verification_method === 'sms');
      console.log('是否编辑模式:', isEditing);
      if (data.verification_method === 'sms' && !isEditing) {
        console.log('需要SMS验证，准备显示验证码界面');
        // 先保存表单数据
        setAccountCreationData(data);
        
        // 直接显示验证码界面，简化流程
        console.log('直接设置showVerificationStep为true');
        setShowVerificationStep(true);
        
        // 显示一个提示
        toast({
          title: "验证码说明",
          description: "请前往携程商家平台获取验证码，然后在此输入",
          variant: "default",
        });
        
        // 这里返回一个空对象，因为实际的账户创建会在验证码确认后进行
        return {} as any;
      }
      
      // 如果不需要验证或者是编辑现有账户，直接保存
      const url = isEditing 
        ? `/api/accounts/${accountId}` 
        : '/api/accounts';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      try {
        console.log(`发送请求到 ${url}，方法: ${method}`);
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: data.platform_name,
            url: data.platform_url,
            username: data.username,
            password: data.password,
            verificationMethod: data.verification_method,
            accountType: data.account_type,
            phoneNumber: data.phone_number, // 添加手机号
          }),
          credentials: 'include',
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`请求失败: ${response.status} ${response.statusText}`, errorData);
          throw new Error(`账户${isEditing ? '更新' : '创建'}失败: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`请求成功:`, result);
        return result;
      } catch (error) {
        console.error(`请求错误:`, error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Mutation成功:', data, '验证步骤:', showVerificationStep);
      
      // 如果已经显示验证码界面，不要关闭或显示成功提示，等待验证码确认
      if (showVerificationStep) {
        console.log('已经在验证码步骤，不执行额外操作');
        return;
      }
      
      // 如果是非SMS验证或编辑模式，刷新数据并显示成功提示
      if (isEditing || !verificationMethod || verificationMethod === 'none') {
        console.log('非SMS验证流程，刷新数据');
        queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        toast({
          title: isEditing ? "账户更新成功" : "账户添加成功",
          description: isEditing 
            ? "OTA平台账户信息已成功更新" 
            : "OTA平台账户已成功添加到系统",
          variant: "success",
        });
        onClose();
      }
    },
    onError: (error) => {
      toast({
        title: isEditing ? "账户更新失败" : "账户添加失败",
        description: `操作出错: ${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive",
      });
    }
  });
  
  // 处理验证码确认
  const handleVerifyCode = async () => {
    if (!accountCreationData) return;
    
    try {
      // 验证码验证并创建账户
      const result = await verifyCode(verificationCode, accountCreationData);
      
      // 成功后刷新列表和统计数据
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      toast({
        title: "账户添加成功",
        description: "OTA平台账户已成功添加到系统",
        variant: "success",
      });
      
      // 关闭模态框
      setShowVerificationStep(false);
      setAccountCreationData(null);
      setVerificationCode('');
      onClose();
    } catch (error) {
      // 错误已在verifyCode中处理
    }
  };
  
  // 取消验证码输入，返回到表单
  const handleCancelVerification = () => {
    setShowVerificationStep(false);
    setAccountCreationData(null);
    setVerificationCode('');
  };
  
  const onSubmit = (data: AccountFormValues) => {
    console.log('表单提交:', data);
    console.log('验证方式:', data.verification_method);
    accountMutation.mutate(data);
  };
  
  if (!isOpen) return null;

  // 验证码输入界面
  const renderVerificationStep = () => {
    // 根据ctripLoginStep显示不同的验证步骤
    if (!ctripLoginStep && !isLoadingVerification) {
      // 初始化状态，显示启动验证按钮
      return (
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                携程账户验证
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  添加携程账户需要进行实时验证流程，系统将自动连接到携程商家平台并协助您完成登录验证
                </p>
              </div>
              
              <div className="mt-6 space-y-4">
                {accountCreationData?.phone_number && (
                  <div className="text-center mb-2">
                    <p className="text-sm text-gray-600">
                      验证将使用手机号 <span className="font-medium text-gray-800">{accountCreationData.phone_number}</span>
                    </p>
                  </div>
                )}
                
                <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">验证说明</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc space-y-1 pl-5">
                          <li>系统将自动连接携程商家平台</li>
                          <li>您需要输入携程账户用户名和密码</li>
                          <li>如果系统要求短信验证，您需要输入收到的验证码</li>
                          <li>验证成功后，账户将自动添加到系统</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center space-x-3">
                  <button
                    type="button"
                    onClick={handleCancelVerification}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    返回
                  </button>
                  <button
                    type="button"
                    onClick={() => initCtripLogin()}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    开始验证
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // 加载状态
    if (isLoadingVerification) {
      return (
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                正在处理
              </h3>
              <div className="mt-6 flex flex-col items-center justify-center py-8">
                <Loader2 className="h-12 w-12 text-primary-500 animate-spin mb-4" />
                <p className="text-sm text-gray-500">
                  {ctripLoginStep === 'init' && '正在连接携程商家平台...'}
                  {ctripLoginStep === 'credentials' && '正在验证账户信息...'}
                  {ctripLoginStep === 'sms' && '正在验证短信验证码...'}
                  {ctripLoginStep === 'complete' && '验证成功，正在创建账户...'}
                  {!ctripLoginStep && '正在处理请求...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // 凭据输入步骤
    if (ctripLoginStep === 'credentials') {
      return (
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                输入携程账户信息
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  请输入您的携程商家平台账户用户名和密码
                </p>
              </div>
              
              <div className="mt-6 space-y-4">
                {accountCreationData && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700">用户名</label>
                      <input
                        type="text"
                        id="username"
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        defaultValue={accountCreationData.username}
                        disabled
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">密码</label>
                      <input
                        type="password"
                        id="password"
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        defaultValue={accountCreationData.password}
                        disabled
                      />
                    </div>
                    
                    <div className="flex justify-center space-x-3 mt-4">
                      <button
                        type="button"
                        onClick={handleCancelVerification}
                        className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => submitCtripCredentials(accountCreationData.username, accountCreationData.password)}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        验证
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // 短信验证码输入步骤
    if (ctripLoginStep === 'sms') {
      return (
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                输入携程验证码
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  携程已向您的手机发送了短信验证码，请输入6位验证码
                </p>
              </div>
              
              <div className="mt-6 space-y-4">
                {accountCreationData?.phone_number && (
                  <div className="text-center mb-2">
                    <p className="text-sm text-gray-600">
                      验证码已发送到手机号 <span className="font-medium text-gray-800">{accountCreationData.phone_number}</span>
                    </p>
                  </div>
                )}
                <div className="flex justify-center mb-4">
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={(value) => {
                      console.log('验证码输入:', value);
                      setVerificationCode(value);
                    }}
                    containerClassName="gap-2 has-[:disabled]:opacity-50"
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot 
                          key={index} 
                          index={index} 
                          className="w-12 h-12 text-xl border-gray-300 rounded-md focus:border-primary-500 focus:ring-primary-500" 
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="text-center mb-4">
                  <span className="text-sm text-gray-500">
                    已输入: {verificationCode.length}/6 位
                  </span>
                </div>
                
                <div className="flex justify-center space-x-3 mt-4">
                  <button
                    type="button"
                    onClick={handleCancelVerification}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifyCode()}
                    disabled={verificationCode.length !== 6}
                    className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                      verificationCode.length === 6 
                        ? 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500' 
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    验证
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // 完成步骤
    if (ctripLoginStep === 'complete') {
      return (
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                验证成功
              </h3>
              <div className="mt-6 flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-sm text-gray-500">
                  携程账户验证成功，账户已添加
                </p>
                
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // 默认显示（不应该走到这里）
    return (
      <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <div className="sm:flex sm:items-start">
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              携程账户验证
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                验证状态错误，请返回重试
              </p>
            </div>
            
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleCancelVerification}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                返回
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 账户创建表单界面
  const renderAccountForm = () => {
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {isEditing ? "编辑OTA平台账户" : "添加OTA平台账户"}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  请提供您OTA平台的登录信息，以便系统获取活动数据。您的信息将被安全加密存储。
                </p>
              </div>
              
              {isLoadingAccount ? (
                <div className="mt-4 flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="platform_name" className="block text-sm font-medium text-gray-700">平台名称</label>
                    <input
                      {...register('platform_name')}
                      id="platform_name"
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="例如：携程、美团、飞猪"
                    />
                    {errors.platform_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.platform_name.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="platform_url" className="block text-sm font-medium text-gray-700">平台URL</label>
                    <input
                      {...register('platform_url')}
                      id="platform_url"
                      type="url"
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="https://merchant.example.com"
                    />
                    {errors.platform_url && (
                      <p className="mt-1 text-sm text-red-600">{errors.platform_url.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">用户名</label>
                    <input
                      {...register('username')}
                      id="username"
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                    {errors.username && (
                      <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">密码</label>
                    <input
                      {...register('password')}
                      id="password"
                      type="password"
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder={isEditing ? "保持空白则不更改密码" : ""}
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="verification_method" className="block text-sm font-medium text-gray-700">验证方式</label>
                    <select
                      {...register('verification_method')}
                      id="verification_method"
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="none">无需验证</option>
                      <option value="sms">短信验证码</option>
                      <option value="email">邮箱验证码</option>
                      <option value="captcha">图形验证码</option>
                    </select>
                  </div>
                  
                  {verificationMethod === 'sms' && (
                    <>
                      <div className="mt-4">
                        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">手机号码</label>
                        <input
                          {...register('phone_number')}
                          id="phone_number"
                          type="tel"
                          className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          placeholder="请输入接收验证码的手机号码"
                        />
                        {errors.phone_number && (
                          <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
                        )}
                      </div>
                    
                      <div className="p-3 bg-blue-50 rounded-md border border-blue-200 mt-2">
                        <p className="text-sm text-blue-800">
                          <strong>携程验证码登录说明：</strong> 携程商家平台(ebooking.ctrip.com)使用短信验证码进行安全登录。
                          选择此项后，您需要前往携程平台获取6位验证码并输入到我们的系统以完成账户添加。
                        </p>
                        <div className="mt-2">
                          <a 
                            href="https://ebooking.ctrip.com/home/mainland" 
                            target="_blank" 
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            访问携程商家平台
                          </a>
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label htmlFor="account_type" className="block text-sm font-medium text-gray-700">账户类型</label>
                    <select
                      {...register('account_type')}
                      id="account_type"
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option>商家账户</option>
                      <option>企业账户</option>
                      <option>合作伙伴账户</option>
                      <option>其他</option>
                    </select>
                    {errors.account_type && (
                      <p className="mt-1 text-sm text-red-600">{errors.account_type.message}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="submit"
            disabled={isSubmitting || isLoadingAccount}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
          >
            {isSubmitting 
              ? '保存中...' 
              : isEditing 
                ? '保存修改' 
                : '添加账户'}
          </button>
          {process.env.NODE_ENV === 'development' && (
            <button
              type="button"
              onClick={() => {
                // 用于测试的直接跳转到验证码界面的功能
                if (!isEditing && verificationMethod === 'sms') {
                  console.log('直接跳转到验证码界面');
                  // 创建一个模拟表单数据
                  const mockData: AccountFormValues = {
                    platform_name: '携程商家平台',
                    platform_url: 'https://ebooking.ctrip.com/home/mainland',
                    username: 'test_user',
                    password: 'password123',
                    verification_method: 'sms',
                    phone_number: '13812345678',
                    account_type: '商家账户'
                  };
                  setAccountCreationData(mockData);
                  setShowVerificationStep(true);
                }
              }}
              className="bg-blue-500 text-white mr-2 px-4 py-2 rounded-md sm:ml-2 sm:w-auto sm:text-sm"
            >
              测试验证码界面
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            取消
          </button>
        </div>
      </form>
    );
  };

  // 验证码确认界面的按钮
  const renderVerificationButtons = () => {
    return (
      <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <button
          type="button"
          onClick={handleVerifyCode}
          disabled={verificationCode.length !== 6 || isLoadingVerification}
          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
        >
          {isLoadingVerification ? '验证中...' : '验证并添加账户'}
        </button>
        <button
          type="button"
          onClick={handleCancelVerification}
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
        >
          返回
        </button>
      </div>
    );
  };

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {showVerificationStep ? (
            <>
              {renderVerificationStep()}
              {renderVerificationButtons()}
            </>
          ) : (
            renderAccountForm()
          )}
        </div>
      </div>
    </div>
  );
}
