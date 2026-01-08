import React, { useState, useRef, useEffect } from 'react';
import { VideoInteractions } from './VideoInteractions';
import { useLanguage } from '../contexts/LanguageContext';
import { videoAPI, followAPI } from '../services/leancloud';
import { toast } from 'sonner';

interface Video {
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

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  showFollowButton?: boolean; // 是否显示关注按钮，默认false（home页面不显示）
}

export function VideoCard({ video, isActive, showFollowButton = false }: VideoCardProps) {
  const { t, language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isFollowing, setIsFollowing] = useState(video.isFollowing);

  // 当video.isFollowing变化时更新状态
  useEffect(() => {
    setIsFollowing(video.isFollowing);
  }, [video.isFollowing]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  // 根据语言选择视频URL：英文优先使用videoUrlEn，如果没有则使用videoUrl
  const currentVideoUrl = language === 'en' && video.videoUrlEn 
    ? video.videoUrlEn 
    : video.videoUrl;

  // 当语言或视频URL变化时，更新视频源
  useEffect(() => {
    if (!videoRef.current) return;
    
    const wasPlaying = !videoRef.current.paused;
    const currentTime = videoRef.current.currentTime;
    
    videoRef.current.src = currentVideoUrl;
    videoRef.current.load();
    
    // 如果之前正在播放，恢复播放状态
    if (wasPlaying && isActive) {
      videoRef.current.currentTime = currentTime;
      videoRef.current.play().catch(() => {
        // 自动播放可能被浏览器阻止
      });
    }
  }, [currentVideoUrl, isActive]);

  // 当视频激活时自动播放，否则暂停
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      // 视频激活时自动播放（滚动切换时）
      videoRef.current.play().catch(() => {
        // 自动播放可能被浏览器阻止
      });
      setIsPlaying(true);

      // 记录观看历史和增加观看次数
      const recordWatch = async () => {
        try {
          await videoAPI.recordWatchHistory(video.id, 0);
          // 延迟几秒后增加观看次数，避免重复计数
          setTimeout(async () => {
            await videoAPI.incrementViewCount(video.id);
          }, 3000);
        } catch (error) {
          console.error('记录观看失败:', error);
        }
      };
      recordWatch();
    } else {
      // 非激活状态时强制暂停并重置播放状态
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  // 处理播放/暂停切换
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      // 暂停当前视频
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      // 播放当前视频（只有激活的视频才能播放）
      if (isActive) {
        videoRef.current.play().catch(() => {
          console.error('播放失败');
        });
      setIsPlaying(true);
      }
    }

    // 显示控制条
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      if (!isPlaying) setShowControls(false);
    }, 3000);
  };

  // 更新进度条
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(progress);
  };

  // 视频结束时循环播放（只有激活的视频才循环）
  const handleVideoEnd = () => {
    if (videoRef.current && isActive && isPlaying) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        console.error('循环播放失败');
      });
    }
  };

  // 点击视频区域切换播放状态
  const handleVideoClick = (e: React.MouseEvent) => {
    // 如果点击的是交互按钮区域，不处理
    if ((e.target as HTMLElement).closest('.video-interactions')) {
      return;
    }
    togglePlay();
  };

  // 处理关注/取消关注
  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!video.authorId) return;

    try {
      const following = await followAPI.toggleFollow(video.authorId);
      setIsFollowing(following);
      toast.success(following ? (language === 'zh' ? '已关注' : 'Following') : (language === 'zh' ? '已取消关注' : 'Unfollowed'));
    } catch (error) {
      console.error('关注操作失败:', error);
      toast.error(language === 'zh' ? '操作失败，请重试' : 'Operation failed, please try again');
    }
  };

  return (
    <div className="relative h-full w-full bg-black">
      {/* 视频 - 抖音风格：全屏填充 */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          src={currentVideoUrl}
          poster={video.thumbnail}
          loop={false}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnd}
          onClick={handleVideoClick}
        />
      </div>

      {/* 播放/暂停图标 - 抖音风格：更大更明显 */}
      {showControls && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-24 h-24 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-md border-2 border-white/30">
            <svg className="w-14 h-14 text-white ml-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* 右侧交互按钮 - 抖音风格：固定在右侧，位于底部导航上方，确保不遮挡导航菜单 */}
      {/* 底部导航菜单高度 h-16 (64px) + safe-area-bottom，所以需要至少 80px+ 的间距 */}
      <div className="absolute right-4 bottom-40 z-20">
        <VideoInteractions video={video} />
      </div>

      {/* 进度条 - 抖音风格：固定在底部导航上方 */}
      <div className="absolute bottom-32 left-0 right-0 z-20 px-4">
        <div className="h-0.5 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 底部作者信息区域 - 位于底部导航菜单上方，确保不遮挡 */}
      {/* 底部导航菜单高度 h-16 (64px) + safe-area-bottom，所以需要至少 80px+ 的间距 */}
      <div className="absolute bottom-32 left-0 right-0 z-40 pb-2 px-4">
        {/* 背景渐变，确保文字可见 */}
        <div className="bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-4 -mx-4 px-4 rounded-t-lg">
          {/* 视频信息 - 抖音风格：左侧作者信息 */}
          <div className="text-white">
            <div className="flex items-center gap-3 mb-2">
              <img
                src={video.avatar}
                alt={video.author}
                className="w-10 h-10 rounded-full border-2 border-white object-cover flex-shrink-0 bg-white"
                onError={(e) => {
                  // 如果图片加载失败，使用默认头像
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('ashley-avatar.jpg')) {
                    target.src = '/ashley-avatar.jpg';
                  }
                }}
              />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{video.author}</div>
                {showFollowButton && video.authorId && video.authorId.trim() !== '' && (
                  <button 
                    onClick={handleFollow}
                    className={`px-3 py-1 text-xs font-semibold rounded-full flex-shrink-0 transition-colors whitespace-nowrap ${
                      isFollowing 
                        ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
                        : 'bg-white text-black hover:bg-white/90'
                    }`}
                  >
                    {isFollowing ? (language === 'zh' ? '已关注' : 'Following') : (language === 'zh' ? '关注' : 'Follow')}
                  </button>
                )}
              </div>
            </div>

            {/* 视频标题 - 抖音风格：最多2行，右侧留出空间给互动按钮 */}
            <p className="text-sm leading-relaxed line-clamp-2 pr-20">{language === 'zh' ? video.title : video.titleEn}</p>
          </div>
        </div>
      </div>
    </div>
  );
}