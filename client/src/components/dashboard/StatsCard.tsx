import { useQuery } from '@tanstack/react-query';

interface StatsProps {
  statsKey: string;
  title: string;
  icon: string;
  bgColor: string;
  iconColor: string;
}

export const StatsCard = ({ statsKey, title, icon, bgColor, iconColor }: StatsProps) => {
  // Query for stats data
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
          activePromotions: 12,
          joinedPromotions: 5,
          pendingPromotions: 7,
          strategyExecutionRate: '78%'
        };
      }
    }
  });

  const getValue = () => {
    if (isLoading) return '...';
    return data?.[statsKey] || '0';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center">
        <div className={`rounded-full ${bgColor} p-3 mr-4`}>
          <i className={`fas fa-${icon} ${iconColor}`}></i>
        </div>
        <div>
          <p className="text-neutral-400 text-sm">{title}</p>
          <h4 className="text-xl font-semibold">{getValue()}</h4>
        </div>
      </div>
    </div>
  );
};

export const StatsCards = () => {
  const stats = [
    {
      key: 'activePromotions',
      title: '当前活动',
      icon: 'calendar-check',
      bgColor: 'bg-primary bg-opacity-10',
      iconColor: 'text-primary'
    },
    {
      key: 'joinedPromotions',
      title: '已参与活动',
      icon: 'thumbs-up',
      bgColor: 'bg-[#107c10] bg-opacity-10',
      iconColor: 'text-[#107c10]'
    },
    {
      key: 'pendingPromotions',
      title: '待决定',
      icon: 'clock',
      bgColor: 'bg-[#d83b01] bg-opacity-10',
      iconColor: 'text-[#d83b01]'
    },
    {
      key: 'strategyExecutionRate',
      title: '策略执行率',
      icon: 'chart-line',
      bgColor: 'bg-[#004578] bg-opacity-10',
      iconColor: 'text-[#004578]'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {stats.map((stat) => (
        <StatsCard 
          key={stat.key}
          statsKey={stat.key}
          title={stat.title}
          icon={stat.icon}
          bgColor={stat.bgColor}
          iconColor={stat.iconColor}
        />
      ))}
    </div>
  );
};
