import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Eye, Video, Users, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { statisticsAPI, dashboardAPI, type StatisticsData } from '../services/leancloud';

export function Statistics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // 模拟周播放数据（可以从API获取真实数据）
  const weeklyData = [
    { day: '周一', views: 1200 },
    { day: '周二', views: 1800 },
    { day: '周三', views: 1500 },
    { day: '周四', views: 2200 },
    { day: '周五', views: 2800 },
    { day: '周六', views: 3200 },
    { day: '周日', views: 2900 }
  ];

  // 模拟分类数据（可以从API获取真实数据）
  const categoryData = [
    { name: '科技', value: 45 },
    { name: '艺术人文', value: 30 },
    { name: '商业业务', value: 25 }
  ];

  const COLORS = ['#ff6b35', '#1a1a1a', '#737373'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // 并行加载统计数据和仪表板数据
      const [statsData, dashboard] = await Promise.all([
        statisticsAPI.getLatest(),
        dashboardAPI.getDashboardData()
      ]);

      setStats(statsData);
      setDashboardData(dashboard);
    } catch (error) {
      console.error('加载统计数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1>数据统计</h1>
          <p className="text-muted-foreground mt-1">正在加载数据...</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>数据统计</h1>
          <p className="text-muted-foreground mt-1">查看平台数据和用户活跃度</p>
        </div>

        <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-accent hover:text-accent-foreground">
          <RefreshCw className="h-4 w-4" />
          刷新数据
        </button>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">总视频数</p>
              <h2 className="mt-2">{stats?.totalVideos || 0}</h2>
              <p className="text-xs text-muted-foreground mt-1">已发布视频</p>
            </div>
            <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
              <Video className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">总播放量</p>
              <h2 className="mt-2">{(stats?.totalViews || 0).toLocaleString()}</h2>
              <p className="text-xs text-muted-foreground mt-1">累计观看次数</p>
            </div>
            <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
              <Eye className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">总点赞数</p>
              <h2 className="mt-2">{(stats?.totalLikes || 0).toLocaleString()}</h2>
              <p className="text-xs text-accent mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +12.5%
              </p>
            </div>
            <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">活跃用户</p>
              <h2 className="mt-2">{stats?.activeUsers || 0}</h2>
              <p className="text-xs text-muted-foreground mt-1">预估数据</p>
            </div>
            <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 每周播放趋势 */}
        <Card className="p-6">
          <h3 className="mb-4">每周播放趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="day" stroke="#737373" />
              <YAxis stroke="#737373" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e5e5e5',
                  borderRadius: '0.5rem'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="views" 
                stroke="#ff6b35" 
                strokeWidth={2}
                dot={{ fill: '#ff6b35', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* 分类分布 */}
        <Card className="p-6">
          <h3 className="mb-4">内容分类分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e5e5e5',
                  borderRadius: '0.5rem'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* 热门视频排行 */}
      <Card className="p-6">
        <h3 className="mb-4">热门视频排行</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.topVideos}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="title" stroke="#737373" />
            <YAxis stroke="#737373" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e5e5e5',
                borderRadius: '0.5rem'
              }}
            />
            <Bar dataKey="views" fill="#ff6b35" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* 详细数据表格 */}
      <Card className="p-6">
        <h3 className="mb-4">分类详细数据</h3>
        <div className="space-y-4">
          {stats.categoryDistribution.map((category, index) => (
            <div key={category.category} className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-4">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index] }}
                />
                <div>
                  <p>{category.category}</p>
                  <p className="text-muted-foreground">视频数量: {category.count}</p>
                </div>
              </div>
              <div className="text-right">
                <p>占比</p>
                <p className="text-accent">
                  {((category.count / stats.totalVideos) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
