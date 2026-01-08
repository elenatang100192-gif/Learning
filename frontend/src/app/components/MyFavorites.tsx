import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { favoriteAPI, followAPI, type Video as LeanCloudVideo } from '../services/leancloud';
import { VideoCard } from './VideoCard';

interface MyFavoritesProps {
  user: { email: string } | null;
  onBack: () => void;
}

// 前端使用的Video类型
interface FrontendVideo {
  id: string;
  title: string;
  titleEn: string;
  author: string;
  authorId?: string;
  avatar: string;
  thumbnail: string;
  videoUrl: string;
  videoUrlEn?: string | null;
  category: 'Tech' | 'Arts' | 'Business';
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
}

export function MyFavorites({ user, onBack }: MyFavoritesProps) {
  const { t, language } = useLanguage();
  const [videos, setVideos] = useState<FrontendVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 将LeanCloud数据转换为前端格式
  const convertToFrontendVideo = async (leanCloudVideo: LeanCloudVideo): Promise<FrontendVideo> => {
    // 转换分类
    const categoryMap: { [key: string]: 'Tech' | 'Arts' | 'Business' } = {
      '科技': 'Tech',
      '艺术人文': 'Arts',
      '商业业务': 'Business'
    };

    // 检查关注状态（如果有作者）
    let isFollowing = false;
    if (leanCloudVideo.author?.id) {
      try {
        isFollowing = await followAPI.isFollowing(leanCloudVideo.author.id);
      } catch (error) {
        console.error('检查关注状态失败:', error);
      }
    }

    // 根据语言选择作者名称
    let authorName = '未知作者';
    if (leanCloudVideo.author) {
      if (language === 'zh' && leanCloudVideo.author.usernameCn) {
        authorName = leanCloudVideo.author.usernameCn;
      } else {
        authorName = leanCloudVideo.author.username || '未知作者';
      }
    } else {
      // 后台发布的视频，没有author
      authorName = language === 'zh' ? '爱室丽人力中心' : 'Ashley HR Center';
    }

    // 默认头像：Ashley HR Center logo
    const defaultAvatar = '/ashley-logo.svg';
    
    return {
      id: leanCloudVideo.id,
      title: leanCloudVideo.title,
      titleEn: leanCloudVideo.titleEn || '',
      author: authorName,
      authorId: leanCloudVideo.author?.id || '',
      avatar: leanCloudVideo.author?.avatar || defaultAvatar,
      thumbnail: leanCloudVideo.coverUrl,
      videoUrl: leanCloudVideo.videoUrl,
      videoUrlEn: leanCloudVideo.videoUrlEn || null,
      category: categoryMap[leanCloudVideo.category.nameCn] || 'Tech',
      likes: leanCloudVideo.likeCount,
      comments: 0, // 收藏列表不需要评论数
      shares: 0,
      isLiked: false,
      isSaved: true, // 收藏列表中的视频都是已收藏的
      isFollowing
    };
  };

  // 加载收藏列表
  useEffect(() => {
    const loadFavorites = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const favoriteVideos = await favoriteAPI.getUserFavorites(1, 100);

        const formattedVideos: FrontendVideo[] = await Promise.all(
          favoriteVideos.map(video => convertToFrontendVideo(video))
        );

        setVideos(formattedVideos);
      } catch (error) {
        console.error('加载收藏列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [user]);

  // 监听滚动事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container || videos.length === 0) return;

    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollTop = container.scrollTop;
        const windowHeight = window.innerHeight;
        const newIndex = Math.round(scrollTop / windowHeight);

        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
          const allVideos = container.querySelectorAll('video');
          allVideos.forEach((video) => {
            if (video.paused === false) {
              video.pause();
            }
          });
          
          setCurrentIndex(newIndex);
        }
      }, 100);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [currentIndex, videos.length]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-zinc-900 pb-20">
        <div className="flex items-center justify-center h-full">
          <p className="text-white text-lg">{language === 'zh' ? '加载中...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-zinc-900 pb-20">
        {/* 顶部导航栏 */}
        <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-white hover:text-zinc-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg flex-1">{language === 'zh' ? '我的收藏' : 'My Favorites'}</h1>
        </div>
        <div className="flex items-center justify-center h-full">
          <p className="text-white text-lg">{language === 'zh' ? '暂无收藏' : 'No favorites yet'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-black">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-white hover:text-zinc-300 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white font-bold text-lg flex-1">{language === 'zh' ? '我的收藏' : 'My Favorites'}</h1>
        <span className="text-zinc-400 text-sm">{videos.length}</span>
      </div>

      {/* 视频列表 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="h-screen w-full snap-start snap-always flex-shrink-0"
          >
            <VideoCard
              video={video}
              isActive={index === currentIndex}
              showFollowButton={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

