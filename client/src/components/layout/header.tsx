import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  toggleMobileMenu: () => void;
}

export function Header({ toggleMobileMenu }: HeaderProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  // Map routes to page titles
  const getPageTitle = (path: string): string => {
    switch (path) {
      case '/':
        return '仪表盘总览';
      case '/accounts':
        return 'OTA平台账户管理';
      case '/activities':
        return 'OTA活动一览';
      case '/strategies':
        return '智能策略推荐';
      case '/history':
        return '历史策略记录';
      case '/settings':
        return '设置';
      case '/admin':
        return '管理员控制面板';
      default:
        return 'OTA活动管理';
    }
  };

  return (
    <header className="bg-white shadow-sm lg:shadow-none z-10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="py-4 flex justify-between items-center lg:border-b lg:border-gray-200">
          <div className="flex items-center lg:hidden">
            <button 
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={toggleMobileMenu}
            >
              <span className="sr-only">打开菜单</span>
              <span className="material-icons">menu</span>
            </button>
            <h1 className="ml-3 text-lg font-medium">OTA活动管理</h1>
          </div>
          <div className="hidden lg:flex lg:items-center">
            <h1 className="text-lg font-medium">{getPageTitle(location)}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-white p-1 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
              <span className="sr-only">查看通知</span>
              <span className="material-icons">notifications</span>
            </button>
            <button className="bg-white p-1 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
              <span className="sr-only">帮助</span>
              <span className="material-icons">help_outline</span>
            </button>
            
            {user && (
              <div className="flex items-center gap-2">
                <div className="hidden md:block text-sm text-gray-700">
                  <span className="font-medium">{user.fullName || user.username}</span>
                  <span className="text-xs text-gray-500 block">{user.hotel}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => logout()}>
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">注销</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
