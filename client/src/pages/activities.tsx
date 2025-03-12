import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Layout } from '@/components/layout/sidebar';
import { ActivitiesTable } from '@/components/tables/activities-table';
import { useToast } from '@/hooks/use-toast';
import { ButtonFix } from '@/components/ui/button-fix';
import { ScreenshotUploadModal } from '@/components/modals/screenshot-upload-modal';

export default function Activities() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState<boolean>(false);
  
  // 定义活动接口
  interface Activity {
    id: number;
    name: string;
    description: string;
    platform: {
      id: number;
      name: string;
      shortName?: string;
    };
    startDate: string;
    endDate: string;
    timeRemaining: string;
    discount: string;
    commissionRate: string;
    status: string;
    tag?: string;
  }
  
  // 定义平台接口
  interface Platform {
    id: number;
    name: string;
    shortName?: string;
  }

  // Fetch activities and platforms for filtering
  const { data: activities, isLoading, refetch } = useQuery<Activity[]>({
    queryKey: ['/api/activities', { status: statusFilter, platform: platformFilter }],
  });

  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ['/api/accounts'],
  });

  // Join/leave activity mutation
  const toggleActivityMutation = useMutation({
    mutationFn: async ({ activityId, action }: { activityId: number, action: 'join' | 'leave' }) => {
      await fetch(`/api/activities/${activityId}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "操作成功",
        description: "活动状态已成功更新",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "操作失败",
        description: `发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive",
      });
    }
  });

  const handleJoinActivity = (id: number) => {
    toggleActivityMutation.mutate({ activityId: id, action: 'join' });
  };

  const handleLeaveActivity = (id: number) => {
    if (confirm('确定要退出此活动吗？')) {
      toggleActivityMutation.mutate({ activityId: id, action: 'leave' });
    }
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: "刷新中",
      description: "正在更新活动数据...",
    });
  };

  return (
    <Layout>
      <div className="py-6">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">OTA活动一览</h1>
              <p className="mt-2 text-sm text-gray-700">
                查看所有平台的促销活动，管理参与状态
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <ButtonFix
                onClick={() => setIsScreenshotModalOpen(true)}
                variant="default"
                icon={<span className="material-icons text-sm">add_photo_alternate</span>}
              >
                上传截图添加
              </ButtonFix>
              
              <ButtonFix
                onClick={handleRefresh}
                variant="outline"
                icon={<span className="material-icons text-sm">refresh</span>}
              >
                刷新
              </ButtonFix>
              
              <div className="relative">
                <select
                  id="platform-filter"
                  value={platformFilter || ''}
                  onChange={(e) => setPlatformFilter(e.target.value || null)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value="">所有平台</option>
                  {platforms?.map((platform) => (
                    <option key={platform.id} value={platform.id}>{platform.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="relative">
                <select
                  id="status-filter"
                  value={statusFilter || ''}
                  onChange={(e) => setStatusFilter(e.target.value || null)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value="">所有状态</option>
                  <option value="active">进行中</option>
                  <option value="upcoming">待开始</option>
                  <option value="ended">已结束</option>
                  <option value="undecided">未决定</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <ActivitiesTable 
              activities={activities || []} 
              showActions={true}
              showPlatform={true}
              className="mt-6"
              onJoin={handleJoinActivity}
              onLeave={handleLeaveActivity}
            />
          )}
        </div>
      </div>
      <ScreenshotUploadModal 
        isOpen={isScreenshotModalOpen} 
        onClose={() => setIsScreenshotModalOpen(false)} 
      />
    </Layout>
  );
}
