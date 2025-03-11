import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout/sidebar';
import { StatCard } from '@/components/dashboard/stat-card';
import { AccountsTable } from '@/components/tables/accounts-table';
import { ActivitiesTable } from '@/components/tables/activities-table';
import { StrategyCard } from '@/components/strategies/strategy-card';
import { AccountModal } from '@/components/modals/account-modal';
import { ApiKeyModal } from '@/components/modals/api-key-modal';
import { StrategyDetailModal } from '@/components/modals/strategy-detail-modal';

export default function Dashboard() {
  // State for modals
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  // Fetch dashboard data
  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    staleTime: 60 * 1000, // 1 minute
  });

  const { data: accounts } = useQuery({
    queryKey: ['/api/accounts'],
    staleTime: 60 * 1000, // 1 minute
  });

  const { data: activities } = useQuery({
    queryKey: ['/api/activities'],
    staleTime: 60 * 1000, // 1 minute
  });

  const { data: strategies } = useQuery({
    queryKey: ['/api/strategies/recommendations'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle strategy selection
  const handleStrategySelect = (strategyId: string) => {
    setSelectedStrategy(strategyId);
  };

  return (
    <Layout>
      <div className="py-6">
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Dashboard stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard 
              title="连接平台" 
              value={dashboardStats?.connectedPlatformsCount || '0'} 
              icon="devices" 
              linkText="查看详情" 
              linkUrl="/accounts" 
            />
            <StatCard 
              title="今日活动" 
              value={dashboardStats?.todayActivitiesCount || '0'} 
              icon="event" 
              iconBgColor="bg-accent-100" 
              iconColor="text-accent-500" 
              linkText="查看详情" 
              linkUrl="/activities" 
            />
            <StatCard 
              title="正在参与" 
              value={dashboardStats?.activeParticipationCount || '0'} 
              icon="check_circle" 
              iconBgColor="bg-green-100" 
              iconColor="text-green-600" 
              linkText="查看详情" 
              linkUrl="/activities?status=active" 
            />
          </div>

          {/* OTA Platform Accounts Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg leading-6 font-medium text-gray-900">OTA平台账户</h2>
              <button 
                onClick={() => setIsAccountModalOpen(true)}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span className="material-icons text-sm mr-1">add</span>
                添加账户
              </button>
            </div>
            
            <AccountsTable 
              accounts={accounts || []} 
              showActions={true} 
              className="mt-4" 
            />
          </div>

          {/* Current Activities Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg leading-6 font-medium text-gray-900">当前活动</h2>
              <div className="flex space-x-3">
                <button className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <span className="material-icons text-sm mr-1">refresh</span>
                  刷新
                </button>
                <button className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <span className="material-icons text-sm mr-1">filter_list</span>
                  筛选
                </button>
              </div>
            </div>

            <ActivitiesTable 
              activities={activities || []} 
              showActions={true} 
              className="mt-4" 
            />
          </div>

          {/* Smart Strategy Section */}
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">智能策略推荐</h3>
                  <button 
                    onClick={() => setIsApiKeyModalOpen(true)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <span className="material-icons text-sm mr-1">vpn_key</span>
                    设置API密钥
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  基于当前活动和历史数据，AI为您提供最优策略建议
                </p>
              </div>
              
              <div className="px-6 py-5 grid grid-cols-1 gap-6 md:grid-cols-3">
                {strategies?.map((strategy) => (
                  <StrategyCard
                    key={strategy.id}
                    strategy={strategy}
                    onSelect={() => handleStrategySelect(strategy.id)}
                    isRecommended={strategy.isRecommended}
                  />
                ))}
                
                {!strategies || strategies.length === 0 ? (
                  <div className="md:col-span-3 py-8 text-center">
                    <p className="text-gray-500">请设置DeepSeek API密钥以获取策略推荐</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AccountModal 
        isOpen={isAccountModalOpen} 
        onClose={() => setIsAccountModalOpen(false)} 
      />
      
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
