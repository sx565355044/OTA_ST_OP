import React from 'react';

interface Strategy {
  id: string;
  name: string;
  description: string;
  isRecommended: boolean;
  metrics: {
    projectedGrowth: {
      value: string;
      percentage: number;
      type: string;
    };
    complexity: {
      value: string;
      percentage: number;
    };
  };
}

interface StrategyCardProps {
  strategy: Strategy;
  onSelect: () => void;
  isRecommended?: boolean;
}

export function StrategyCard({ strategy, onSelect, isRecommended }: StrategyCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className={`px-4 py-5 ${isRecommended ? 'bg-primary-50' : 'bg-gray-50'} border-b border-gray-200`}>
        <div className="flex items-center justify-between">
          <h4 className={`text-base font-medium ${isRecommended ? 'text-primary-800' : 'text-gray-800'}`}>
            {strategy.name}
          </h4>
          <span className={`px-2 py-1 rounded text-xs font-medium ${isRecommended ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-800'}`}>
            {isRecommended ? '推荐' : '备选'}
          </span>
        </div>
      </div>
      <div className="px-4 py-4 space-y-3">
        <div>
          <p className="text-sm text-gray-600">{strategy.description}</p>
        </div>
        <div>
          <div className="flex items-center mb-1">
            <div className="text-xs font-medium text-gray-500">
              预计{strategy.metrics.projectedGrowth.type === 'occupancy' ? '入住率' : strategy.metrics.projectedGrowth.type === 'traffic' ? '流量' : '整体'}增长
            </div>
            <div className={`ml-auto text-xs font-semibold ${getGrowthTextColor(strategy.metrics.projectedGrowth.type)}`}>
              {strategy.metrics.projectedGrowth.value}
            </div>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getGrowthBgColor(strategy.metrics.projectedGrowth.type)} rounded-full`} 
              style={{ width: `${strategy.metrics.projectedGrowth.percentage}%` }}
            ></div>
          </div>
        </div>
        <div>
          <div className="flex items-center mb-1">
            <div className="text-xs font-medium text-gray-500">
              {strategy.metrics.complexity.value === '低' ? '执行复杂度' : '上线复杂度'}
            </div>
            <div className={`ml-auto text-xs font-semibold ${getComplexityTextColor(strategy.metrics.complexity.value)}`}>
              {strategy.metrics.complexity.value}
            </div>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getComplexityBgColor(strategy.metrics.complexity.value)} rounded-full`} 
              style={{ width: `${strategy.metrics.complexity.percentage}%` }}
            ></div>
          </div>
        </div>
        <button 
          onClick={onSelect}
          className={`mt-3 w-full flex justify-center items-center px-4 py-2 border text-sm font-medium rounded-md ${
            isRecommended 
              ? 'border-transparent text-white bg-primary-600 hover:bg-primary-700' 
              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
        >
          选择此策略
        </button>
      </div>
    </div>
  );
}

// Helper functions for styling based on metrics
function getGrowthTextColor(type: string): string {
  switch (type) {
    case 'occupancy':
      return 'text-green-600';
    case 'traffic':
      return 'text-blue-600';
    default:
      return 'text-purple-600';
  }
}

function getGrowthBgColor(type: string): string {
  switch (type) {
    case 'occupancy':
      return 'bg-green-500';
    case 'traffic':
      return 'bg-blue-500';
    default:
      return 'bg-purple-500';
  }
}

function getComplexityTextColor(value: string): string {
  switch (value) {
    case '低':
      return 'text-green-600';
    case '中等':
      return 'text-yellow-600';
    case '高':
      return 'text-red-600';
    default:
      return 'text-gray-700';
  }
}

function getComplexityBgColor(value: string): string {
  switch (value) {
    case '低':
      return 'bg-green-500';
    case '中等':
      return 'bg-yellow-500';
    case '高':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}
