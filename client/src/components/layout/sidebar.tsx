import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { NavItem, MobileNavItem } from '@/components/ui/navigation';
import { Header } from '@/components/layout/header';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  
  // Get API key status for sidebar display
  const { data: apiKeyStatus } = useQuery({
    queryKey: ['/api/settings/api-key/status'],
  });

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="px-6 py-4 flex items-center border-b border-gray-200">
          <span className="material-icons text-primary-600 mr-2">hotel</span>
          <h1 className="text-xl font-semibold text-primary-900">OTA活动管理</h1>
        </div>
        
        <nav className="mt-6 px-3 flex-1">
          <div className="space-y-1">
            <NavItem href="/" icon="dashboard">总览</NavItem>
            <NavItem href="/accounts" icon="account_circle">账户管理</NavItem>
            <NavItem href="/activities" icon="calendar_today">活动一览</NavItem>
            <NavItem href="/strategies" icon="auto_awesome">智能策略</NavItem>
            <NavItem href="/history" icon="history">历史记录</NavItem>
            <NavItem href="/settings" icon="settings">设置</NavItem>
            {user?.role === 'admin' && (
              <NavItem href="/admin" icon="admin_panel_settings">管理控制台</NavItem>
            )}
          </div>
        </nav>
        
        <div className="px-3 py-4 border-t border-gray-200">
          <div className="flex items-center px-3 py-2 text-sm">
            <span className={`material-icons mr-2 text-sm ${apiKeyStatus?.configured ? 'text-green-500' : 'text-red-500'}`}>
              {apiKeyStatus?.configured ? 'check_circle' : 'cancel'}
            </span>
            <span className="text-gray-700">
              {apiKeyStatus?.configured ? 'DeepSeek API 已连接' : 'DeepSeek API 未配置'}
            </span>
          </div>
          
          <div className="flex items-center mt-4 px-3 py-2">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                {user?.username?.substring(0, 2) || 'GM'}
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-800">{user?.username || '总经理'}</p>
              <p className="text-xs text-gray-500">{user?.hotel || '星星酒店连锁'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <div className={`lg:hidden fixed inset-0 z-40 flex ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={closeMobileMenu}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button 
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={closeMobileMenu}
            >
              <span className="sr-only">关闭侧边栏</span>
              <span className="material-icons text-white">close</span>
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <span className="material-icons text-primary-600 mr-2">hotel</span>
              <h1 className="text-xl font-semibold text-primary-900">OTA活动管理</h1>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              <MobileNavItem href="/" icon="dashboard" onClick={closeMobileMenu}>总览</MobileNavItem>
              <MobileNavItem href="/accounts" icon="account_circle" onClick={closeMobileMenu}>账户管理</MobileNavItem>
              <MobileNavItem href="/activities" icon="calendar_today" onClick={closeMobileMenu}>活动一览</MobileNavItem>
              <MobileNavItem href="/strategies" icon="auto_awesome" onClick={closeMobileMenu}>智能策略</MobileNavItem>
              <MobileNavItem href="/history" icon="history" onClick={closeMobileMenu}>历史记录</MobileNavItem>
              <MobileNavItem href="/settings" icon="settings" onClick={closeMobileMenu}>设置</MobileNavItem>
              {user?.role === 'admin' && (
                <MobileNavItem href="/admin" icon="admin_panel_settings" onClick={closeMobileMenu}>管理控制台</MobileNavItem>
              )}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                  {user?.username?.substring(0, 2) || 'GM'}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-800">{user?.username || '总经理'}</p>
                <p className="text-xs text-gray-500">{user?.hotel || '星星酒店连锁'}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 w-14"></div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleMobileMenu={toggleMobileMenu} />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
