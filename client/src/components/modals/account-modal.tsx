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
  phone_number: z.string().optional().refine(
    val => val === undefined || val === '' || /^1[3-9]\d{9}$/.test(val),
    {
      message: '请输入有效的手机号码',
    }
  ),
  account_type: z.string().min(1, '请选择账户类型'),
}).refine(
  data => !(data.verification_method === 'sms' && (!data.phone_number || data.phone_number.trim() === '')), 
  {
    message: '选择手机验证码时，请输入手机号',
    path: ['phone_number']
  }
);

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
  });
  
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
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
  
  // 请求验证码的功能
  const requestVerificationCode = async (phone: string) => {
    try {
      setIsLoadingVerification(true);
      // 这里是模拟请求验证码，在实际环境中会通过API请求发送短信
      await new Promise(resolve => setTimeout(resolve, 1500)); // 模拟网络延迟
      toast({
        title: "验证码已发送",
        description: `验证码已发送到手机 ${phone}，请输入6位数字验证码`,
        variant: "default",
      });
      setIsLoadingVerification(false);
      return true;
    } catch (error) {
      setIsLoadingVerification(false);
      toast({
        title: "发送验证码失败",
        description: `无法发送验证码：${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive",
      });
      return false;
    }
  };
  
  // 验证验证码
  const verifyCode = async (code: string, accountData: AccountFormValues) => {
    try {
      setIsLoadingVerification(true);
      // 这里是模拟验证码验证过程，在实际环境中会通过API验证
      await new Promise(resolve => setTimeout(resolve, 1500)); // 模拟网络延迟
      
      // 假设验证成功，继续创建账户流程
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
          phoneNumber: accountData.verification_method === 'sms' ? accountData.phone_number : null,
          type: accountData.account_type,
          // 在实际实现中，也可以将验证码传给后端进行二次验证
          verificationCode: code
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} account`);
      }
      
      setIsLoadingVerification(false);
      return await response.json();
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
      if (data.verification_method === 'sms' && !isEditing) {
        // 先保存表单数据
        setAccountCreationData(data);
        // 请求发送验证码
        const codeRequested = await requestVerificationCode(data.phone_number || '');
        if (codeRequested) {
          setShowVerificationStep(true);
          // 这里返回一个空对象，因为实际的账户创建会在验证码确认后进行
          return {} as any;
        } else {
          throw new Error('无法发送验证码');
        }
      }
      
      // 如果不需要验证或者是编辑现有账户，直接保存
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
          name: data.platform_name,
          url: data.platform_url,
          username: data.username,
          password: data.password,
          verificationMethod: data.verification_method,
          phoneNumber: data.verification_method === 'sms' ? data.phone_number : null,
          type: data.account_type,
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} account`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // 如果显示的是验证码界面，不要关闭或显示成功提示，等待验证码确认
      if (showVerificationStep) return;
      
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
              输入验证码
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                验证码已发送到您的手机 {accountCreationData?.phone_number}，请输入短信中的6位数字验证码
              </p>
            </div>
            
            <div className="mt-6 space-y-4">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  render={({ slots }) => (
                    <InputOTPGroup>
                      {slots.map((slot, index) => (
                        <InputOTPSlot key={index} {...slot} index={index} className="w-12 h-12 text-xl" />
                      ))}
                    </InputOTPGroup>
                  )}
                />
              </div>
              <p className="text-xs text-center text-gray-500 mt-2">
                未收到验证码？ 
                <button 
                  type="button" 
                  onClick={() => requestVerificationCode(accountCreationData?.phone_number || '')}
                  disabled={isLoadingVerification}
                  className="text-primary-600 hover:text-primary-800 ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  重新发送
                </button>
              </p>
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
                    <div>
                      <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">手机号</label>
                      <input
                        {...register('phone_number')}
                        id="phone_number"
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="请输入接收验证码的手机号"
                      />
                      {errors.phone_number && (
                        <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        登录携程平台时，系统将自动发送验证码到此手机号
                      </p>
                    </div>
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
