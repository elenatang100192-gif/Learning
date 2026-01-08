import { useState, useEffect } from 'react';
import { CommentDrawer } from './CommentDrawer';
import { useLanguage } from '../contexts/LanguageContext';
import { likeAPI, favoriteAPI, authAPI } from '../services/leancloud';
import { toast } from 'sonner';

interface Video {
  id: string;
  title: string;
  titleEn?: string;
  author: string;
  avatar: string;
  thumbnail: string;
  videoUrl: string;
  category: 'Tech' | 'Arts' | 'Business';
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
}

interface VideoInteractionsProps {
  video: Video;
}

export function VideoInteractions({ video }: VideoInteractionsProps) {
  const { language } = useLanguage();
  const [isLiked, setIsLiked] = useState(video.isLiked);
  const [isSaved, setIsSaved] = useState(video.isSaved);
  const [likes, setLikes] = useState(video.likes);
  const [commentCount, setCommentCount] = useState(video.comments);
  const [showComments, setShowComments] = useState(false);
  const [canComment, setCanComment] = useState(true); // 默认允许评论

  // 获取用户评论权限
  useEffect(() => {
    const checkCommentPermission = async () => {
      try {
        const currentUser = await authAPI.getCurrentUser();
        if (currentUser) {
          setCanComment(currentUser.canComment !== false);
        }
      } catch (error) {
        console.error('获取用户权限失败:', error);
        // 如果获取失败，默认允许评论（向后兼容）
        setCanComment(true);
      }
    };

    checkCommentPermission();
  }, []);

  const handleLike = async () => {
    try {
      const result = await likeAPI.toggleLike(video.id);
      setIsLiked(result.liked);
      setLikes(result.likeCount);

      if (result.liked) {
        toast.success(language === 'zh' ? '已点赞' : 'Liked');
      } else {
        toast.success(language === 'zh' ? '已取消点赞' : 'Unliked');
      }
    } catch (error) {
      console.error('点赞失败:', error);
      toast.error(language === 'zh' ? '点赞失败，请重试' : 'Failed to like, please try again');
    }
  };

  const handleSave = async () => {
    try {
      const favorited = await favoriteAPI.toggleFavorite(video.id);
      setIsSaved(favorited);

      if (favorited) {
        toast.success('已收藏');
      } else {
        toast.success('已取消收藏');
      }
      
      // 触发自定义事件，通知Profile组件刷新统计数据
      window.dispatchEvent(new CustomEvent('favoriteUpdated'));
    } catch (error) {
      console.error('收藏失败:', error);
      toast.error('收藏失败，请重试');
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + 'w';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };

  return (
    <>
      <div className="video-interactions flex flex-col items-center gap-4">
        {/* 点赞 - 缩小按钮 */}
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1 transition-transform active:scale-95"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
            isLiked ? 'bg-white' : 'bg-black/30 backdrop-blur-md'
          }`}>
            <svg
              className={`w-6 h-6 ${isLiked ? 'text-red-500' : 'text-white'}`}
              fill={isLiked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <span className="text-white text-xs font-semibold">{formatCount(likes)}</span>
        </button>

        {/* 评论 - 缩小按钮 */}
        <button
          onClick={() => {
            if (canComment) {
              setShowComments(true);
            } else {
              toast.error(language === 'zh' ? '您没有评论权限' : 'You do not have permission to comment');
            }
          }}
          disabled={!canComment}
          className={`flex flex-col items-center gap-1 transition-transform ${
            canComment ? 'active:scale-95 cursor-pointer' : 'opacity-50 cursor-not-allowed'
          }`}
        >
          <div className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center ${
            canComment ? 'bg-black/30' : 'bg-black/20'
          }`}>
            <svg className={`w-6 h-6 ${canComment ? 'text-white' : 'text-zinc-500'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <span className={`text-xs font-semibold ${canComment ? 'text-white' : 'text-zinc-500'}`}>
            {formatCount(commentCount)}
          </span>
        </button>

        {/* 收藏 - 缩小按钮，增强可见性 */}
        <button
          onClick={handleSave}
          className="flex flex-col items-center gap-1 transition-transform active:scale-95"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
            isSaved ? 'bg-white shadow-lg' : 'bg-black/50 backdrop-blur-md border border-white/20'
          }`}>
            <svg
              className={`w-6 h-6 ${isSaved ? 'text-yellow-500' : 'text-white'}`}
              fill={isSaved ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-lg">{language === 'zh' ? '收藏' : 'Save'}</span>
        </button>

      </div>

      {/* 评论抽屉 */}
      <CommentDrawer
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        video={video}
        onCommentAdded={async () => {
          // 评论添加后，重新获取评论数量
          try {
            const { commentAPI } = await import('../services/leancloud');
            const count = await commentAPI.getCommentCount(video.id);
            setCommentCount(count);
          } catch (error) {
            console.error('获取评论数量失败:', error);
          }
        }}
      />
    </>
  );
}