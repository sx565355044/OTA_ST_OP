import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout/sidebar';
import { StrategyCard } from '@/components/strategies/strategy-card';
import { StrategyDetailModal } from '@/components/modals/strategy-detail-modal';
import { ApiKeyModal } from '@/components/modals/api-key-modal';
import { useToast } from '@/hooks/use-toast';

export default function Strategies() {
  const { toast } = useToast();
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  // Get API key status
  const { data: apiKeyStatus } = useQuery({
    queryKey: ['/api/settings/api-key/status'],
  });

  // Fetch strategy recommendations
  const { data: strategies, isLoading, refetch } = useQuery({
    queryKey: ['/api/strategies/recommendations'],
    enabled: apiKeyStatus?.configured === true,
  });

  const handleStrategySelect = (strategyId: string) => {
    setSelectedStrategy(strategyId);
  };

  const handleSetApiKey = () => {
    setIsApiKeyModalOpen(true);
  };

  const handleRefresh = () => {
    refetch();
    toast({
      description: "正在更新策略推荐...",
    });
  };

  return (
    <Layout>
      <div className="py-6">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">智能策略推荐</h1>
              <p className="mt-2 text-sm text-gray-700">
                基于当前活动和历史数据，AI为您提供最优参与策略
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                disabled={!apiKeyStatus?.configured}
              >
                <span className="material-icons text-sm mr-1">refresh</span>
                刷新策略
              </button>
              <button
                onClick={handleSetApiKey}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <span className="material-icons text-sm mr-1">vpn_key</span>
                {apiKeyStatus?.configured ? '修改API密钥' : '设置API密钥'}
              </button>
            </div>
          </div>

          {!apiKeyStatus?.configured ? (
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="material-icons text-yellow-600">warning</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">需要设置API密钥</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>请设置DeepSeek API密钥以启用智能策略功能。您的API密钥将被安全加密存储。</p>
                    <button
                      onClick={handleSetApiKey}
                      className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                      设置API密钥
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="mt-8 flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {strategies?.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  onSelect={() => handleStrategySelect(strategy.id)}
                  isRecommended={strategy.isRecommended}
                />
              ))}
              
              {(!strategies || strategies.length === 0) && (
                <div className="md:col-span-3 py-8 text-center">
                  <p className="text-gray-500">暂无策略推荐，请先确保您已添加OTA平台账户并且有活动数据</p>
                </div>
              )}
            </div>
          )}

          {/* Strategy explanation */}
          <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">什么是智能策略？</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">了解AI如何帮助您作出更好的OTA活动参与决策</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div className="prose prose-sm max-w-none text-gray-500">
                <p>智能策略系统利用DeepSeek大语言模型，分析您的OTA平台活动数据，并考虑多种因素：</p>
                <ul className="mt-2 space-y-1">
                  <li>活动折扣与平台佣金的平衡</li>
                  <li>活动时间冲突分析</li>
                  <li>流量与转化预测</li>
                  <li>历史参与记录分析</li>
                  <li>长短期收益平衡</li>
                </ul>
                <p className="mt-3">系统会根据这些分析，生成2-3种不同的策略方案，帮助您作出最优决策。每个策略都会详细说明其优势和劣势，以及具体的执行步骤。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onClose={() => setIsApiKeyModalOpen(false)} 
      />
      
      {selectedStrategy && (
        <StrategyDetailModal 
          strategyId={selectedStrategy}
          isOpen={!!selectedStrategy} 
          onClose={() => setSelectedStrategy(null)} 
        />
      )}
    </Layout>
  );
}
