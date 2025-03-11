import { useQuery } from '@tanstack/react-query';
import { PromotionActivity } from '@shared/schema';
import { Link } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const formatDate = (dateString: string | Date) => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return format(date, 'yyyy-MM-dd');
};

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    'joined': { 
      label: '已参与', 
      className: 'bg-[#107c10] bg-opacity-10 text-[#107c10]' 
    },
    'pending': { 
      label: '待决定', 
      className: 'bg-[#d83b01] bg-opacity-10 text-[#d83b01]' 
    },
    'not_joined': { 
      label: '未参与', 
      className: 'bg-neutral-200 text-neutral-500' 
    },
  };

  const { label, className } = statusMap[status] || statusMap.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
};

export const RecentActivities = () => {
  // Query for recent activities
  const { data, isLoading, error } = useQuery<PromotionActivity[]>({
    queryKey: ['/api/activities/recent'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/activities/recent');
        if (!response.ok) throw new Error('Failed to fetch recent activities');
        return await response.json();
      } catch (error) {
        console.error('Error fetching recent activities:', error);
        throw error;
      }
    }
  });

  // Get platform data for each activity
  const { data: platforms } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/accounts');
        if (!response.ok) throw new Error('Failed to fetch platform accounts');
        return await response.json();
      } catch (error) {
        console.error('Error fetching platform accounts:', error);
        return [];
      }
    }
  });

  // Map platformId to platform name and logo
  const getPlatformInfo = (platformId: number) => {
    const platform = platforms?.find((p: any) => p.id === platformId);
    return {
      name: platform?.platformName || 'Unknown Platform',
      logo: platform?.logoUrl || '',
    };
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-neutral-500">近期促销活动</h3>
          <Link href="/activities" className="text-primary text-sm hover:underline">
            查看全部
          </Link>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-neutral-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-neutral-500">近期促销活动</h3>
          <Link href="/activities" className="text-primary text-sm hover:underline">
            查看全部
          </Link>
        </div>
        <div className="text-center py-6 text-neutral-400">
          加载促销活动时出错，请稍后再试
        </div>
      </div>
    );
  }

  const mockActivities = [
    {
      id: 1,
      platformId: 1,
      activityName: "双十一大促",
      startDate: new Date("2023-11-01"),
      endDate: new Date("2023-11-12"),
      discount: "8.5折",
      status: "joined",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 2,
      platformId: 2,
      activityName: "周末特惠",
      startDate: new Date("2023-10-20"),
      endDate: new Date("2023-10-22"),
      discount: "7.5折",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 3,
      platformId: 3,
      activityName: "秋季旅游节",
      startDate: new Date("2023-10-15"),
      endDate: new Date("2023-11-15"),
      discount: "8折",
      status: "not_joined",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Use mock data if no real data available
  const activities = data && data.length > 0 ? data : mockActivities;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-neutral-500">近期促销活动</h3>
        <Link href="/activities" className="text-primary text-sm hover:underline">
          查看全部
        </Link>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">平台</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">活动名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">开始日期</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">结束日期</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">折扣</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {activities.map((activity: any) => {
              const platform = getPlatformInfo(activity.platformId);
              
              return (
                <tr key={activity.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={platform.logo} alt={platform.name} />
                          <AvatarFallback>{platform.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-neutral-500">{platform.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-500">{activity.activityName}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-500">{formatDate(activity.startDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-500">{formatDate(activity.endDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-500">{activity.discount}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={activity.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
