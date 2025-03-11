import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// 定义菜单项类型
interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

// 定义基本菜单项
const standardItems: MenuItem[] = [
  { id: 'dashboard', label: '控制面板', icon: 'th-large', path: '/' },
  { id: 'accounts', label: '平台账户', icon: 'key', path: '/accounts' },
  { id: 'activities', label: '促销活动', icon: 'calendar-alt', path: '/activities' },
  { id: 'strategies', label: '推荐策略', icon: 'chess', path: '/strategies' },
  { id: 'history', label: '历史记录', icon: 'history', path: '/history' },
  { id: 'settings', label: '设置', icon: 'cog', path: '/settings' },
];

// 管理员菜单项
const adminItems: MenuItem[] = [
  { id: 'admin', label: '管理控制台', icon: 'user-shield', path: '/admin' },
];

interface SidebarProps {
  collapsed: boolean;
}

export const Sidebar = ({ collapsed }: SidebarProps) => {
  const [location] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // 检查用户是否为管理员
  const isAdmin = user?.role === 'admin';

  // Function to determine if a menu item is active
  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-neutral-200 h-full flex-shrink-0 transition-all duration-300`}>
      <div className="p-4 border-b border-neutral-200 flex items-center justify-center md:justify-start">
        <svg 
          className="h-8 w-8 rounded-md text-primary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        {!collapsed && <h1 className="ml-3 font-semibold text-lg text-neutral-500">OTA管理系统</h1>}
      </div>
      
      <nav className="mt-2">
        <ul>
          {/* 渲染标准菜单项 */}
          {standardItems.map((item) => (
            <li key={item.id}>
              <Link 
                href={item.path}
                className={`menu-item flex items-center p-3 hover:bg-neutral-100 ${
                  isActive(item.path) ? 'active border-l-4 border-primary bg-opacity-10 bg-primary text-primary' : 'text-neutral-400'
                }`}
              >
                <i className={`fas fa-${item.icon} w-6 text-center`}></i>
                {!collapsed && <span className="ml-3">{item.label}</span>}
              </Link>
            </li>
          ))}
          
          {/* 仅对管理员显示管理菜单项 */}
          {isAdmin && (
            <>
              {!collapsed && (
                <li className="px-4 py-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    管理功能
                  </div>
                </li>
              )}
              
              {adminItems.map((item) => (
                <li key={item.id}>
                  <Link 
                    href={item.path}
                    className={`menu-item flex items-center p-3 hover:bg-neutral-100 ${
                      isActive(item.path) ? 'active border-l-4 border-primary bg-opacity-10 bg-primary text-primary' : 'text-neutral-400'
                    }`}
                  >
                    <i className={`fas fa-${item.icon} w-6 text-center`}></i>
                    {!collapsed && <span className="ml-3">{item.label}</span>}
                  </Link>
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>
    </aside>
  );
};
