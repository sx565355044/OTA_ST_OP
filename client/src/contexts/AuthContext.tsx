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

export const useAuth = () => useContext(AuthContext);

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
      if (process.env.NODE_ENV !== 'production') {
        // 模拟延迟以更真实
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 设置模拟用户数据
        const mockUser = {
          id: 1,
          username: username || '总经理',
          role: 'manager',
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
      if (process.env.NODE_ENV !== 'production') {
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

  // For demo purposes, initialize with a mock user if not in production
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && isLoading) {
      setUser({
        id: 1,
        username: '总经理',
        role: 'manager',
        hotel: '星星酒店连锁'
      });
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
