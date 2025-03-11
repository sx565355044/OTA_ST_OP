import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// Simple authentication hook for managing user state
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already authenticated (e.g., via localStorage)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = (username: string) => {
    // In a real app, this would involve API calls and proper authentication
    // For this demo, we'll just store the username
    localStorage.setItem('user', username);
    setUser(username);
    setIsAuthenticated(true);
    toast({
      title: "登录成功",
      description: `欢迎回来，${username}`,
    });
    return true;
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    toast({
      title: "已退出登录",
      description: "您已成功退出系统",
    });
  };

  return { isAuthenticated, user, isLoading, login, logout };
};
