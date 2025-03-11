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
      const res = await apiRequest('POST', '/api/auth/login', { username, password });
      const userData = await res.json();
      setUser(userData);
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
      await apiRequest('POST', '/api/auth/logout', {});
      setUser(null);
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
