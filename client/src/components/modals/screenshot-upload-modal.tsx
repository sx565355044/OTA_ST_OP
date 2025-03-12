import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ScreenshotUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 定义表单验证Schema
const activityFormSchema = z.object({
  name: z.string().min(2, "活动名称至少需要2个字符"),
  description: z.string().optional(),
  platformId: z.string().min(1, "请选择平台"),
  startDate: z.date({
    required_error: "请选择开始日期",
  }),
  endDate: z.date({
    required_error: "请选择结束日期",
  }),
  discount: z.string().min(1, "请输入折扣信息"),
  commissionRate: z.string().min(1, "请输入佣金比例"),
  status: z.string().optional(),
  participationStatus: z.string().optional(),
  screenshot: z.instanceof(File).optional(),
  tag: z.string().optional(),
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;

export function ScreenshotUploadModal({ isOpen, onClose }: ScreenshotUploadModalProps) {
  const { toast } = useToast();
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  
  // 获取用户的OTA账户列表
  const { data: accounts = [] } = useQuery<any[]>({
    queryKey: ['/api/accounts'],
    enabled: isOpen,
  });
  
  // 初始化表单
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      name: "",
      description: "",
      platformId: "",
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      discount: "",
      commissionRate: "",
      status: "未决定",
      participationStatus: "未参与",
      tag: "新促销",
    },
  });
  
  // 处理截图上传
  const handleScreenshotChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("screenshot", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // 添加活动的mutation
  const addActivityMutation = useMutation({
    mutationFn: async (data: ActivityFormValues) => {
      // 提取截图以外的数据
      const { screenshot, ...activityData } = data;
      
      // 转换日期格式
      const formattedData = {
        ...activityData,
        startDate: format(data.startDate, 'yyyy-MM-dd'),
        endDate: format(data.endDate, 'yyyy-MM-dd'),
        platformId: parseInt(data.platformId),
      };
      
      // 调用API添加活动
      const response = await fetch('/api/activities/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 确保包含cookie以保持会话
        body: JSON.stringify({
          platformId: formattedData.platformId,
          activityData: formattedData,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '添加活动失败');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "成功",
        description: "活动已通过截图成功添加",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      onClose();
      form.reset();
      setScreenshotPreview(null);
    },
    onError: (error: Error) => {
      toast({
        title: "错误",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // 表单提交处理
  const onSubmit = (data: ActivityFormValues) => {
    addActivityMutation.mutate(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>添加携程促销活动</DialogTitle>
          <DialogDescription>
            通过截图上传方式添加来自携程平台的促销活动。请先登录携程商家平台，然后截取活动页面的截图，并填写以下信息。
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 平台选择 */}
            <FormField
              control={form.control}
              name="platformId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>OTA平台</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择平台" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account: any) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* 截图上传 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">活动截图</label>
              <div className="border border-dashed border-gray-300 rounded-md p-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="hidden"
                  id="screenshot-upload"
                />
                <label 
                  htmlFor="screenshot-upload"
                  className="block text-center cursor-pointer"
                >
                  {screenshotPreview ? (
                    <div className="relative">
                      <img 
                        src={screenshotPreview} 
                        alt="Screenshot preview" 
                        className="max-h-48 mx-auto object-contain"
                      />
                      <div className="mt-2 text-sm text-blue-600">点击更换截图</div>
                    </div>
                  ) : (
                    <div className="py-8">
                      <span className="material-icons text-gray-400 text-4xl">add_photo_alternate</span>
                      <p className="mt-2 text-sm text-gray-500">点击上传活动截图</p>
                      <p className="text-xs text-gray-400">支持JPG, PNG格式</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
            
            {/* 活动名称 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>活动名称</FormLabel>
                  <FormControl>
                    <Input placeholder="输入活动名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* 活动描述 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>活动描述</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="输入活动描述和详情" 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* 时间范围 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>开始日期</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "yyyy年MM月dd日")
                            ) : (
                              <span>选择日期</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>结束日期</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "yyyy年MM月dd日")
                            ) : (
                              <span>选择日期</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* 折扣和佣金 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>折扣率</FormLabel>
                    <FormControl>
                      <Input placeholder="例如: 8.5折" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="commissionRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>佣金比例</FormLabel>
                    <FormControl>
                      <Input placeholder="例如: 8%" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* 标签 */}
            <FormField
              control={form.control}
              name="tag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>活动标签</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择标签" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="热门">热门</SelectItem>
                      <SelectItem value="新促销">新促销</SelectItem>
                      <SelectItem value="限时">限时</SelectItem>
                      <SelectItem value="特惠">特惠</SelectItem>
                      <SelectItem value="季节性">季节性</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={addActivityMutation.isPending}
              >
                取消
              </Button>
              <Button 
                type="submit"
                disabled={addActivityMutation.isPending}
              >
                {addActivityMutation.isPending ? '添加中...' : '添加活动'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}