import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Layout } from '@/components/layout/sidebar';
import { useToast } from '@/hooks/use-toast';
import { ButtonFix } from '@/components/ui/button-fix';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter
} from '@/components/ui/dialog';

/**
 * 策略参数管理页面
 * 系统专注于调整以下四个关键参数方向的权重：
 * 1. 关注远期预定 - 优先考虑长期预订周期效益
 * 2. 关注成本最小 - 优先考虑推广成本和投入产出比
 * 3. 关注展示最优 - 优先考虑在OTA平台的展示效果
 * 4. 关注当日OCC - 优先考虑当前入住率提升
 */

// 定义策略参数类型
interface StrategyParameter {
  id: number;
  name: string;
  description: string;
  paramKey: string;  // 后端返回的参数键名为paramKey，不是key
  value: number;
  createdAt: string;
  updatedAt: string;
}

// 定义策略模板类型
interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  addedAt: string;
}

// 定义策略类型
interface Strategy {
  id: string;
  name: string;
  appliedAt: string;
}

// 定义策略方向权重
interface StrategyWeights {
  longTermBooking: number; // 关注远期预定
  costEfficiency: number;  // 关注成本最小
  visibility: number;      // 关注展示最优
  occupancyRate: number;   // 关注当日OCC
}

export default function Admin() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  // 保存策略模板的对话框状态
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  
  // 策略方向权重状态
  const [weights, setWeights] = useState<StrategyWeights>({
    longTermBooking: 5,
    costEfficiency: 5,
    visibility: 5,
    occupancyRate: 5
  });
  
  // 检查用户是否有管理员权限
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      toast({
        title: "访问受限",
        description: "您没有访问管理控制台的权限",
        variant: "destructive"
      });
      // 如果用户不是管理员，重定向到首页
      setLocation('/');
    }
  }, [user, setLocation, toast]);
  
  // 获取当前策略参数
  const { data: strategyParams = [] as StrategyParameter[] } = useQuery<StrategyParameter[]>({
    queryKey: ['/api/admin/strategy-parameters']
  });
  
  // 当参数数据加载时更新权重
  useEffect(() => {
    if (strategyParams) {
      const paramsArray = Array.isArray(strategyParams) 
        ? strategyParams 
        : Object.values(strategyParams).filter(item => 
            item && typeof item === 'object' && 'id' in item && 'value' in item
          ) as StrategyParameter[];
      
      if (paramsArray.length > 0) {
        const newWeights: Partial<StrategyWeights> = {};
        
        paramsArray.forEach((param: StrategyParameter) => {
          if (param.paramKey === 'future_booking_weight') newWeights.longTermBooking = param.value;
          else if (param.paramKey === 'cost_optimization_weight') newWeights.costEfficiency = param.value;
          else if (param.paramKey === 'visibility_optimization_weight') newWeights.visibility = param.value;
          else if (param.paramKey === 'daily_occupancy_weight') newWeights.occupancyRate = param.value;
        });
        
        setWeights(prev => ({ ...prev, ...newWeights }));
      }
    }
  }, [strategyParams]);

  // 为了类型兼容性定义一个包含策略列表的接口
  interface StrategyParamsWithRecent {
    [key: number]: StrategyParameter;
    recentStrategies?: Strategy[];
  }

  // 强制类型转换
  const strategyParamsWithRecent = strategyParams as unknown as StrategyParamsWithRecent;

  // 获取策略模板
  const { data: strategyTemplates = [] as StrategyTemplate[] } = useQuery<StrategyTemplate[]>({
    queryKey: ['/api/admin/strategy-templates'],
  });

  // 更新策略参数
  const updateParamsMutation = useMutation({
    mutationFn: async (newParams: any) => {
      const response = await fetch('/api/admin/strategy-parameters', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newParams),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to update parameters');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/strategy-parameters'] });
      toast({
        title: "策略权重更新成功",
        description: "您的策略方向权重设置已更新",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "参数更新失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  });

  // 添加策略模板
  const addTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch('/api/admin/strategy-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ strategyId: templateId }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to add template');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/strategy-templates'] });
      setSelectedTemplate(null);
      toast({
        title: "模板添加成功",
        description: "策略模板已成功添加",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "模板添加失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  });

  // 删除策略模板
  const removeTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`/api/admin/strategy-templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove template');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/strategy-templates'] });
      toast({
        title: "模板删除成功",
        description: "策略模板已成功删除",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "模板删除失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  });

  // 处理权重调整
  const handleWeightChange = (key: keyof StrategyWeights, value: number) => {
    setWeights(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // 创建新的策略模板
  const createTemplateFromWeights = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const response = await fetch('/api/admin/strategy-templates/create-from-weights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          weights: {
            longTermBooking: weights.longTermBooking,
            costEfficiency: weights.costEfficiency,
            visibility: weights.visibility,
            occupancyRate: weights.occupancyRate
          }
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to create template from weights');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/strategy-templates'] });
      setSaveDialogOpen(false);
      setTemplateName('');
      setTemplateDescription('');
      toast({
        title: "模板创建成功",
        description: "策略权重模板已成功创建",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "模板创建失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  });

  // 处理模板创建对话框的提交
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "无法创建模板",
        description: "请输入策略模板名称",
        variant: "destructive",
      });
      return;
    }
    
    createTemplateFromWeights.mutate({
      name: templateName,
      description: templateDescription
    });
  };

  // 保存所有权重
  const saveAllWeights = () => {
    // 检查是否为对象格式，并转换为数组
    let paramsArray: StrategyParameter[] = [];
    
    if (strategyParams) {
      // 如果是数组，直接使用
      if (Array.isArray(strategyParams)) {
        paramsArray = strategyParams;
      }
      // 如果是对象格式（非数组），则需要转换为数组
      else if (typeof strategyParams === 'object') {
        // 筛选出真正的参数对象，排除'recentStrategies'等非参数字段
        paramsArray = Object.values(strategyParams)
          .filter(item => item && typeof item === 'object' && 'id' in item && 'value' in item) as StrategyParameter[];
      }
    }
    
    if (paramsArray.length === 0) return;
    
    // 更新参数值
    const updatedParams = paramsArray.map((param: StrategyParameter) => {
      let value = param.value;
      
      // 根据参数键名查找对应的权重值
      if (param.paramKey === 'future_booking_weight') value = weights.longTermBooking;
      else if (param.paramKey === 'cost_optimization_weight') value = weights.costEfficiency;
      else if (param.paramKey === 'visibility_optimization_weight') value = weights.visibility;
      else if (param.paramKey === 'daily_occupancy_weight') value = weights.occupancyRate;
      
      return { id: param.id, value };
    });
    
    // 应用更新并打开保存为模板对话框
    updateParamsMutation.mutate(updatedParams, {
      onSuccess: () => {
        setSaveDialogOpen(true);
      }
    });
  };

  // 处理模板添加
  const handleAddTemplate = () => {
    if (selectedTemplate) {
      addTemplateMutation.mutate(selectedTemplate);
    }
  };

  // 处理模板删除
  const handleRemoveTemplate = (templateId: string) => {
    if (confirm('确定要删除此模板吗？')) {
      removeTemplateMutation.mutate(templateId);
    }
  };

  return (
    <Layout>
      <div className="py-6">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">管理员控制面板</h1>
              <p className="mt-2 text-sm text-gray-700">
                调整策略方向权重和管理策略模板
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-8">
            {/* 策略方向权重调整 */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">策略方向权重</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  调整各个策略方向的权重值（0-10），AI将根据这些权重生成相应的策略推荐
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <div className="space-y-6">
                  {/* 关注远期预定 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <span className="material-icons text-primary-600 mr-2">date_range</span>
                      <h4 className="text-base font-medium text-gray-800">关注远期预定</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">优先考虑长期预订周期效益，适合提前预订较长的旅游淡季或计划型客户</p>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">权重值</label>
                        <span className="text-sm text-gray-500">{weights.longTermBooking}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={weights.longTermBooking}
                        onChange={(e) => handleWeightChange('longTermBooking', parseInt(e.target.value))}
                        className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 px-1">
                        <span>低</span>
                        <span>中</span>
                        <span>高</span>
                      </div>
                    </div>
                  </div>

                  {/* 关注成本最小 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <span className="material-icons text-primary-600 mr-2">savings</span>
                      <h4 className="text-base font-medium text-gray-800">关注成本最小</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">优先考虑推广成本和投入产出比，适合资源有限时期或预算受限场景</p>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">权重值</label>
                        <span className="text-sm text-gray-500">{weights.costEfficiency}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={weights.costEfficiency}
                        onChange={(e) => handleWeightChange('costEfficiency', parseInt(e.target.value))}
                        className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 px-1">
                        <span>低</span>
                        <span>中</span>
                        <span>高</span>
                      </div>
                    </div>
                  </div>

                  {/* 关注展示最优 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <span className="material-icons text-primary-600 mr-2">visibility</span>
                      <h4 className="text-base font-medium text-gray-800">关注展示最优</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">优先考虑在OTA平台的曝光度和展示效果，适合提高品牌知名度和市场占有率</p>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">权重值</label>
                        <span className="text-sm text-gray-500">{weights.visibility}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={weights.visibility}
                        onChange={(e) => handleWeightChange('visibility', parseInt(e.target.value))}
                        className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 px-1">
                        <span>低</span>
                        <span>中</span>
                        <span>高</span>
                      </div>
                    </div>
                  </div>

                  {/* 关注当日OCC */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <span className="material-icons text-primary-600 mr-2">hotel</span>
                      <h4 className="text-base font-medium text-gray-800">关注当日OCC</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">优先考虑短期内提高当前入住率，适合旺季或需要快速填补空房的场景</p>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">权重值</label>
                        <span className="text-sm text-gray-500">{weights.occupancyRate}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={weights.occupancyRate}
                        onChange={(e) => handleWeightChange('occupancyRate', parseInt(e.target.value))}
                        className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 px-1">
                        <span>低</span>
                        <span>中</span>
                        <span>高</span>
                      </div>
                    </div>
                  </div>

                  {/* 保存按钮 */}
                  <div className="flex justify-end">
                    <ButtonFix
                      onClick={saveAllWeights}
                      disabled={updateParamsMutation.isPending}
                      className="px-4 py-2"
                    >
                      {updateParamsMutation.isPending ? '保存中...' : '保存所有权重设置'}
                    </ButtonFix>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Strategy Templates Management */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">策略模板管理</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  管理可供快速应用的策略模板
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">添加新模板</h4>
                    <div className="flex space-x-2">
                      <select 
                        className="flex-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        value={selectedTemplate || ''}
                        onChange={(e) => setSelectedTemplate(e.target.value || null)}
                      >
                        <option value="">选择一个最近应用的策略</option>
                        {strategyParamsWithRecent?.recentStrategies?.map((strategy: Strategy) => (
                          <option key={strategy.id} value={strategy.id}>
                            {strategy.name} ({new Date(strategy.appliedAt).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                      <ButtonFix 
                        onClick={handleAddTemplate}
                        disabled={!selectedTemplate}
                      >
                        添加为模板
                      </ButtonFix>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">现有模板</h4>
                    {strategyTemplates && strategyTemplates.length > 0 ? (
                      <div className="border rounded-md divide-y">
                        {strategyTemplates.map((template: StrategyTemplate) => (
                          <div key={template.id} className="p-4 flex items-center justify-between">
                            <div>
                              <h5 className="text-sm font-medium text-gray-900">{template.name}</h5>
                              <p className="text-xs text-gray-500">{template.description}</p>
                              <p className="text-xs text-gray-400 mt-1">添加于 {new Date(template.addedAt).toLocaleDateString()}</p>
                            </div>
                            <ButtonFix
                              onClick={() => handleRemoveTemplate(template.id)}
                              size="sm"
                              variant="outline"
                            >
                              删除
                            </ButtonFix>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <p>暂无策略模板</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 保存策略模板对话框 */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>保存为策略模板</DialogTitle>
            <DialogDescription>
              为当前权重设置创建一个模板，以便将来快速应用相同的策略方向
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                模板名称 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="输入描述性名称"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                描述（可选）
              </label>
              <textarea
                id="description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="描述此策略模板的应用场景或特点"
              />
            </div>
          </div>
          <DialogFooter>
            <ButtonFix
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={createTemplateFromWeights.isPending}
            >
              取消
            </ButtonFix>
            <ButtonFix 
              onClick={handleSaveTemplate}
              disabled={createTemplateFromWeights.isPending}
            >
              {createTemplateFromWeights.isPending ? '保存中...' : '保存模板'}
            </ButtonFix>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}