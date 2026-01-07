import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { authAPI, commentAPI, User } from '../services/leancloud';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string;
  user: User;
  createdAt: string;
  updatedAt: string;
}

interface Video {
  id: string;
  title: string;
  titleEn?: string;
  author: string;
  avatar: string;
  comments: number;
  isFollowing?: boolean;
}

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video;
  onCommentAdded?: () => void; // 评论添加后的回调
}

// 生成首字母头像的函数
const getInitialsAvatar = (username: string): string => {
  if (!username) return 'U';
  
  // 分割用户名，获取首字母
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) {
    // 如果有多个单词，取每个单词的首字母（如 "Sam Wang" -> "SW"）
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else {
    // 如果只有一个单词，取前两个字符（如 "Sam" -> "SA"）
    return username.substring(0, 2).toUpperCase();
  }
};

// 生成头像背景色的函数（基于用户名）
const getAvatarColor = (username: string): string => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-yellow-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export function CommentDrawer({ isOpen, onClose, video, onCommentAdded }: CommentDrawerProps) {
  const { t, language } = useLanguage();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [canComment, setCanComment] = useState(true); // 默认允许评论
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 获取评论列表
  useEffect(() => {
    const loadComments = async () => {
      if (!isOpen) return;
      
      setLoading(true);
      try {
        const commentList = await commentAPI.getVideoComments(video.id);
        setComments(commentList);
      } catch (error) {
        console.error('获取评论失败:', error);
        toast.error(language === 'zh' ? '获取评论失败' : 'Failed to load comments');
      } finally {
        setLoading(false);
      }
    };

    loadComments();
  }, [isOpen, video.id, language]);

  // 获取用户评论权限
  useEffect(() => {
    const checkCommentPermission = async () => {
      try {
        const currentUser = await authAPI.getCurrentUser();
        if (currentUser) {
          // 只有登录用户且有评论权限才能评论
          setCanComment(currentUser.canComment !== false);
        } else {
          // 未登录用户不能评论
          setCanComment(false);
        }
      } catch (error) {
        console.error('获取用户权限失败:', error);
        // 如果获取失败，默认不允许评论（需要登录）
        setCanComment(false);
      }
    };

    if (isOpen) {
      checkCommentPermission();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !canComment || submitting) return;

    setSubmitting(true);
    try {
      const newComment = await commentAPI.addComment(video.id, commentText.trim());
      if (newComment) {
        setComments([newComment, ...comments]);
        setCommentText('');
        toast.success(language === 'zh' ? '评论成功' : 'Comment added');
        // 通知父组件评论已添加
        if (onCommentAdded) {
          onCommentAdded();
        }
      }
    } catch (error: any) {
      console.error('添加评论失败:', error);
      // 检查是否是权限错误
      if (error?.status === 403 || error?.message?.includes('permission')) {
        toast.error(language === 'zh' ? '您没有评论权限' : 'You do not have permission to comment');
        setCanComment(false);
      } else {
        toast.error(language === 'zh' ? '评论失败，请重试' : 'Failed to add comment');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={onClose}
        style={{ position: 'fixed' }}
      />

      {/* 抽屉内容 */}
      <div 
        className="fixed inset-x-0 bottom-0 max-w-[480px] mx-auto bg-zinc-900 rounded-t-3xl flex flex-col" 
        style={{ 
          maxHeight: '80vh', 
          height: 'auto',
          zIndex: 9999,
          position: 'fixed'
        }}
      >
        {/* 顶部拖拽条 */}
        <div className="flex items-center justify-center py-3 border-b border-zinc-800 flex-shrink-0">
          <div className="w-12 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* 评论标题栏 */}
        <div className="px-4 pt-3 pb-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
          {/* 评论数量 */}
          <div className="text-white text-sm font-medium">
            {comments.length} {language === 'zh' ? '条评论' : 'Comments'}
          </div>
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors flex-shrink-0"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 评论列表 */}
        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4 space-y-4" style={{ minHeight: 0, maxHeight: 'calc(80vh - 200px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-zinc-400 text-sm">
                {language === 'zh' ? '加载中...' : 'Loading...'}
              </p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-zinc-400 text-sm">
                {language === 'zh' ? '暂无评论，快来发表第一条评论吧！' : 'No comments yet. Be the first to comment!'}
              </p>
            </div>
          ) : (
            comments.map((comment) => {
              const initials = getInitialsAvatar(comment.user.username);
              const avatarColor = getAvatarColor(comment.user.username);
              
              return (
                <div key={comment.id} className="flex gap-3 items-start">
                  {/* 头像 - 首字母头像 */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${avatarColor} text-white text-sm font-semibold`}>
                    {initials}
                  </div>
                  {/* 评论内容区域 */}
                  <div className="flex-1 min-w-0">
                    {/* 用户名 */}
                    <p className="text-white text-sm font-medium mb-1">{comment.user.username}</p>
                    {/* 评论内容 */}
                    <p className="text-white text-sm mb-2 break-words leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 评论输入框 */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800 bg-zinc-900">
          {!canComment && (
            <div className="mb-3 px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg">
              <p className="text-zinc-400 text-sm text-center">
                {language === 'zh' ? '您没有评论权限，请联系管理员开通' : 'You do not have permission to comment. Please contact administrator.'}
              </p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={canComment ? t.commentPlaceholder : (language === 'zh' ? '您没有评论权限' : 'No permission to comment')}
              disabled={!canComment}
              className={`flex-1 bg-zinc-800 text-white placeholder:text-zinc-400 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !canComment ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
            <button
              type="submit"
              disabled={!commentText.trim() || !canComment || submitting}
              className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              {submitting ? (language === 'zh' ? '发送中...' : 'Sending...') : t.send}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}