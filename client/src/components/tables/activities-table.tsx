import React from 'react';
import { Link } from 'wouter';
import { cn, generateStatusBadgeClasses, generateTagBadgeClasses } from '@/lib/utils';

interface Activity {
  id: number;
  name: string;
  description: string;
  platform: {
    id: number;
    name: string;
    shortName?: string;
  };
  startDate: string;
  endDate: string;
  timeRemaining: string;
  discount: string;
  commissionRate: string;
  status: string;
  tag?: string;
}

interface ActivitiesTableProps {
  activities: Activity[];
  showActions?: boolean;
  showPlatform?: boolean;
  className?: string;
  onJoin?: (id: number) => void;
  onLeave?: (id: number) => void;
}

export function ActivitiesTable({ 
  activities, 
  showActions = false,
  showPlatform = true,
  className,
  onJoin,
  onLeave
}: ActivitiesTableProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className={cn("bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg", className)}>
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">暂无活动数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">活动</th>
                  {showPlatform && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">平台</th>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间段</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">折扣</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  {showActions && (
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">操作</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">{activity.name}</div>
                        {activity.tag && (
                          <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${generateTagBadgeClasses(activity.tag)}`}>
                            {activity.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{activity.description}</div>
                    </td>
                    {showPlatform && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${getPlatformBgColor(activity.platform.name)}`}>
                            <span className={`${getPlatformTextColor(activity.platform.name)} font-medium`}>
                              {activity.platform.shortName || getShortName(activity.platform.name)}
                            </span>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDateRange(activity.startDate, activity.endDate)}</div>
                      <div className="text-sm text-gray-500">剩余{activity.timeRemaining}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{activity.discount}</div>
                      <div className="text-sm text-gray-500">平台佣金 {activity.commissionRate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${generateStatusBadgeClasses(activity.status)}`}>
                        {activity.status}
                      </span>
                    </td>
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/activities/${activity.id}`} className="text-primary-600 hover:text-primary-900 mr-3">
                          详情
                        </Link>
                        {activity.status === '未决定' && onJoin && (
                          <button
                            onClick={() => onJoin(activity.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            参与
                          </button>
                        )}
                        {(activity.status === '进行中' || activity.status === '待开始') && onLeave && (
                          <button
                            onClick={() => onLeave(activity.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            退出
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function formatDateRange(startDate: string, endDate: string): string {
  // Simple formatting for dates, can be enhanced with date-fns if needed
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  return `${formatDate(startDate)} 至 ${formatDate(endDate)}`;
}

// Helper functions for platform styling
function getShortName(name: string): string {
  const platformNames: Record<string, string> = {
    '携程旅行': '携程',
    '美团酒店': '美团',
    '飞猪旅行': '飞猪',
    '去哪儿旅行': '去哪',
    '艺龙旅行': '艺龙',
    '途牛旅游': '途牛',
    '同程旅行': '同程',
    '马蜂窝': '蜂窝',
  };
  
  return platformNames[name] || name.substring(0, 2);
}

function getPlatformBgColor(name: string): string {
  const platformColors: Record<string, string> = {
    '携程': 'bg-indigo-100',
    '携程旅行': 'bg-indigo-100',
    '美团': 'bg-yellow-100',
    '美团酒店': 'bg-yellow-100',
    '飞猪': 'bg-orange-100',
    '飞猪旅行': 'bg-orange-100',
    '去哪儿': 'bg-blue-100',
    '去哪儿旅行': 'bg-blue-100',
    '艺龙': 'bg-green-100',
    '艺龙旅行': 'bg-green-100',
    '途牛': 'bg-red-100',
    '途牛旅游': 'bg-red-100',
    '同程': 'bg-purple-100',
    '同程旅行': 'bg-purple-100',
    '马蜂窝': 'bg-amber-100',
  };
  
  return platformColors[name] || 'bg-gray-100';
}

function getPlatformTextColor(name: string): string {
  const platformColors: Record<string, string> = {
    '携程': 'text-indigo-700',
    '携程旅行': 'text-indigo-700',
    '美团': 'text-yellow-700',
    '美团酒店': 'text-yellow-700',
    '飞猪': 'text-orange-700',
    '飞猪旅行': 'text-orange-700',
    '去哪儿': 'text-blue-700',
    '去哪儿旅行': 'text-blue-700',
    '艺龙': 'text-green-700',
    '艺龙旅行': 'text-green-700',
    '途牛': 'text-red-700',
    '途牛旅游': 'text-red-700',
    '同程': 'text-purple-700',
    '同程旅行': 'text-purple-700',
    '马蜂窝': 'text-amber-700',
  };
  
  return platformColors[name] || 'text-gray-700';
}
