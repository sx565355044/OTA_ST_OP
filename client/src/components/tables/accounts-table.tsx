import React from 'react';
import { Link } from 'wouter';
import { cn, generateStatusBadgeClasses } from '@/lib/utils';

interface Account {
  id: number;
  name: string;
  shortName?: string;
  type: string;
  username: string;
  accountType: string;
  status: string;
  lastUpdated: string;
}

interface AccountsTableProps {
  accounts: Account[];
  showActions?: boolean;
  className?: string;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function AccountsTable({ 
  accounts, 
  showActions = false, 
  className,
  onEdit,
  onDelete
}: AccountsTableProps) {
  if (!accounts || accounts.length === 0) {
    return (
      <div className={cn("bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg", className)}>
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">暂无OTA平台账户，请添加账户</p>
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">平台</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">上次更新</th>
                  {showActions && (
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">操作</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${getPlatformBgColor(account.name)}`}>
                          <span className={`${getPlatformTextColor(account.name)} font-medium`}>{account.shortName || getShortName(account.name)}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{account.name}</div>
                          <div className="text-sm text-gray-500">{account.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{account.username}</div>
                      <div className="text-sm text-gray-500">{account.accountType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${generateStatusBadgeClasses(account.status)}`}>
                        {account.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.lastUpdated}
                    </td>
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => onEdit ? onEdit(account.id) : alert('编辑功能未实现')} 
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          编辑
                        </button>
                        <button 
                          onClick={() => onDelete ? onDelete(account.id) : alert('删除功能未实现')} 
                          className="text-red-600 hover:text-red-900"
                        >
                          删除
                        </button>
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
