import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { insertUserSchema } from "@shared/schema";
import { Loader2 } from "lucide-react";

// 登录表单验证规则
const loginSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().min(1, "密码不能为空"),
});

// 注册表单验证规则
const registerSchema = insertUserSchema.pick({
  username: true,
  password: true,
  hotel: true,
  role: true,
}).extend({
  password: z.string().min(6, "密码至少6个字符"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("login");
  const { login, register, user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  // 如果用户已登录，使用useEffect进行重定向
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // 登录表单状态
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  // 注册表单状态
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    hotel: "",
    role: "manager" as const,
    // Removed fullName as it's not in the schema
  });

  // 处理登录表单变化
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
  };

  // 处理注册表单变化
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterForm(prev => ({ ...prev, [name]: value }));
  };

  // 登录提交
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 验证表单
      loginSchema.parse(loginForm);
      
      // 提交登录
      setIsLoading(true);
      await login(loginForm.username, loginForm.password);
      
      // 登录成功，跳转到首页
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        // 表单验证错误
        toast({
          variant: "destructive",
          title: "表单验证失败",
          description: error.errors[0].message,
        });
      } else {
        // 其他错误
        toast({
          variant: "destructive",
          title: "登录失败",
          description: error instanceof Error ? error.message : "用户名或密码错误",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 注册提交
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 验证表单
      registerSchema.parse(registerForm);
      
      // 提交注册
      setIsLoading(true);
      await register({
        username: registerForm.username,
        password: registerForm.password,
        hotel: registerForm.hotel,
        role: registerForm.role,
      });
      
      // 注册成功，跳转到首页
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        // 表单验证错误
        toast({
          variant: "destructive",
          title: "表单验证失败",
          description: error.errors[0].message,
        });
      } else {
        // 其他错误
        toast({
          variant: "destructive",
          title: "注册失败",
          description: error instanceof Error ? error.message : "注册失败，请稍后重试",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* 左侧表单区域 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">OTA 活动管理系统</h1>
            <p className="mt-2 text-gray-600">管理您的酒店在各大OTA平台上的促销活动</p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>欢迎回来</CardTitle>
                  <CardDescription>请输入您的账号和密码登录系统</CardDescription>
                </CardHeader>
                <form onSubmit={handleLoginSubmit}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">用户名</Label>
                      <Input 
                        id="username"
                        name="username"
                        placeholder="请输入用户名" 
                        value={loginForm.username}
                        onChange={handleLoginChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">密码</Label>
                      <Input 
                        id="password"
                        name="password"
                        type="password" 
                        placeholder="请输入密码"
                        value={loginForm.password}
                        onChange={handleLoginChange}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" disabled={isLoading} type="submit">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          登录中...
                        </>
                      ) : "登录"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>创建账号</CardTitle>
                  <CardDescription>注册一个新账号以使用系统</CardDescription>
                </CardHeader>
                <form onSubmit={handleRegisterSubmit}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-username">用户名</Label>
                      <Input 
                        id="reg-username"
                        name="username"
                        placeholder="请输入用户名" 
                        value={registerForm.username}
                        onChange={handleRegisterChange}
                        required
                      />
                    </div>
                    {/* 姓名字段移除，不在用户模型中 */}
                    <div className="space-y-2">
                      <Label htmlFor="hotel">酒店名称</Label>
                      <Input 
                        id="hotel"
                        name="hotel"
                        placeholder="您管理的酒店名称" 
                        value={registerForm.hotel}
                        onChange={handleRegisterChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">密码</Label>
                      <Input 
                        id="reg-password"
                        name="password"
                        type="password" 
                        placeholder="请设置密码（至少6个字符）"
                        value={registerForm.password}
                        onChange={handleRegisterChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">确认密码</Label>
                      <Input 
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password" 
                        placeholder="请再次输入密码"
                        value={registerForm.confirmPassword}
                        onChange={handleRegisterChange}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" disabled={isLoading} type="submit">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          注册中...
                        </>
                      ) : "注册"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* 右侧介绍区域 */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-tr from-primary-800 to-primary-600 text-white p-12 flex-col justify-center">
        <div className="max-w-lg mx-auto">
          <h2 className="text-4xl font-bold mb-6">智能管理OTA促销活动</h2>
          <p className="text-xl mb-8">利用数据分析和AI推荐，优化您的酒店在各大OTA平台的促销策略</p>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="rounded-full bg-white/20 p-3 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">一站式管理</h3>
                <p>集中管理多个OTA平台的促销活动，节省时间与精力</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="rounded-full bg-white/20 p-3 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">智能策略推荐</h3>
                <p>基于大数据和AI分析，智能推荐最优促销策略</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="rounded-full bg-white/20 p-3 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">实时数据分析</h3>
                <p>监控活动绩效，优化参与策略，提高入住率</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}