import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Layout } from '@/components/layout/sidebar';
import { useToast } from '@/hooks/use-toast';
import { ButtonFix } from '@/components/ui/button-fix';

// 定义策略参数类型
interface StrategyParameter {
  id: string;
  key: string;
  name: string;
  description: string;
  value: number;
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

export default function Admin() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('standard');
  
  // 预设参数配置
  const paramPresets = {
    longTerm: { // 关注远期预定
      longTermBooking: 9,
      costEfficiency: 5,
      visibility: 6,
      occupancyRate: 3,
      revenue: 7
    },
    minCost: { // 关注成本最小
      longTermBooking: 4,
      costEfficiency: 10,
      visibility: 3,
      occupancyRate: 5,
      revenue: 6
    },
    maxVisibility: { // 关注展示最优化
      longTermBooking: 5,
      costEfficiency: 3,
      visibility: 10,
      occupancyRate: 6,
      revenue: 7
    },
    dailyOcc: { // 关注当日OCC
      longTermBooking: 2,
      costEfficiency: 6,
      visibility: 5,
      occupancyRate: 10,
      revenue: 8
    }
  };

  // Fetch strategy parameters
  const { data: strategyParams = [] as StrategyParameter[] } = useQuery<StrategyParameter[]>({
    queryKey: ['/api/admin/strategy-parameters'],
  });

  // 为了类型兼容性定义一个包含策略列表的接口
  interface StrategyParamsWithRecent {
    [key: number]: StrategyParameter;
    recentStrategies?: Strategy[];
  }

  // 强制类型转换
  const strategyParamsWithRecent = strategyParams as unknown as StrategyParamsWithRecent;

  // Fetch strategy templates
  const { data: strategyTemplates = [] as StrategyTemplate[] } = useQuery<StrategyTemplate[]>({
    queryKey: ['/api/admin/strategy-templates'],
  });

  // Update strategy parameters mutation
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
        title: "参数更新成功",
        description: "策略生成参数已成功更新",
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

  // Add strategy template mutation
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

  // Remove strategy template mutation
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

  const handleParamChange = (paramId: string, value: number) => {
    if (!strategyParams) return;
    
    const updatedParams = strategyParams.map((param: any) => 
      param.id === paramId ? { ...param, value } : param
    );
    
    updateParamsMutation.mutate(updatedParams);
  };

  const handleAddTemplate = () => {
    if (selectedTemplate) {
      addTemplateMutation.mutate(selectedTemplate);
    }
  };

  const handleRemoveTemplate = (templateId: string) => {
    if (confirm('确定要删除此模板吗？')) {
      removeTemplateMutation.mutate(templateId);
    }
  };
  
  // 应用预设参数
  const applyPreset = (presetKey: string) => {
    if (!strategyParams) return;
    
    // 获取所选的预设
    const preset = paramPresets[presetKey as keyof typeof paramPresets];
    if (!preset) return;
    
    // 更新参数值
    const updatedParams = strategyParams.map((param: any) => {
      const paramKey = param.key as keyof typeof preset;
      if (preset[paramKey] !== undefined) {
        return { ...param, value: preset[paramKey] };
      }
      return param;
    });
    
    // 应用更新
    updateParamsMutation.mutate(updatedParams);
    
    // 切换到标准视图
    setActiveTab('standard');
    
    toast({
      title: "预设已应用",
      description: "已成功应用预设参数配置",
      variant: "success",
    });
  };

  return (
    <Layout>
      <div className="py-6">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">管理员控制面板</h1>
              <p className="mt-2 text-sm text-gray-700">
                调整策略生成参数并管理策略模板
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-8">
            {/* Strategy Generation Parameters */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">策略生成参数</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  调整以下参数以影响智能策略的生成
                </p>
                <div className="mt-4 border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setActiveTab('standard')}
                      className={`${
                        activeTab === 'standard'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      标准参数
                    </button>
                    <button
                      onClick={() => setActiveTab('presets')}
                      className={`${
                        activeTab === 'presets'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      预设管理
                    </button>
                  </nav>
                </div>
              </div>
              
              {activeTab === 'standard' ? (
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                  <div className="space-y-6">
                    {strategyParams?.map((param: any) => (
                      <div key={param.id}>
                        <div className="flex items-center justify-between">
                          <label htmlFor={param.id} className="block text-sm font-medium text-gray-700">
                            {param.name} <span className="font-normal text-gray-500">({param.description})</span>
                          </label>
                          <span className="text-sm text-gray-500">{param.value}</span>
                        </div>
                        <input
                          type="range"
                          id={param.id}
                          name={param.id}
                          min="0"
                          max="10"
                          step="1"
                          value={param.value}
                          onChange={(e) => handleParamChange(param.id, parseInt(e.target.value))}
                          className="mt-2 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 px-1">
                          <span>0</span>
                          <span>5</span>
                          <span>10</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                  <div className="space-y-6">
                    <p className="text-sm text-gray-700 mb-4">
                      选择一个预设参数配置来快速设置策略生成的倾向性。应用预设后，您仍可以在标准参数标签页中微调各项参数。
                    </p>
                    
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* 关注远期预定 */}
                      <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-primary-400 hover:ring-1 hover:ring-primary-400">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 text-primary-600">
                            <span className="material-icons">date_range</span>
                          </div>
                          <div className="ml-4 flex-1">
                            <h3 className="text-base font-medium text-gray-900 mb-1">关注远期预定</h3>
                            <p className="text-sm text-gray-500">优先考虑长期预订周期和未来收益</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <ButtonFix
                            onClick={() => applyPreset('longTerm')}
                            variant="outline"
                            className="w-full"
                          >
                            应用此预设
                          </ButtonFix>
                        </div>
                      </div>
                      
                      {/* 关注成本最小 */}
                      <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-primary-400 hover:ring-1 hover:ring-primary-400">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 text-green-600">
                            <span className="material-icons">savings</span>
                          </div>
                          <div className="ml-4 flex-1">
                            <h3 className="text-base font-medium text-gray-900 mb-1">关注成本最小</h3>
                            <p className="text-sm text-gray-500">优先考虑佣金成本和投入产出比</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <ButtonFix
                            onClick={() => applyPreset('minCost')}
                            variant="outline"
                            className="w-full"
                          >
                            应用此预设
                          </ButtonFix>
                        </div>
                      </div>
                      
                      {/* 关注展示最优化 */}
                      <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-primary-400 hover:ring-1 hover:ring-primary-400">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 text-indigo-600">
                            <span className="material-icons">visibility</span>
                          </div>
                          <div className="ml-4 flex-1">
                            <h3 className="text-base font-medium text-gray-900 mb-1">关注展示最优化</h3>
                            <p className="text-sm text-gray-500">优先考虑平台展示位置和流量</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <ButtonFix
                            onClick={() => applyPreset('maxVisibility')}
                            variant="outline"
                            className="w-full"
                          >
                            应用此预设
                          </ButtonFix>
                        </div>
                      </div>
                      
                      {/* 关注当日OCC */}
                      <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-primary-400 hover:ring-1 hover:ring-primary-400">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 text-orange-600">
                            <span className="material-icons">hotel</span>
                          </div>
                          <div className="ml-4 flex-1">
                            <h3 className="text-base font-medium text-gray-900 mb-1">关注当日OCC</h3>
                            <p className="text-sm text-gray-500">优先考虑入住率和短期收益</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <ButtonFix
                            onClick={() => applyPreset('dailyOcc')}
                            variant="outline"
                            className="w-full"
                          >
                            应用此预设
                          </ButtonFix>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Strategy Templates */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">策略模板管理</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  添加和管理策略参考模板
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex-1">
                    <label htmlFor="templateSelect" className="block text-sm font-medium text-gray-700 mb-1">
                      选择历史策略添加为模板
                    </label>
                    <select
                      id="templateSelect"
                      value={selectedTemplate || ''}
                      onChange={(e) => setSelectedTemplate(e.target.value || null)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    >
                      <option value="">选择一个策略...</option>
                      {strategyParams?.recentStrategies?.map((strategy: any) => (
                        <option key={strategy.id} value={strategy.id}>
                          {strategy.name} ({new Date(strategy.appliedAt).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="pt-6">
                    <ButtonFix
                      type="button"
                      disabled={!selectedTemplate || addTemplateMutation.isPending}
                      onClick={handleAddTemplate}
                      icon={<span className="material-icons text-sm">add</span>}
                    >
                      添加为模板
                    </ButtonFix>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-base font-medium text-gray-900">当前模板</h4>
                  {strategyTemplates?.length > 0 ? (
                    <ul className="mt-3 divide-y divide-gray-200">
                      {strategyTemplates.map((template: any) => (
                        <li key={template.id} className="py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-sm font-medium text-gray-900">{template.name}</h5>
                              <p className="text-sm text-gray-500">{template.description}</p>
                              <div className="mt-1 flex items-center text-xs text-gray-500">
                                <span className="material-icons text-gray-400 mr-1 text-sm">calendar_today</span>
                                添加于 {new Date(template.addedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <ButtonFix
                              variant="outline"
                              onClick={() => handleRemoveTemplate(template.id)}
                              size="sm"
                              icon={<span className="material-icons text-sm">delete</span>}
                              className="text-red-700 hover:bg-red-50 hover:border-red-300"
                            >
                              移除
                            </ButtonFix>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500">暂无策略模板</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
