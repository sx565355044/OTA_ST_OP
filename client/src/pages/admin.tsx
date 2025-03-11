import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Layout } from '@/components/layout/sidebar';
import { useToast } from '@/hooks/use-toast';

export default function Admin() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Fetch strategy parameters
  const { data: strategyParams } = useQuery({
    queryKey: ['/api/admin/strategy-parameters'],
  });

  // Fetch strategy templates
  const { data: strategyTemplates } = useQuery({
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
              </div>
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
                    <button
                      type="button"
                      disabled={!selectedTemplate || addTemplateMutation.isPending}
                      onClick={handleAddTemplate}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      添加为模板
                    </button>
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
                            <button
                              type="button"
                              onClick={() => handleRemoveTemplate(template.id)}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <span className="material-icons text-sm mr-1">delete</span>
                              移除
                            </button>
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
