import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useAuthContext } from '@/context/AuthContext';
import { RefreshCw, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'wouter';

export const WelcomeCard = () => {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [_, navigate] = useNavigate();

  // Query for summary data
  const { data, isLoading } = useQuery({
    queryKey: ['/api/activities/stats'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/activities/stats');
        if (!response.ok) throw new Error('Failed to fetch activity stats');
        return await response.json();
      } catch (error) {
        // For demo, return mock data
        return {
          newActivities: 8,
          endingSoon: 3
        };
      }
    }
  });

  const handleRefresh = async () => {
    try {
      await apiRequest('POST', '/api/scrape', {});
      toast({
        title: "刷新成功",
        description: "已成功获取最新的促销活动数据",
      });
    } catch (error) {
      toast({
        title: "刷新失败",
        description: "获取活动数据时出错，请稍后再试",
        variant: "destructive",
      });
    }
  };

  const handleAddAccount = () => {
    navigate('/accounts');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h3 className="text-lg font-semibold text-neutral-500 mb-2">
        欢迎回来，{user || '王经理'}
      </h3>
      <p className="text-neutral-400 mb-4">
        {isLoading ? (
          "正在加载数据..."
        ) : (
          <>
            今天有 <span className="font-semibold text-primary">{data?.newActivities || 0} 个</span> 新的促销活动需要您的关注，
            其中 <span className="font-semibold text-[#d83b01]">{data?.endingSoon || 0} 个</span> 将在今天结束。
          </>
        )}
      </p>
      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={handleRefresh}
          className="bg-primary text-white hover:bg-opacity-90"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> 刷新活动数据
        </Button>
        <Button 
          onClick={handleAddAccount}
          variant="outline"
          className="border-primary text-primary hover:bg-neutral-100"
        >
          <Plus className="mr-2 h-4 w-4" /> 添加平台账户
        </Button>
      </div>
    </div>
  );
};
