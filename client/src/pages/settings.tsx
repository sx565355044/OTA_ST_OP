import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Layout } from '@/components/layout/sidebar';
import { ApiKeyModal } from '@/components/modals/api-key-modal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  
  // Fetch API key status
  const { data: apiKeyStatus } = useQuery({
    queryKey: ['/api/settings/api-key/status'],
  });

  // Fetch application settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: any) => {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "设置更新成功",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "设置更新失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  });

  const handleUpdateSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newSettings = {
      notificationsEnabled: formData.get('notifications') === 'on',
      autoRefreshInterval: parseInt(formData.get('autoRefreshInterval') as string),
      defaultStrategyPreference: formData.get('defaultStrategyPreference'),
    };
    
    updateSettingsMutation.mutate(newSettings);
  };

  return (
    <Layout>
      <div className="py-6">
        <div className="px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold text-gray-900">设置</h1>
          <p className="mt-2 text-sm text-gray-700">
            管理您的应用程序偏好和API密钥
          </p>

          <div className="mt-6 space-y-8">
            {/* API Key Section */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">DeepSeek API 密钥</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    用于生成智能策略推荐
                  </p>
                </div>
                <button
                  onClick={() => setIsApiKeyModalOpen(true)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <span className="material-icons text-sm mr-1">
                    {apiKeyStatus?.configured ? 'edit' : 'add'}
                  </span>
                  {apiKeyStatus?.configured ? '修改API密钥' : '设置API密钥'}
                </button>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <div className="flex items-center">
                  <span className={`material-icons mr-2 ${apiKeyStatus?.configured ? 'text-green-500' : 'text-red-500'}`}>
                    {apiKeyStatus?.configured ? 'check_circle' : 'cancel'}
                  </span>
                  <span className="text-sm text-gray-700">
                    {apiKeyStatus?.configured ? 'API密钥已配置' : 'API密钥未配置'}
                  </span>
                </div>
                {apiKeyStatus?.configured && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      最后更新: {apiKeyStatus.lastUpdated ? new Date(apiKeyStatus.lastUpdated).toLocaleString('zh-CN') : '未知'}
                    </p>
                    <p className="text-sm text-gray-500">
                      当前模型: {apiKeyStatus.model || 'DeepSeek-R1-Plus'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* User Profile Section */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">用户信息</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  您的账户详情
                </p>
              </div>
              <div className="border-t border-gray-200">
                <dl>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">用户名</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.username || ''}</dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">角色</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.role === 'admin' ? '管理员' : '酒店经理'}</dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">酒店</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.hotel || ''}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Application Preferences */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">应用设置</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  自定义您的使用体验
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <form onSubmit={handleUpdateSettings}>
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center">
                        <input
                          id="notifications"
                          name="notifications"
                          type="checkbox"
                          defaultChecked={settings?.notificationsEnabled}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700">
                          启用通知
                        </label>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        当有新活动或策略推荐时接收通知
                      </p>
                    </div>

                    <div>
                      <label htmlFor="autoRefreshInterval" className="block text-sm font-medium text-gray-700">
                        自动刷新间隔（分钟）
                      </label>
                      <div className="mt-1">
                        <select
                          id="autoRefreshInterval"
                          name="autoRefreshInterval"
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                          defaultValue={settings?.autoRefreshInterval || 30}
                        >
                          <option value="0">禁用自动刷新</option>
                          <option value="5">5分钟</option>
                          <option value="15">15分钟</option>
                          <option value="30">30分钟</option>
                          <option value="60">1小时</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="defaultStrategyPreference" className="block text-sm font-medium text-gray-700">
                        默认策略偏好
                      </label>
                      <div className="mt-1">
                        <select
                          id="defaultStrategyPreference"
                          name="defaultStrategyPreference"
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                          defaultValue={settings?.defaultStrategyPreference || 'balanced'}
                        >
                          <option value="occupancy">入住率优先</option>
                          <option value="traffic">流量优先</option>
                          <option value="balanced">平衡策略</option>
                          <option value="longTerm">长期入住</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={updateSettingsMutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        {updateSettingsMutation.isPending ? '保存中...' : '保存设置'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onClose={() => setIsApiKeyModalOpen(false)} 
      />
    </Layout>
  );
}
