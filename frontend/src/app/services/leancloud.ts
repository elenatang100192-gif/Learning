// 后端API配置（支持环境变量）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// API请求辅助函数
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // 添加认证token（如果存在）
  const token = localStorage.getItem('sessionToken');
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
    // 添加status属性以便后续检查
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
};

// 创建查询的辅助函数
const createQuery = (className: string) => new AV.Query(className);

// 数据类型定义
export interface Category {
  id: string;
  name: string;
  nameCn: string;
  sortOrder: number;
}

export interface Video {
  id: string;
  title: string;
  titleEn?: string;
  category: Category;
  videoUrl: string;
  videoUrlEn?: string | null;
  coverUrl: string;
  duration: number;
  fileSize?: number;
  status: '待审核' | '已发布' | '已驳回' | '已禁用';
  disabled?: boolean;
  viewCount: number;
  likeCount: number;
  uploadDate: string;
  publishDate?: string;
  author?: User;
}

export interface User {
  id: string;
  username: string;
  usernameCn?: string; // 中文用户名
  email: string;
  avatar?: string;
  joinDate: string;
  totalVideos: number;
  totalViews: number;
  canPublish: boolean;
  canComment: boolean;
}

export interface Comment {
  id: string;
  content: string;
  user: User;
  video: Video;
  createdAt: string;
  updatedAt: string;
}

export interface Like {
  id: string;
  user: User;
  video: Video;
  createdAt: string;
}

export interface Favorite {
  id: string;
  user: User;
  video: Video;
  createdAt: string;
}

export interface WatchHistory {
  id: string;
  user: User;
  video: Video;
  watchedAt: string;
  watchDuration: number;
}

// 认证相关API
export const authAPI = {
  // 发送OTP验证码
  sendOTP: async (email: string): Promise<{success: boolean, development?: boolean, otp?: string, note?: string, message?: string}> => {
    try {
      const response = await apiRequest('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      return {
        success: true,
        development: response.development,
        otp: response.otp,
        note: response.note
      };
    } catch (error: any) {
      console.error('发送OTP失败:', error);
      // 提取错误消息
      const errorMessage = error?.message || '发送验证码失败，请重试';
      return { 
        success: false,
        message: errorMessage
      };
    }
  },

  // 邮箱登录（使用OTP）
  loginWithEmail: async (email: string, otpCode: string): Promise<User | null> => {
    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, otp: otpCode })
      });

      if (response.success && response.user) {
        // 存储session token到localStorage
        localStorage.setItem('sessionToken', response.sessionToken);
        return response.user;
      }
      return null;
    } catch (error) {
      console.error('邮箱登录失败:', error);
      return null;
    }
  },

  // 获取当前用户
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await apiRequest('/auth/me');
      return response.success ? response.user : null;
    } catch (error) {
      console.error('获取当前用户信息失败:', error);
      return null;
    }
  },

  // 登出
  logout: async (): Promise<void> => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
      localStorage.removeItem('sessionToken');
    } catch (error) {
      console.error('登出失败:', error);
      // 即使API调用失败，也要清除本地存储
      localStorage.removeItem('sessionToken');
    }
  },

  // 检查登录状态
  isLoggedIn: (): boolean => {
    return !!localStorage.getItem('sessionToken');
  }
};

// 分类相关API
export const categoryAPI = {
  // 获取所有分类
  getAll: async (): Promise<Category[]> => {
    try {
      const response = await apiRequest('/categories');
      return response.success ? response.data : [];
    } catch (error) {
      console.error('获取分类失败:', error);
      return [];
    }
  }
};

// 视频相关API
export const videoAPI = {
  // 获取视频列表（分页）
  getList: async (options: {
    category?: string;
    status?: '已发布';
    page?: number;
    limit?: number;
    sortBy?: 'newest' | 'popular' | 'trending';
  } = {}): Promise<Video[]> => {
    try {
      const params = new URLSearchParams();
      if (options.category) params.append('category', options.category);
      if (options.status) params.append('status', options.status);
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.sortBy) params.append('sortBy', options.sortBy);

      const response = await apiRequest(`/videos?${params.toString()}`);
      return response.success ? response.data : [];
    } catch (error) {
      console.error('获取视频列表失败:', error);
      return [];
    }
  },

  // 获取单个视频详情
  getById: async (videoId: string): Promise<Video | null> => {
    try {
      const response = await apiRequest(`/videos/${videoId}`);
      return response.success ? response.data : null;
    } catch (error) {
      console.error('获取视频详情失败:', error);
      return null;
    }
  },

  // 发布视频（用户发布到待审核状态）
  publish: async (videoData: {
    title: string;
    titleEn?: string;
    categoryId: string;
    videoUrl: string;
    coverUrl: string;
    duration: number;
  }): Promise<Video | null> => {
    try {
      const response = await apiRequest('/videos/publish', {
        method: 'POST',
        body: JSON.stringify(videoData)
      });
      return response.success ? response.data : null;
    } catch (error) {
      console.error('发布视频失败:', error);
      throw error;
    }
  },

  // 增加观看次数
  incrementViewCount: async (videoId: string): Promise<void> => {
    try {
      await apiRequest(`/videos/${videoId}/view`, { method: 'POST' });
    } catch (error) {
      console.error('增加观看次数失败:', error);
    }
  },

  // 记录观看历史
  recordWatchHistory: async (videoId: string, watchDuration: number = 0): Promise<void> => {
    try {
      await apiRequest(`/videos/${videoId}/watch`, {
        method: 'POST',
        body: JSON.stringify({ watchDuration })
      });
    } catch (error) {
      console.error('记录观看历史失败:', error);
    }
  }
};

// 点赞相关API
export const likeAPI = {
  // 检查是否已点赞
  isLiked: async (videoId: string): Promise<boolean> => {
    try {
      const response = await apiRequest(`/likes/${videoId}/status`);
      return response.success ? response.liked : false;
    } catch (error: any) {
      // 401错误表示用户未登录，静默返回false
      if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Unauthorized') || error?.message?.includes('Authentication failed')) {
        return false;
      }
      console.error('检查点赞状态失败:', error);
      return false;
    }
  },

  // 点赞/取消点赞
  toggleLike: async (videoId: string): Promise<{ liked: boolean; likeCount: number }> => {
    try {
      const response = await apiRequest(`/likes/${videoId}/toggle`, { method: 'POST' });
      return response.success ? { liked: response.liked, likeCount: response.likeCount } : { liked: false, likeCount: 0 };
    } catch (error) {
      console.error('点赞操作失败:', error);
      throw error;
    }
  }
};

// 收藏相关API
export const favoriteAPI = {
  // 检查是否已收藏
  isFavorited: async (videoId: string): Promise<boolean> => {
    try {
      const response = await apiRequest(`/favorites/${videoId}/status`);
      return response.success ? response.favorited : false;
    } catch (error: any) {
      // 401错误表示用户未登录，静默返回false
      if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Unauthorized') || error?.message?.includes('Authentication failed')) {
        return false;
      }
      console.error('检查收藏状态失败:', error);
      return false;
    }
  },

  // 收藏/取消收藏
  toggleFavorite: async (videoId: string): Promise<boolean> => {
    try {
      const response = await apiRequest(`/favorites/${videoId}/toggle`, { method: 'POST' });
      return response.success ? response.favorited : false;
    } catch (error) {
      console.error('收藏操作失败:', error);
      throw error;
    }
  },

  // 获取用户收藏列表
  getUserFavorites: async (page: number = 1, limit: number = 20): Promise<Video[]> => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await apiRequest(`/favorites?${params.toString()}`);
      return response.success ? response.data : [];
    } catch (error) {
      console.error('获取收藏列表失败:', error);
      return [];
    }
  }
};

// 关注相关API
export const followAPI = {
  // 检查是否已关注
  isFollowing: async (authorId: string): Promise<boolean> => {
    try {
      const response = await apiRequest(`/follows/${authorId}/status`);
      return response.success ? response.following : false;
    } catch (error: any) {
      // 401错误表示用户未登录，静默返回false
      if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Unauthorized') || error?.message?.includes('Authentication failed')) {
        return false;
      }
      console.error('检查关注状态失败:', error);
      return false;
    }
  },

  // 关注/取消关注
  toggleFollow: async (authorId: string): Promise<boolean> => {
    try {
      const response = await apiRequest(`/follows/${authorId}/toggle`, { method: 'POST' });
      return response.success ? response.following : false;
    } catch (error) {
      console.error('关注操作失败:', error);
      throw error;
    }
  }
};

// 评论相关API
export const commentAPI = {
  // 获取视频评论数量
  getCommentCount: async (videoId: string): Promise<number> => {
    try {
      const response = await apiRequest(`/comments/${videoId}/count`);
      return response.success ? (response.count || 0) : 0;
    } catch (error) {
      console.error('获取评论数量失败:', error);
      return 0;
    }
  },

  // 获取视频评论
  getVideoComments: async (videoId: string, page: number = 1, limit: number = 20): Promise<Comment[]> => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      const response = await apiRequest(`/comments/${videoId}?${params.toString()}`);
      return response.success ? response.data : [];
    } catch (error) {
      console.error('获取评论列表失败:', error);
      return [];
    }
  },

  // 添加评论
  addComment: async (videoId: string, content: string): Promise<Comment | null> => {
    try {
      const response = await apiRequest(`/comments/${videoId}`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      return response.success ? response.data : null;
    } catch (error) {
      console.error('添加评论失败:', error);
      throw error;
    }
  }
};

// 用户相关API
export const userAPI = {
  // 获取用户统计数据
  getUserStats: async (): Promise<{
    totalLikes: number;
    publishedCount: number;
    followingCount: number;
    followersCount: number;
    favoritesCount: number;
  } | null> => {
    try {
      const response = await apiRequest('/users/stats');
      return response.success ? response.data : null;
    } catch (error) {
      console.error('获取用户统计数据失败:', error);
      return null;
    }
  },

  // 获取用户发布记录
  getUserPublications: async (page: number = 1, limit: number = 20): Promise<Video[]> => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await apiRequest(`/users/publications?${params.toString()}`);
      return response.success ? response.data : [];
    } catch (error) {
      console.error('获取用户发布记录失败:', error);
      return [];
    }
  },

  // 获取观看历史
  getWatchHistory: async (page: number = 1, limit: number = 20): Promise<Video[]> => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await apiRequest(`/users/watch-history?${params.toString()}`);
      return response.success ? response.data : [];
    } catch (error) {
      console.error('获取观看历史失败:', error);
      return [];
    }
  }
};

// 文件上传API
export const uploadAPI = {
  // 上传视频文件
  uploadVideo: async (file: File): Promise<{ url: string; filename: string; size: number }> => {
    const formData = new FormData();
    formData.append('video', file);

    // 添加认证token
    const token = localStorage.getItem('sessionToken');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload/video`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Upload failed');
    }

    const result = await response.json();
    return result.success ? result.data : null;
  },

  // 上传封面图片
  uploadCover: async (file: File): Promise<{ url: string; filename: string; size: number }> => {
    const formData = new FormData();
    formData.append('cover', file);

    // 添加认证token
    const token = localStorage.getItem('sessionToken');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload/cover`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Upload failed');
    }

    const result = await response.json();
    return result.success ? result.data : null;
  }
};
