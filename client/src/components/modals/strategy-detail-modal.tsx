import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface StrategyDetailModalProps {
  strategyId: string;
  isOpen: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

export function StrategyDetailModal({ strategyId, isOpen, onClose, readOnly = false }: StrategyDetailModalProps) {
  const { toast } = useToast();
  const [isApplying, setIsApplying] = useState(false);

  // Fetch strategy details
  const { data: strategy, isLoading } = useQuery({
    queryKey: ['/api/strategies/detail', strategyId],
    enabled: isOpen && !!strategyId,
  });

  // Apply strategy mutation
  const applyStrategyMutation = useMutation({
    mutationFn: async () => {
      setIsApplying(true);
      const response = await fetch(`/api/strategies/${strategyId}/apply`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to apply strategy');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategies/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "策略已应用",
        description: "您选择的策略已成功应用",
        variant: "success",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "策略应用失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsApplying(false);
    }
  });

  const handleApplyStrategy = () => {
    applyStrategyMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {isLoading ? (
            <div className="bg-white px-4 py-5 sm:p-6">
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                      <span>{strategy?.name}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${strategy?.isRecommended ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-800'}`}>
                        {strategy?.isRecommended ? '推荐' : '备选'}
                      </span>
                    </h3>
                    <div className="mt-4 border-b border-gray-200 pb-5">
                      <h4 className="text-sm font-medium text-gray-700">策略概述</h4>
                      <p className="mt-1 text-sm text-gray-600">
                        {strategy?.description}
                      </p>
                    </div>
                    
                    <div className="mt-5 border-b border-gray-200 pb-5">
                      <h4 className="text-sm font-medium text-gray-700">优势与劣势</h4>
                      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="border border-green-200 rounded-md bg-green-50 p-3">
                          <h5 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                            <span className="material-icons text-green-600 text-sm mr-1">thumb_up</span>
                            优势
                          </h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {strategy?.advantages.map((advantage, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-green-600 font-bold mr-1">•</span>
                                {advantage}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="border border-red-200 rounded-md bg-red-50 p-3">
                          <h5 className="text-sm font-medium text-red-800 mb-2 flex items-center">
                            <span className="material-icons text-red-600 text-sm mr-1">thumb_down</span>
                            劣势
                          </h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {strategy?.disadvantages.map((disadvantage, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-red-600 font-bold mr-1">•</span>
                                {disadvantage}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-5">
                      <h4 className="text-sm font-medium text-gray-700">建议执行步骤</h4>
                      <ol className="mt-2 space-y-4">
                        {strategy?.steps.map((step, index) => (
                          <li key={index} className="flex">
                            <div className="flex-shrink-0">
                              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 text-sm font-medium">{index + 1}</div>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-gray-600">{step}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                    
                    {strategy?.notes && (
                      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <span className="material-icons text-yellow-600">warning</span>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">执行注意事项</h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              <p>执行此策略过程中，需要注意以下几点：</p>
                              <ul className="mt-1 list-disc pl-5">
                                {strategy.notes.map((note, index) => (
                                  <li key={index}>{note}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={handleApplyStrategy}
                    disabled={isApplying}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isApplying ? '应用中...' : '应用策略'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  关闭
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
