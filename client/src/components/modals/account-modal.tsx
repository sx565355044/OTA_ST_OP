import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { OtaAccount } from '@/../../shared/schema';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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
  
  // 验证验证码
  const verifyCode = async (code: string, accountData: AccountFormValues) => {
    try {
      setIsLoadingVerification(true);
      console.log('开始验证流程，验证码:', code);
      // 短暂延迟模拟网络请求
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 继续创建账户流程
      const url = isEditing 
        ? `/api/accounts/${accountId}` 
        : '/api/accounts';
      
      const method = isEditing ? 'PUT' : 'POST';
      console.log(`发送验证后的请求到 ${url}，方法: ${method}`);
      
      try {
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
            // 将验证码传给后端用于实际环境中的验证
            verificationCode: code
          }),
          credentials: 'include',
        });
        
        console.log(`请求完成，状态: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`验证请求失败: ${response.status} ${response.statusText}`, errorData);
          throw new Error(`账户${isEditing ? '更新' : '创建'}失败: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`验证请求成功:`, result);
        setIsLoadingVerification(false);
        return result;
      } catch (error) {
        console.error(`验证请求错误:`, error);
        throw error;
      }
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
    return (
      <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <div className="sm:flex sm:items-start">
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              输入携程验证码
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                请登录携程商家平台(ebooking.ctrip.com)并完成短信验证步骤，将收到的6位验证码输入下方
              </p>
            </div>
            
            <div className="mt-6 space-y-4">
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
              <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>获取验证码步骤：</strong>
                </p>
                <ol className="mt-2 text-sm text-amber-800 list-decimal pl-5 space-y-1">
                  <li>前往携程商家平台登录页面 <a href="https://ebooking.ctrip.com/home/mainland" target="_blank" className="underline">ebooking.ctrip.com</a></li>
                  <li>输入您的用户名和密码</li>
                  <li>如有提示，选择接收短信验证码的方式</li>
                  <li>系统会向您注册的手机发送6位数验证码</li>
                  <li>收到短信后回到此处输入验证码</li>
                </ol>
                <div className="mt-3 text-right">
                  <button 
                    type="button" 
                    onClick={handleCancelVerification}
                    className="text-amber-800 text-xs hover:underline inline-flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    返回上一步
                  </button>
                </div>
              </div>
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
