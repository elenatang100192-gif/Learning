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
  onProgressUpdate?: (progress: number) => void; // 进度更新回调
}

export function VideoCard({ video, isActive, showFollowButton = false, onProgressUpdate }: VideoCardProps) {
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
    // 通知父组件进度更新
    if (onProgressUpdate && isActive) {
      onProgressUpdate(progress);
    }
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
    <div className="relative h-full w-full bg-black flex items-center justify-center">
      {/* 视频 - 抖音风格：固定位置，自适应不同手机尺寸 */}
      <div className="absolute inset-0 w-full h-full">
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
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
          }}
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

    </div>
  );
}