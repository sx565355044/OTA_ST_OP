import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

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
  account_type: z.string().min(1, '请选择账户类型'),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export function AccountModal({ isOpen, onClose, accountId }: AccountModalProps) {
  const { toast } = useToast();
  const isEditing = accountId !== undefined && accountId !== null;
  
  // Fetch account data if editing
  const { data: accountData, isLoading: isLoadingAccount } = useQuery({
    queryKey: ['/api/accounts', accountId],
    enabled: isEditing && isOpen,
  });
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      platform_name: '',
      platform_url: '',
      username: '',
      password: '',
      account_type: '商家账户',
    },
  });
  
  // Set form values when account data is loaded
  useEffect(() => {
    if (accountData) {
      reset({
        platform_name: accountData.name,
        platform_url: accountData.url,
        username: accountData.username,
        password: '', // Don't show the actual password
        account_type: accountData.type,
      });
    } else if (!isEditing) {
      reset({
        platform_name: '',
        platform_url: '',
        username: '',
        password: '',
        account_type: '商家账户',
      });
    }
  }, [accountData, reset, isEditing]);
  
  // Create/Update account mutation
  const accountMutation = useMutation({
    mutationFn: async (data: AccountFormValues) => {
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
  
  const onSubmit = (data: AccountFormValues) => {
    accountMutation.mutate(data);
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
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
        </div>
      </div>
    </div>
  );
}
