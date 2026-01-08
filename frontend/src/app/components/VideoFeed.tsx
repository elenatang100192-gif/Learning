import { useState, useRef, useEffect } from 'react';
import { VideoCard } from './VideoCard';
import { videoAPI, categoryAPI, likeAPI, favoriteAPI, commentAPI, followAPI, type Video as LeanCloudVideo } from '../services/leancloud';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';

// 前端Video类型定义，与VideoCard和VideoInteractions兼容
interface FrontendVideo {
  id: string;
  title: string;
  titleEn: string;
  author: string;
  authorId?: string;
  avatar: string;
  thumbnail: string;
  videoUrl: string;
  videoUrlEn?: string | null; // 添加英文视频URL字段
  category: 'Tech' | 'Arts' | 'Business';
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
}

interface VideoFeedProps {
  category: 'Tech' | 'Arts' | 'Business';
  showFollowButton?: boolean; // 是否显示关注按钮
}

export function VideoFeed({ category, showFollowButton = false }: VideoFeedProps) {
  const { language } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videos, setVideos] = useState<FrontendVideo[]>([]);
  const [loading, setLoading] = useState(true);

  // 将LeanCloud数据转换为前端格式
  const convertToFrontendVideo = async (leanCloudVideo: LeanCloudVideo): Promise<FrontendVideo> => {
    // 检查点赞状态
    const isLiked = await likeAPI.isLiked(leanCloudVideo.id);

    // 检查收藏状态
    const isFavorited = await favoriteAPI.isFavorited(leanCloudVideo.id);

    // 检查关注状态（如果有作者）
    let isFollowing = false;
    if (leanCloudVideo.author?.id) {
      isFollowing = await followAPI.isFollowing(leanCloudVideo.author.id);
    }

    // 转换分类
    const categoryMap: { [key: string]: 'Tech' | 'Arts' | 'Business' } = {
      '科技': 'Tech',
      '艺术人文': 'Arts',
      '商业业务': 'Business'
    };

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

    // 默认头像：Ashley HR Center avatar
    // 使用 import.meta.env.BASE_URL 来适配开发和生产环境
    const defaultAvatar = `${import.meta.env.BASE_URL}ashley-avatar.jpg`;
    
    return {
      id: leanCloudVideo.id,
      title: leanCloudVideo.title,
      titleEn: leanCloudVideo.titleEn || '',
      author: authorName,
      authorId: leanCloudVideo.author?.id || '',
      avatar: leanCloudVideo.author?.avatar || defaultAvatar,
      thumbnail: leanCloudVideo.coverUrl,
      videoUrl: leanCloudVideo.videoUrl, // 中文视频URL
      videoUrlEn: leanCloudVideo.videoUrlEn || null, // 英文视频URL
      category: categoryMap[leanCloudVideo.category.nameCn] || 'Tech',
      likes: leanCloudVideo.likeCount,
      comments: await commentAPI.getCommentCount(leanCloudVideo.id),
      shares: 0,   // TODO: 添加分享功能
      isLiked,
      isSaved: isFavorited,
      isFollowing
    };
  };

  // 获取视频数据
  useEffect(() => {
    const loadVideos = async () => {
      setLoading(true);
      try {
        // 根据分类获取视频
        const categoryMap = {
          Tech: '科技',
          Arts: '艺术人文',
          Business: '商业业务'
        };

        const categoryName = categoryMap[category];
        
        const videoList = await videoAPI.getList({
          category: categoryName,
          status: '已发布',
          limit: 100
        });

        // 将LeanCloud数据转换为前端格式
        const formattedVideos: FrontendVideo[] = await Promise.all(
          videoList.map(video => convertToFrontendVideo(video))
        );

        // 根据语言过滤视频：
        // - 英文模式：只显示有videoUrlEn的视频
        // - 中文模式：只显示有videoUrl且title包含中文字符的视频（排除只有英文视频但没有中文视频的）
        const filteredVideos = language === 'en' 
          ? formattedVideos.filter(video => video.videoUrlEn && video.videoUrlEn.trim() !== '')
          : formattedVideos.filter(video => {
              // 中文模式：必须有videoUrl，且title必须包含中文字符
              // 使用正则表达式检查是否包含中文字符（包括中文标点）
              const hasChinese = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(video.title || '');
              return video.videoUrl && 
                     video.videoUrl.trim() !== '' && 
                     video.title && 
                     video.title.trim() !== '' &&
                     hasChinese; // 必须包含中文字符
            });

        // 去重：根据视频ID去重，确保同一个视频只出现一次
        const seenIds = new Set<string>();
        const uniqueVideos: FrontendVideo[] = [];
        
        for (const video of filteredVideos) {
          if (!seenIds.has(video.id)) {
            seenIds.add(video.id);
            uniqueVideos.push(video);
          } else {
            console.warn(`⚠️ 发现重复视频ID: ${video.id}, 标题: ${video.title}`);
          }
        }

        // 如果去重后数量减少，记录详细信息
        if (uniqueVideos.length < filteredVideos.length) {
          console.warn(`⚠️ 发现重复视频，已去重。原始数量: ${filteredVideos.length}, 去重后: ${uniqueVideos.length}`);
          const duplicateVideos = filteredVideos.filter((v, i, self) => 
            self.findIndex((item) => item.id === v.id) !== i
          );
          console.warn('重复的视频详情:', duplicateVideos.map(v => ({ 
            id: v.id, 
            title: v.title, 
            titleEn: v.titleEn,
            videoUrl: v.videoUrl,
            videoUrlEn: v.videoUrlEn
          })));
        }
        
        // 额外检查：根据标题和视频URL去重（防止不同ID但内容相同的视频）
        // 特别处理"The Power Law and Venture Capital"这类英文标题
        const finalVideos: FrontendVideo[] = [];
        const seenKeys = new Set<string>();
        const seenTitles = new Set<string>();
        
        for (const video of uniqueVideos) {
          // 使用title作为唯一键（如果标题相同，可能是重复发布）
          const titleKey = video.title.trim().toLowerCase();
          
          // 如果标题已经出现过，检查是否是重复
          if (seenTitles.has(titleKey)) {
            console.warn(`⚠️ 发现相同标题的重复视频: "${video.title}" (ID: ${video.id})`);
            // 保留第一个出现的视频，跳过后续重复的
            continue;
          }
          
          seenTitles.add(titleKey);
          
          // 同时使用title + videoUrl作为唯一键（如果videoUrl相同，可能是重复发布）
          const urlKey = `${video.title}_${video.videoUrl || video.videoUrlEn || ''}`;
          if (!seenKeys.has(urlKey)) {
            seenKeys.add(urlKey);
            finalVideos.push(video);
          } else {
            console.warn(`⚠️ 发现相同标题和视频URL的重复视频: ${video.title} (ID: ${video.id})`);
          }
        }
        
        if (finalVideos.length < uniqueVideos.length) {
          console.warn(`⚠️ 根据标题和URL去重，从 ${uniqueVideos.length} 减少到 ${finalVideos.length}`);
          const removedVideos = uniqueVideos.filter(v => !finalVideos.includes(v));
          console.warn('被移除的重复视频:', removedVideos.map(v => ({ 
            id: v.id, 
            title: v.title,
            titleEn: v.titleEn
          })));
        }

        setVideos(finalVideos);
        setCurrentIndex(0); // 重置到第一个视频
      } catch (error) {
        console.error('加载视频失败:', error);
        toast.error('加载视频失败');
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, [category, language]); // 添加language依赖，切换语言时重新加载并过滤视频

  // 监听滚动事件，更新当前视频索引
  useEffect(() => {
    const container = containerRef.current;
    if (!container || videos.length === 0) return;

    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      // 清除之前的定时器
      clearTimeout(scrollTimeout);
      
      // 延迟更新索引，等待滚动停止（CSS snap会自动对齐）
      scrollTimeout = setTimeout(() => {
        const scrollTop = container.scrollTop;
        const windowHeight = window.innerHeight;
        const newIndex = Math.round(scrollTop / windowHeight);

        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
          // 暂停所有视频元素（确保切换时没有残留播放）
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

  // 切换分类时重置索引和滚动位置
  useEffect(() => {
    setCurrentIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'instant',
      });
    }
  }, [category]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-scroll snap-y snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {videos.map((video, index) => (
        <div
          key={video.id}
          className="h-screen w-full snap-start snap-always flex-shrink-0 relative"
          style={{
            minHeight: '100vh',
            minHeight: '-webkit-fill-available', // iOS Safari 支持
          }}
        >
          <VideoCard
            video={video}
            isActive={index === currentIndex}
            showFollowButton={showFollowButton}
          />
        </div>
      ))}
    </div>
  );
}
