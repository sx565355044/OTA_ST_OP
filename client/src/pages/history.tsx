import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout/sidebar';
import { formatDate } from '@/lib/utils';
import { StrategyDetailModal } from '@/components/modals/strategy-detail-modal';

export default function History() {
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');

  // Fetch strategy history
  const { data: strategyHistory, isLoading } = useQuery({
    queryKey: ['/api/strategies/history', { dateRange }],
  });

  const handleViewStrategy = (strategyId: string) => {
    setSelectedStrategy(strategyId);
  };

  return (
    <Layout>
      <div className="py-6">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">历史策略记录</h1>
              <p className="mt-2 text-sm text-gray-700">
                查看您之前采用的策略及其执行结果
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => setDateRange('week')}
                  className={`relative inline-flex items-center px-3 py-2 rounded-l-md border text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                    dateRange === 'week'
                      ? 'bg-primary-50 border-primary-500 text-primary-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  近一周
                </button>
                <button
                  type="button"
                  onClick={() => setDateRange('month')}
                  className={`relative inline-flex items-center px-3 py-2 border-t border-b text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                    dateRange === 'month'
                      ? 'bg-primary-50 border-primary-500 text-primary-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  近一月
                </button>
                <button
                  type="button"
                  onClick={() => setDateRange('all')}
                  className={`relative inline-flex items-center px-3 py-2 rounded-r-md border text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                    dateRange === 'all'
                      ? 'bg-primary-50 border-primary-500 text-primary-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  全部记录
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {strategyHistory?.map((record) => (
                  <li key={record.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="material-icons text-primary-600">auto_awesome</span>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-sm font-medium text-gray-900 flex items-center">
                            {record.strategyName}
                            {record.isRecommended && (
                              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                推荐策略
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {record.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 mr-4">
                          应用于 {formatDate(record.appliedAt)}
                        </span>
                        <button
                          onClick={() => handleViewStrategy(record.strategyId)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          查看详情
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 sm:flex sm:justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="material-icons text-gray-400 mr-1 text-sm">
                          store
                        </span>
                        包含 {record.activityCount} 个活动
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <span className="material-icons text-gray-400 mr-1 text-sm">
                          person
                        </span>
                        {record.appliedBy}
                      </div>
                    </div>
                  </li>
                ))}

                {(!strategyHistory || strategyHistory.length === 0) && (
                  <li className="px-4 py-8 sm:px-6 text-center text-gray-500">
                    暂无历史策略记录
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Strategy Detail Modal */}
      {selectedStrategy && (
        <StrategyDetailModal
          strategyId={selectedStrategy}
          isOpen={!!selectedStrategy}
          onClose={() => setSelectedStrategy(null)}
          readOnly={true}
        />
      )}
    </Layout>
  );
}
