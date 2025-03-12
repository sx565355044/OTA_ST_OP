import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId?: number | null;
}

const accountSchema = z.object({
  platform_name: z.string().min(1, '请输入平台名称'),
  account_type: z.string().min(1, '请选择账户类型'),
  screenshots: z.array(z.instanceof(File)).optional().default([])
});

type AccountFormValues = z.infer<typeof accountSchema>;

export function AccountModal({ isOpen, onClose, accountId }: AccountModalProps) {
  const { toast } = useToast();
  const isEditing = accountId !== undefined && accountId !== null;
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  
  // Fetch account data if editing
  const { data: accountData, isLoading: isLoadingAccount } = useQuery({
    queryKey: ['/api/accounts', accountId],
    enabled: isEditing && isOpen,
    retry: 1,
  });
  
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      platform_name: '',
      account_type: '商家账户',
    },
  });
  
  // Set form values when account data is loaded
  useEffect(() => {
    if (accountData && typeof accountData === 'object') {
      const account = accountData as any; // 临时解决类型问题
      form.reset({
        platform_name: account.name || '',
        account_type: account.accountType || '商家账户',
      });
    }
  }, [accountData, form.reset, isEditing]);
  
  // 处理截图上传
  const handleScreenshotChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      form.setValue("screenshots", fileArray);
      
      // 显示第一个文件的预览（可以扩展为多图预览）
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(fileArray[0]);
    }
  };
  
  // Create/Update account mutation
  const accountMutation = useMutation({
    mutationFn: async (data: AccountFormValues) => {
      const url = isEditing 
        ? `/api/accounts/${accountId}` 
        : '/api/accounts';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      // 创建FormData来处理文件上传
      const formData = new FormData();
      formData.append('name', data.platform_name);
      formData.append('accountType', data.account_type);
      
      // 如果有多个截图，添加到formData
      if (data.screenshots && data.screenshots.length > 0) {
        // 对每个文件使用相同的字段名但附加索引
        data.screenshots.forEach((file, index) => {
          formData.append(`screenshots`, file);
        });
      }
      
      try {
        const response = await fetch(url, {
          method,
          body: formData,
          credentials: 'include',
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`请求失败: ${response.status} ${response.statusText}`, errorData);
          throw new Error(`账户${isEditing ? '更新' : '创建'}失败: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result;
      } catch (error) {
        console.error(`请求错误:`, error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: isEditing ? "账户更新成功" : "账户添加成功",
        description: isEditing 
          ? "OTA平台账户信息已成功更新" 
          : "OTA平台账户已成功添加到系统",
        variant: "success",
      });
      onClose();
      setScreenshotPreview(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: isEditing ? "账户更新失败" : "账户添加失败",
        description: `操作出错: ${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: AccountFormValues) => {
    accountMutation.mutate(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "编辑OTA平台账户" : "添加OTA平台账户"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "更新OTA平台账户信息" 
              : "通过截图方式添加新的OTA平台账户，无需输入账号和密码"}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 平台名称 */}
            <FormField
              control={form.control}
              name="platform_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>平台名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：携程、美团、飞猪等" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            

            
            {/* 账户类型 */}
            <FormField
              control={form.control}
              name="account_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>账户类型</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择账户类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="商家账户">商家账户</SelectItem>
                      <SelectItem value="企业账户">企业账户</SelectItem>
                      <SelectItem value="个人账户">个人账户</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* 截图上传 */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                OTA平台活动截图（支持多图）
              </label>
              <div className="border border-dashed border-input rounded-md p-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="hidden"
                  id="screenshot-upload"
                  multiple // 开启多文件选择
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
                      <div className="mt-2 text-sm text-blue-600">
                        {(() => {
                          const screenshots = form.getValues("screenshots");
                          const length = Array.isArray(screenshots) ? screenshots.length : 0;
                          return length > 1 
                            ? `已选择 ${length} 张图片` 
                            : "点击更换或添加更多截图";
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8">
                      <span className="material-icons text-gray-400 text-4xl">
                        {/* 上传图标 */}
                        ➕
                      </span>
                      <p className="mt-2 text-sm text-gray-500">点击上传OTA平台活动截图</p>
                      <p className="text-xs text-gray-400">支持多图上传，JPG、PNG格式</p>
                    </div>
                  )}
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                上传平台活动截图后，系统将通过OCR自动提取活动信息，以向量形式存储并用于智能分析
              </p>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={accountMutation.isPending}
              >
                取消
              </Button>
              <Button 
                type="submit"
                disabled={accountMutation.isPending}
              >
                {accountMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "更新中..." : "添加中..."}
                  </>
                ) : (
                  isEditing ? "更新账户" : "添加账户"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}