import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const apiKeySchema = z.object({
  api_key: z.string().min(1, '请输入API密钥'),
  api_model: z.string().min(1, '请选择模型'),
});

type ApiKeyFormValues = z.infer<typeof apiKeySchema>;

export function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Fetch API key status
  const { data: apiKeyStatus } = useQuery({
    queryKey: ['/api/settings/api-key/status'],
    enabled: isOpen,
  });
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      api_key: '',
      api_model: 'DeepSeek-R1-Plus',
    },
  });
  
  // Set default model value from API status
  useEffect(() => {
    if (apiKeyStatus?.model) {
      setValue('api_model', apiKeyStatus.model);
    }
  }, [apiKeyStatus, setValue]);
  
  // Save API key mutation
  const apiKeyMutation = useMutation({
    mutationFn: async (data: ApiKeyFormValues) => {
      const response = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: data.api_key,
          model: data.api_model,
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to save API key');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/api-key/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategies/recommendations'] });
      toast({
        title: "API密钥已保存",
        description: "DeepSeek API密钥已成功保存并加密存储",
        variant: "success",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "保存失败",
        description: `无法保存API密钥: ${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: ApiKeyFormValues) => {
    apiKeyMutation.mutate(data);
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
                  <div className="flex items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      DeepSeek API 设置
                    </h3>
                    <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <span className="material-icons text-xs mr-1">security</span>
                      安全加密
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      请提供您的DeepSeek API密钥，以启用智能策略功能。API密钥将被安全加密存储。
                    </p>
                  </div>
                  
                  <div className="mt-6">
                    <label htmlFor="api_key" className="block text-sm font-medium text-gray-700">API密钥</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        {...register('api_key')}
                        type={showApiKey ? "text" : "password"}
                        id="api_key"
                        className="focus:ring-primary-500 focus:border-primary-500 flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300"
                        placeholder="sk-xxxxxxxxxxxxxxxxxxxxx"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-md hover:bg-gray-100"
                      >
                        <span className="material-icons text-sm">
                          {showApiKey ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {errors.api_key && (
                      <p className="mt-1 text-sm text-red-600">{errors.api_key.message}</p>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <label htmlFor="api_model" className="block text-sm font-medium text-gray-700">模型选择</label>
                    <select
                      {...register('api_model')}
                      id="api_model"
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option>DeepSeek-R1-Plus</option>
                      <option>DeepSeek-R1</option>
                      <option>DeepSeek-Coder</option>
                    </select>
                    {errors.api_model && (
                      <p className="mt-1 text-sm text-red-600">{errors.api_model.message}</p>
                    )}
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-xs text-gray-500">
                      如何获取DeepSeek API密钥？ <a href="https://platform.deepseek.com/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-500">查看指南</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? '保存中...' : '保存密钥'}
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
