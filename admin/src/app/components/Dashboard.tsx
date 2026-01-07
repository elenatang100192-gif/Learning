import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Video as VideoIcon, Eye, AlertCircle, Users, Play } from 'lucide-react';
import { videoAPI, userAPI, type Video } from '../services/leancloud';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface DashboardData {
  totalUsers: number;
  totalVideos: number;
  totalViews: number;
  pendingCount: number;
  weeklyTrend: Array<{ day: string; views: number }>;
  topVideos: Video[];
}

export function Dashboard() {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // 并行获取数据
      const [publishedVideos, pendingVideos, allVideos, usersResponse] = await Promise.all([
        videoAPI.getList({ status: '已发布' }, 1, 10000), // 已发布的视频
        videoAPI.getList({ status: '待审核' }, 1, 10000), // 待审核视频
        videoAPI.getList({}, 1, 10000), // 所有视频（用于统计总视频数）
        // 获取用户列表（limit最大为100，但API会返回总数）
        (async () => {
          try {
            const response = await fetch('http://localhost:3001/api/users?page=1&limit=100');
            const data = await response.json();
            return data;
          } catch (error) {
            console.error('获取用户列表失败:', error);
            return { success: false, data: [], pagination: { total: 0 } };
          }
        })()
      ]);
      
      // 从用户API响应中获取总数
      const totalUsers = usersResponse?.success && usersResponse?.pagination?.total !== undefined 
        ? usersResponse.pagination.total 
        : 0;
      
      // 计算总播放量（已发布视频的播放量之和）
      const totalViews = publishedVideos.reduce((sum, video) => sum + (video.viewCount || 0), 0);
      
      // 计算每周播放趋势（最近7天）
      const weeklyTrend = calculateWeeklyTrend(publishedVideos);
      
      // 获取热门视频（播放量前5）
      const topVideos = [...publishedVideos]
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, 5);

      setData({
        totalUsers, // 用户管理中的用户数量
        totalVideos: allVideos.length,
        totalViews,
        pendingCount: pendingVideos.length,
        weeklyTrend,
        topVideos
      });
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
      toast.error('Failed to load data, please refresh');
    } finally {
      setLoading(false);
    }
  };

  // 计算每周播放趋势（统计最近7天的播放量趋势）
  const calculateWeeklyTrend = (videos: Video[]) => {
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // 获取最近7天的日期范围（从今天往前推6天，共7天）
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // 最近7天（包括今天）

    // 初始化每周的数据，存储日期和播放量
    const weeklyDataMap = new Map<string, number>();
    weekDays.forEach((day, index) => {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + index);
      const dateStr = date.toISOString().split('T')[0];
      weeklyDataMap.set(dateStr, 0);
    });

    // 统计每个视频在最近7天的播放量
    // 将视频的播放量按发布日期分配到对应的日期
    videos.forEach(video => {
      if (video.publishDate) {
        const publishDate = new Date(video.publishDate);
        const publishDateStr = publishDate.toISOString().split('T')[0];
        
        // 如果视频是在最近7天内发布的，将其播放量加到对应日期
        if (weeklyDataMap.has(publishDateStr)) {
          const currentViews = weeklyDataMap.get(publishDateStr) || 0;
          weeklyDataMap.set(publishDateStr, currentViews + (video.viewCount || 0));
        } else {
          // 如果视频发布日期不在最近7天，但视频存在，将其播放量分配到最近的一天
          // 或者如果视频是在7天前发布的，将其播放量平均分配到7天
          if (publishDate < sevenDaysAgo) {
            // 视频发布时间早于最近7天，将播放量平均分配到7天
            const viewsPerDay = Math.floor((video.viewCount || 0) / 7);
            const remainder = (video.viewCount || 0) % 7;
            weekDays.forEach((_, index) => {
              const date = new Date(sevenDaysAgo);
              date.setDate(sevenDaysAgo.getDate() + index);
              const dateStr = date.toISOString().split('T')[0];
              const currentViews = weeklyDataMap.get(dateStr) || 0;
              weeklyDataMap.set(dateStr, currentViews + viewsPerDay + (index < remainder ? 1 : 0));
            });
          }
        }
      } else {
        // 如果没有发布日期，将播放量平均分配到7天
        const viewsPerDay = Math.floor((video.viewCount || 0) / 7);
        const remainder = (video.viewCount || 0) % 7;
        weekDays.forEach((_, index) => {
          const date = new Date(sevenDaysAgo);
          date.setDate(sevenDaysAgo.getDate() + index);
          const dateStr = date.toISOString().split('T')[0];
          const currentViews = weeklyDataMap.get(dateStr) || 0;
          weeklyDataMap.set(dateStr, currentViews + viewsPerDay + (index < remainder ? 1 : 0));
        });
      }
    });

    // 转换为数组格式，按日期顺序
    return weekDays.map((day, index) => {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + index);
      const dateStr = date.toISOString().split('T')[0];
      return {
        day,
        views: weeklyDataMap.get(dateStr) || 0
      };
    });
  };

  const handleViewVideo = (video: Video) => {
    setSelectedVideo(video);
    setIsVideoDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1>{t.dashboard}</h1>
          <p className="text-muted-foreground mt-1">{t.loading}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
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
          <h1>{t.dashboard}</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, view the latest platform data
          </p>
        </div>
        <Button onClick={loadDashboardData} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Total Users</p>
              <h2 className="mt-2">{(data?.totalUsers || 0).toLocaleString()}</h2>
            </div>
            <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Total Videos</p>
              <h2 className="mt-2">{(data?.totalVideos || 0).toLocaleString()}</h2>
            </div>
            <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
              <VideoIcon className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Total Views</p>
              <h2 className="mt-2">{(data?.totalViews || 0).toLocaleString()}</h2>
            </div>
            <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
              <Eye className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">{t.pending}</p>
              <h2 className="mt-2">{data?.pendingCount || 0}</h2>
            </div>
            <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>
      </div>

      {/* 图表和待审核视频 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 每周播放趋势 */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="mb-4">Weekly View Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data?.weeklyTrend || []}>
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
              <Bar dataKey="views" fill="#ff6b35" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 待审核视频 */}
        <Card className="p-6">
          <h3 className="mb-4">Pending Videos</h3>
          <div className="space-y-3">
            {data && data.pendingCount > 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {`${data.pendingCount} videos pending review`}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // 可以导航到视频管理页面的待审核标签
                    window.location.hash = '#videos';
                  }}
                >
                  Go to Review
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No pending videos
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* 热门视频 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3>{t.popularVideos}</h3>
        </div>
        <div className="space-y-4">
          {data && data.topVideos.length > 0 ? (
            data.topVideos.map((video, index) => (
              <div key={video.id} className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-accent text-accent-foreground rounded-full font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{video.title}</p>
                  <div className="flex items-center gap-1 text-muted-foreground mt-1">
                    <Eye className="h-3 w-3" />
                    <span>{(video.viewCount || 0).toLocaleString()} {t.views}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewVideo(video)}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {t.viewVideo}
                </Button>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {t.noVideoData}
            </p>
          )}
        </div>
      </Card>

      {/* 视频播放对话框 */}
      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="mt-4">
              <video
                controls
                className="w-full rounded-lg"
                src={selectedVideo.videoUrlEn || selectedVideo.videoUrl}
                poster={selectedVideo.coverUrl}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
