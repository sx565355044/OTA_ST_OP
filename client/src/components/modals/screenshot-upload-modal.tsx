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
  // name字段已设为可选，系统将通过OCR自动提取活动名称
  name: z.string().optional(),
  description: z.string().optional(),
  // platformId已完全移除，系统将完全依赖自动检测
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
  // 已识别的平台信息
  const [detectedPlatform, setDetectedPlatform] = useState<{name: string; code: string; confidence: number} | null>(null);
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
      // name字段已设为可选，由系统自动提取
      description: "",
      // platformId已完全从表单中移除
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
      // 检查文件数量是否超过限制
      if (files.length > 10) {
        toast({
          title: "错误",
          description: "最多只能上传10张截图",
          variant: "destructive",
        });
        return;
      }
      
      // 转换FileList为数组
      const filesArray = Array.from(files);
      
      // 检查文件大小限制 (每个文件最大5MB)
      const oversizedFiles = filesArray.filter(file => file.size > 5 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        const fileNames = oversizedFiles.map(f => f.name).join(', ');
        toast({
          title: "文件过大",
          description: `以下文件超过5MB大小限制: ${fileNames}`,
          variant: "destructive",
        });
        return;
      }
      
      // 设置表单值
      form.setValue("screenshots", filesArray, { shouldValidate: true });
      
      // 为每个文件创建预览
      const newPreviews: string[] = [];
      let loadedCount = 0;
      
      // 添加加载状态指示
      setProcessingStatus('processing');
      
      // 检查所有文件类型
      const invalidFiles = filesArray.filter(file => !file.type.match(/^image\/(jpeg|jpg|png|gif)$/i));
      if (invalidFiles.length > 0) {
        const fileNames = invalidFiles.map(f => f.name).join(', ');
        toast({
          title: "无效的文件格式",
          description: `以下文件不是有效的图片格式 (JPG/PNG/GIF): ${fileNames}`,
          variant: "destructive",
        });
        setProcessingStatus('idle');
        return;
      }
      
      // 移除前端模拟平台检测代码，完全依赖后端OCR进行平台自动检测
      // 清除之前可能存在的平台检测结果，等待后端返回真实结果
      setDetectedPlatform(null);
      
      filesArray.forEach(file => {
        const reader = new FileReader();
        
        reader.onloadend = () => {
          if (reader.result) {
            // 验证图片加载是否成功
            newPreviews.push(reader.result as string);
          }
          
          loadedCount++;
          if (loadedCount === filesArray.length) {
            // 确保预览按原始文件顺序排列 (通过索引匹配)
            const orderedPreviews = newPreviews
              .map((preview, idx) => ({ preview, idx }))
              .sort((a, b) => a.idx - b.idx)
              .map(item => item.preview);
              
            setScreenshotPreviews(orderedPreviews);
            setProcessingStatus('idle');
            
            toast({
              title: "文件已准备好",
              description: `成功加载 ${newPreviews.length} 张截图`,
            });
          }
        };
        
        reader.onerror = () => {
          toast({
            title: "错误",
            description: `文件 "${file.name}" 读取失败`,
            variant: "destructive",
          });
          loadedCount++;
          if (loadedCount === filesArray.length) {
            setProcessingStatus('idle');
          }
        };
        
        // 添加超时处理
        const timeout = setTimeout(() => {
          if (reader.readyState === 1) { // 如果仍在加载中
            reader.abort(); // 中止读取
            toast({
              title: "读取超时",
              description: `文件 "${file.name}" 读取超时`,
              variant: "destructive",
            });
            
            loadedCount++;
            if (loadedCount === filesArray.length) {
              setProcessingStatus('idle');
            }
          }
        }, 10000); // 10秒超时
        
        reader.onloadend = () => {
          clearTimeout(timeout);
          if (reader.result) {
            newPreviews.push(reader.result as string);
          }
          
          loadedCount++;
          if (loadedCount === filesArray.length) {
            setScreenshotPreviews(newPreviews);
            setProcessingStatus('idle');
          }
        };
        
        try {
          reader.readAsDataURL(file);
        } catch (error) {
          console.error(`读取文件 ${file.name} 时出错:`, error);
          toast({
            title: "错误",
            description: `读取文件 "${file.name}" 时出错`,
            variant: "destructive",
          });
          
          loadedCount++;
          if (loadedCount === filesArray.length) {
            setProcessingStatus('idle');
          }
        }
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
    
    // 确保screenshotPreviews是数组
    const currentPreviews = Array.isArray(screenshotPreviews) ? screenshotPreviews : [];
    const newPreviews = [...currentPreviews];
    
    if (index >= 0 && index < newPreviews.length) {
      newPreviews.splice(index, 1);
      setScreenshotPreviews(newPreviews);
    }
  };
  
  // 添加活动的mutation(使用多文件上传和OCR)
  const addActivityMutation = useMutation({
    mutationFn: async (data: ActivityFormValues) => {
      // 验证截图是否存在
      const screenshots = Array.isArray(data.screenshots) ? data.screenshots : [];
      if (screenshots.length === 0) {
        throw new Error('请至少上传一张截图');
      }
      
      // 提取其他数据
      const { screenshots: screenshotFiles, ...activityData } = data;
      
      // 转换日期格式
      const formattedData = {
        ...activityData,
        startDate: format(data.startDate, 'yyyy-MM-dd'),
        endDate: format(data.endDate, 'yyyy-MM-dd'),
        // 不再传递platformId，完全依赖后端自动检测
      };
      
      // 设置处理状态
      setProcessingStatus('processing');
      
      // 创建FormData对象，用于提交文件和数据
      const formData = new FormData();
      
      // 添加所有截图文件
      screenshots.forEach(file => {
        formData.append('screenshots', file);
      });
      
      // 根据autoOcr值确定是否添加额外数据
      // 确保autoOcr是布尔值
      const autoOcr = data.autoOcr === undefined ? true : Boolean(data.autoOcr);
      
      // 如果不使用OCR，则添加表单数据
      if (!autoOcr) {
        formData.append('name', formattedData.name || '');
        formData.append('description', formattedData.description || '');
        formData.append('discount', formattedData.discount || '');
        formData.append('commissionRate', formattedData.commissionRate || '');
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
      const autoOcr = form.getValues('autoOcr');
      // 确保autoOcr值为布尔值，默认为true
      const isAutoOcr = autoOcr === undefined ? true : Boolean(autoOcr);
      
      // 检查返回数据中是否包含平台检测信息
      if (data && data.detectedPlatform) {
        setDetectedPlatform({
          name: data.detectedPlatform.name || '未知平台',
          code: data.detectedPlatform.code || 'unknown',
          confidence: data.detectedPlatform.confidence || 0
        });
        
        // 显示包含平台检测结果的通知
        toast({
          title: "平台自动识别成功",
          description: `系统检测到平台为: ${data.detectedPlatform.name}，识别置信度: ${Math.round(data.detectedPlatform.confidence * 100)}%`,
        });
      } else if (isAutoOcr) {
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
      setDetectedPlatform(null); // 重置检测到的平台信息
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
          <DialogTitle>添加OTA促销活动</DialogTitle>
          <DialogDescription>
            通过截图添加OTA平台的促销活动。请先登录您的OTA商家平台（如携程、美团、飞猪等），截取活动页面的截图，系统将<span className="font-semibold text-blue-600">自动识别平台类型</span>并提取活动信息。上传多张截图可提供更准确的识别结果。
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 平台选择已移除，系统将自动识别 */}
            
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
                        {Array.isArray(screenshotPreviews) && screenshotPreviews.length > 0 ? (
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
                            <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-md flex items-center">
                              <span className="material-icons text-blue-600 mr-1 text-sm">auto_awesome</span>
                              <div>
                                <p className="text-xs text-blue-600 font-semibold">新功能: 自动平台识别</p>
                                <p className="text-xs text-blue-500">系统将自动识别OTA平台类型(携程、美团、飞猪等)</p>
                              </div>
                            </div>
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
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-gradient-to-r from-blue-50 to-transparent">
                  <div className="space-y-0.5">
                    <div className="flex items-center">
                      <span className="material-icons text-blue-600 mr-2 text-sm">auto_fix_high</span>
                      <FormLabel className="text-base font-medium">智能OCR识别</FormLabel>
                      <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">新</span>
                    </div>
                    <FormDescription>
                      系统将<span className="font-medium text-blue-700">自动识别OTA平台类型</span>（携程、美团、飞猪等），并提取活动数据
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            {/* 检测到的平台显示 */}
            {detectedPlatform && (
              <div className="rounded-lg border border-green-100 bg-green-50 p-4">
                <div className="flex items-center mb-2">
                  <span className="material-icons text-green-600 mr-2">check_circle</span>
                  <h4 className="font-medium text-green-800">平台自动识别成功</h4>
                </div>
                <div className="pl-7">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-green-200 mr-3">
                        {detectedPlatform.code === 'ctrip' && (
                          <span className="material-icons text-blue-600">flight</span>
                        )}
                        {detectedPlatform.code === 'meituan' && (
                          <span className="material-icons text-yellow-600">restaurant</span>
                        )}
                        {detectedPlatform.code === 'fliggy' && (
                          <span className="material-icons text-orange-600">local_airport</span>
                        )}
                        {!['ctrip', 'meituan', 'fliggy'].includes(detectedPlatform.code) && (
                          <span className="material-icons text-gray-600">business</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-green-700">
                          识别出的平台：<span className="font-semibold">{detectedPlatform.name}</span>
                        </p>
                        <p className="text-xs text-green-600">平台代码：{detectedPlatform.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-white rounded-full px-2 py-1 border border-green-200">
                        <span className="text-xs text-green-700 font-medium">
                          置信度: {Math.round(detectedPlatform.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 活动名称字段已移除，系统将自动从OCR结果提取 */}
            
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