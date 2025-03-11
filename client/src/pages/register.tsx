import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useForm } from "react-hook-form";
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ButtonFix } from '@/components/ui/button-fix';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';

// 注册表单验证模式
const registerSchema = z.object({
  username: z.string()
    .min(3, { message: '用户名至少需要3个字符' })
    .max(50, { message: '用户名不能超过50个字符' }),
  password: z.string()
    .min(6, { message: '密码至少需要6个字符' })
    .max(100, { message: '密码不能超过100个字符' }),
  confirmPassword: z.string(),
  hotel: z.string()
    .min(2, { message: '酒店名称至少需要2个字符' })
    .max(100, { message: '酒店名称不能超过100个字符' }),
  fullName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // 初始化表单
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      hotel: '',
      fullName: '',
    },
  });

  // 提交注册表单
  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '注册失败');
      }

      // 成功注册
      toast({
        title: "注册成功",
        description: "欢迎使用酒店OTA活动管理系统",
        variant: "success",
      });

      // 注册成功后自动登录并跳转到首页
      setLocation('/');
    } catch (error) {
      console.error('注册错误:', error);
      toast({
        title: "注册失败",
        description: error instanceof Error ? error.message : "未知错误，请重试",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="mt-6 text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
            酒店OTA活动管理系统
          </h1>
          <p className="mt-2 text-sm text-gray-600">注册新账号，开始优化您的OTA策略</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>创建账号</CardTitle>
            <CardDescription>
              填写以下信息创建您的酒店管理员账号
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用户名</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入用户名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>密码</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="请输入密码" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>确认密码</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="请再次输入密码" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hotel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>酒店名称</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入您的酒店名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>全名 (可选)</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入您的姓名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <ButtonFix 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '注册中...' : '注册'}
                </ButtonFix>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-600">
              已有账号？{' '}
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                登录
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}