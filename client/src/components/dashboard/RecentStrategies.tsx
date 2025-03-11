import { useQuery } from '@tanstack/react-query';
import { Strategy } from '@shared/schema';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { Check, TrendingUp } from 'lucide-react';

export const RecentStrategies = () => {
  // Query for recent strategies
  const { data, isLoading, error } = useQuery<Strategy[]>({
    queryKey: ['/api/strategies/recent'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/strategies/recent');
        if (!response.ok) throw new Error('Failed to fetch recent strategies');
        return await response.json();
      } catch (error) {
        console.error('Error fetching recent strategies:', error);
        throw error;
      }
    }
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-neutral-500">最近执行的策略</h3>
          <Link href="/strategies" className="text-primary text-sm hover:underline">
            查看全部
          </Link>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-neutral-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-neutral-500">最近执行的策略</h3>
          <Link href="/strategies" className="text-primary text-sm hover:underline">
            查看全部
          </Link>
        </div>
        <div className="text-center py-6 text-neutral-400">
          加载策略数据时出错，请稍后再试
        </div>
      </div>
    );
  }

  const mockStrategies = [
    {
      id: 1,
      name: "国庆节促销活动组合策略",
      description: "重点参与携程和美团平台活动，飞猪平台仅参与部分房型促销。",
      activitiesAffected: 4,
      performanceMetric: "收益+12%",
      advantages: [],
      disadvantages: [],
      executionSteps: [],
      isTemplate: false,
      createdAt: new Date("2023-09-25")
    },
    {
      id: 2,
      name: "周末特惠优化策略",
      description: "针对周末入住高峰期，选择性地参与OTA平台的折扣活动。",
      activitiesAffected: 2,
      performanceMetric: "入住率+8%",
      advantages: [],
      disadvantages: [],
      executionSteps: [],
      isTemplate: false,
      createdAt: new Date("2023-09-18")
    }
  ];

  // Use mock data if no real data available
  const strategies = data && data.length > 0 ? data : mockStrategies;

  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'yyyy-MM-dd');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-neutral-500">最近执行的策略</h3>
        <Link href="/strategies" className="text-primary text-sm hover:underline">
          查看全部
        </Link>
      </div>
      
      {strategies.map((strategy) => (
        <div key={strategy.id} className="mb-4 p-4 border border-neutral-200 rounded-lg hover:border-primary transition-colors duration-200">
          <div className="flex justify-between mb-2">
            <h4 className="font-medium text-neutral-500">{strategy.name}</h4>
            <span className="text-sm text-neutral-400">{formatDate(strategy.createdAt)}</span>
          </div>
          <p className="text-sm text-neutral-400 mb-3">{strategy.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="inline-flex items-center mr-4">
                <Check className="h-4 w-4 text-[#107c10] mr-1" />
                <span className="text-xs">{strategy.activitiesAffected}个活动</span>
              </span>
              <span className="inline-flex items-center">
                <TrendingUp className="h-4 w-4 text-primary mr-1" />
                <span className="text-xs">{strategy.performanceMetric}</span>
              </span>
            </div>
            <Link href={`/strategies/${strategy.id}`}>
              <button className="text-xs text-primary hover:underline">查看详情</button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};
