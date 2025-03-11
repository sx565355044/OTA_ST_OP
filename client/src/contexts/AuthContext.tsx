import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

type User = {
  id: number;
  username: string;
  role: string;
  hotel: string;
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

// 创建自定义钩子函数用于访问认证上下文
export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuthStatus = async () => {
      try {
        const res = await fetch('/api/auth/status', {
          credentials: 'include'
        });
        
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      // 在开发模式下，使用模拟登录
      if (import.meta.env.MODE !== 'production') {
        // 模拟延迟以更真实
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 根据用户名设置模拟用户数据和角色
        let role = 'manager'; // 默认角色

        // 检查是否为管理员账户（用户名中包含 admin 或 管理员）
        if (username.toLowerCase().includes('admin') || username.includes('管理员')) {
          role = 'admin';
        }
        
        const mockUser = {
          id: 1,
          username: username || '总经理',
          role: role,
          hotel: '星星酒店连锁'
        };
        
        setUser(mockUser);
        return mockUser;
      } else {
        // 生产环境中使用真实API调用
        const res = await apiRequest('POST', '/api/auth/login', { username, password });
        const userData = await res.json();
        setUser(userData);
        return userData;
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // 在开发模式下，直接清除用户状态
      if (import.meta.env.MODE !== 'production') {
        // 模拟延迟以更真实
        await new Promise(resolve => setTimeout(resolve, 300));
        setUser(null);
      } else {
        // 生产环境中使用真实API调用
        await apiRequest('POST', '/api/auth/logout', {});
        setUser(null);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 暂时注释掉自动演示模式登录，强制用户手动登录
  /*useEffect(() => {
    if (import.meta.env.MODE !== 'production' && isLoading) {
      setUser({
        id: 1,
        username: '总经理',
        role: 'manager',
        hotel: '星星酒店连锁'
      });
      setIsLoading(false);
    }
  }, [isLoading]);*/

  // 在组件加载后结束加载状态
  useEffect(() => {
    if (isLoading) {
      setIsLoading(false);
    }
  }, [isLoading]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
