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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from "@/components/ui/switch";
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
  screenshots: z.array(z.instanceof(File)).min(1, "至少需要上传一张截图"),
  tag: z.string().optional(),
  autoOcr: z.boolean().default(true),
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;

export function ScreenshotUploadModal({ isOpen, onClose }: ScreenshotUploadModalProps) {
  const { toast } = useToast();
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
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
      screenshots: [],
      autoOcr: true,
    },
  });
  
  // 处理截图上传
  const handleScreenshotChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // 转换FileList为数组
      const filesArray = Array.from(files);
      
      // 设置表单值
      form.setValue("screenshots", filesArray, { shouldValidate: true });
      
      // 为每个文件创建预览
      const newPreviews: string[] = [];
      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === filesArray.length) {
            setScreenshotPreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };
  
  // 删除单个截图
  const removeScreenshot = (index: number) => {
    const currentScreenshots = form.getValues("screenshots");
    // 确保currentScreenshots是一个数组
    const screenshotsArray = Array.isArray(currentScreenshots) ? currentScreenshots : [];
    const newScreenshots = [...screenshotsArray];
    newScreenshots.splice(index, 1);
    
    form.setValue("screenshots", newScreenshots, { shouldValidate: true });
    
    const newPreviews = [...screenshotPreviews];
    newPreviews.splice(index, 1);
    setScreenshotPreviews(newPreviews);
  };
  
  // 添加活动的mutation(使用多文件上传和OCR)
  const addActivityMutation = useMutation({
    mutationFn: async (data: ActivityFormValues) => {
      const { screenshots, ...activityData } = data;
      
      // 转换日期格式
      const formattedData = {
        ...activityData,
        startDate: format(data.startDate, 'yyyy-MM-dd'),
        endDate: format(data.endDate, 'yyyy-MM-dd'),
        platformId: parseInt(data.platformId),
      };
      
      // 设置处理状态
      setProcessingStatus('processing');
      
      // 创建FormData对象，用于提交文件和数据
      const formData = new FormData();
      formData.append('platformId', formattedData.platformId.toString());
      
      // 添加所有截图文件
      screenshots.forEach(file => {
        formData.append('screenshots', file);
      });
      
      // 如果不使用OCR，则添加表单数据
      if (!data.autoOcr) {
        formData.append('name', formattedData.name);
        formData.append('description', formattedData.description || '');
        formData.append('discount', formattedData.discount);
        formData.append('commissionRate', formattedData.commissionRate);
        formData.append('startDate', formattedData.startDate);
        formData.append('endDate', formattedData.endDate);
        formData.append('tag', formattedData.tag || '');
        formData.append('status', formattedData.status || '未决定');
        formData.append('autoOcr', 'false');
      } else {
        formData.append('autoOcr', 'true');
      }
      
      // 调用新的多文件上传API
      const response = await fetch('/api/activities/screenshots', {
        method: 'POST',
        credentials: 'include', // 确保包含cookie以保持会话
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '添加活动失败');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setProcessingStatus('success');
      
      // 自动OCR的情况下，服务器是异步处理的，显示处理中的消息
      if (form.getValues('autoOcr')) {
        toast({
          title: "截图已接收",
          description: "系统正在后台处理图片并提取活动数据，这可能需要几分钟时间",
        });
      } else {
        toast({
          title: "成功",
          description: "活动已通过截图成功添加",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      onClose();
      form.reset();
      setScreenshotPreviews([]);
    },
    onError: (error: Error) => {
      setProcessingStatus('error');
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
            <FormField
              control={form.control}
              name="screenshots"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>活动截图（支持多张截图上传）</FormLabel>
                  <FormControl>
                    <div className="border border-dashed border-gray-300 rounded-md p-4">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleScreenshotChange}
                        className="hidden"
                        id="screenshot-upload"
                        ref={fileInputRef}
                      />
                      <label 
                        htmlFor="screenshot-upload"
                        className="block text-center cursor-pointer"
                      >
                        {screenshotPreviews.length > 0 ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                              {screenshotPreviews.map((preview, index) => (
                                <div key={index} className="relative">
                                  <img 
                                    src={preview} 
                                    alt={`Screenshot ${index + 1}`} 
                                    className="h-24 w-24 object-cover rounded"
                                  />
                                  <button
                                    type="button"
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-xs"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      removeScreenshot(index);
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              <div className="h-24 w-24 border border-dashed border-gray-300 rounded flex items-center justify-center hover:bg-gray-50">
                                <span className="text-gray-400 text-2xl">+</span>
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-blue-600">点击添加更多截图</div>
                          </div>
                        ) : (
                          <div className="py-8">
                            <span className="material-icons text-gray-400 text-4xl">add_photo_alternate</span>
                            <p className="mt-2 text-sm text-gray-500">点击上传活动截图</p>
                            <p className="text-xs text-gray-400">支持多张JPG, PNG格式，最多10张</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* OCR开关 */}
            <FormField
              control={form.control}
              name="autoOcr"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">自动OCR识别</FormLabel>
                    <FormDescription>
                      系统将自动识别截图内容并提取活动数据
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
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
                className={processingStatus === 'processing' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
              >
                {processingStatus === 'processing' ? '处理中...' : 
                 processingStatus === 'success' ? '添加成功' : 
                 addActivityMutation.isPending ? '提交中...' : '上传截图'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}