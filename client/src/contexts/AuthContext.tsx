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
      console.log("尝试登录:", username, "********");
      
      // 始终使用真实API调用进行登录
      const res = await apiRequest('POST', '/api/auth/login', { username, password });
      const userData = await res.json();
      console.log("登录成功，即将跳转到首页");
      setUser(userData);
      return userData;
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
      // 始终使用真实API调用进行登出
      await apiRequest('POST', '/api/auth/logout', {});
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      // 即使API调用失败，也要确保本地状态被清除
      setUser(null);
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
