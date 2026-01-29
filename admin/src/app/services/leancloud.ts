import AV from 'leancloud-storage';

// 后端API配置（用于某些API调用，支持环境变量）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.MODE === 'production' 
    ? 'https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api'
    : 'http://localhost:3001/api');

// 统一的API请求函数
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData = options.body instanceof FormData;
    
    // 对于视频生成、AI提取、音频生成等长时间操作，设置更长的超时时间
    const isLongRunningOperation = 
      endpoint.includes('generate-silent-video') || 
      endpoint.includes('generate-video') ||
      endpoint.includes('generate-english-video') || // 英文视频生成也需要更长时间
      endpoint.includes('generate-audio') || // 音频生成需要轮询查询任务状态，可能需要更长时间
      endpoint.includes('/extract'); // AI提取也需要更长时间
    const timeout = isLongRunningOperation ? 15 * 60 * 1000 : 30000; // 长时间操作15分钟，其他30秒
  
  const config: RequestInit = {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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

  try {
      // 使用AbortController实现超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData: any = {};
      try {
        const text = await response.text();
        if (text) {
          errorData = JSON.parse(text);
        }
      } catch (e) {
        // 如果解析失败，使用空对象
        errorData = {};
      }
      
      // 特殊处理429速率限制错误
      if (response.status === 429) {
        const retryAfter = errorData.retryAfter || 60;
        throw new Error(`${errorData.message || '请求过于频繁'}，建议${retryAfter}秒后重试`);
      }
      
      // 优先使用 error 字段，然后是 message 字段
      const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
      const error = new Error(errorMessage);
      // 将完整的错误数据附加到错误对象上，方便调试
      (error as any).errorData = errorData;
      throw error;
    }

    return response.json();
  } catch (error: any) {
    // 特殊处理AbortError（超时错误）- 优先处理
    if (error.name === 'AbortError') {
      console.error(`⏰ 请求超时: ${url} (${timeout / 1000}秒)`);
      if (isLongRunningOperation) {
        throw new Error(`请求超时（${timeout / 1000 / 60}分钟）。操作可能需要更长时间，请稍后刷新页面查看结果。`);
      } else {
        throw new Error(`请求超时（${timeout / 1000}秒）。请检查网络连接或稍后重试。`);
      }
    }
    
    // 处理真正的网络连接错误（没有成功建立连接）
    // 只有在真正的网络错误时才显示"无法连接"，业务错误（有response但状态码不对）不应该显示这个
    if (error.name === 'TypeError' && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      console.error(`❌ 网络请求失败: ${url}`);
      console.error('💡 可能的原因:');
      console.error('   1. 后端服务未运行');
      console.error('   2. CORS配置问题');
      console.error('   3. 网络连接问题');
      console.error('   4. 后端服务崩溃或重启中');
      console.error('错误详情:', error);
      throw new Error(`无法连接到后端服务器 (${API_BASE_URL})，请确保后端服务正在运行`);
    }
    
    // 如果是业务错误（来自response的错误，已经有明确的错误信息），直接抛出
    // 这些错误不应该被当作网络错误处理
    if (error.message && error.errorData) {
      // 这是从response中解析出的业务错误，直接抛出
      throw error;
    }
    
    // 如果是其他错误，也记录详细信息
    console.error(`❌ API请求失败: ${url}`, error);
    throw error;
  }
};

// LeanCloud配置
const LEANCLOUD_CONFIG = {
  appId: import.meta.env.VITE_LEANCLOUD_APP_ID || 'RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz',
  appKey: import.meta.env.VITE_LEANCLOUD_APP_KEY || '1w0cQLBZIaJ32tjaU7RkDu3n',
  serverURL: import.meta.env.VITE_LEANCLOUD_SERVER_URL || 'https://rdecdltb.lc-cn-n1-shared.com'
};

// 初始化LeanCloud
let isInitialized = false;

export const initLeanCloud = () => {
  if (!isInitialized) {
    try {
      // 检查是否已经初始化
      if (!AV.applicationId) {
    AV.init(LEANCLOUD_CONFIG);
      }
      isInitialized = true;
    } catch (error) {
      // 如果已经初始化，忽略错误
      console.warn('LeanCloud already initialized:', error);
    isInitialized = true;
    }
  }
};

// 数据类型定义
export interface Category {
  id: string;
  name: string;
  nameCn: string;
  sortOrder: number;
  createdAt?: Date;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: Category;
  coverUrl?: string;
  blogCoverUrl?: string;
  fileUrl?: string;
  uploadDate: string;
  status: '待处理' | '提取中' | '已完成';
  createdAt?: Date;
}

export interface ExtractedContent {
  id: string;
  book: Book;
  chapterTitle: string;
  summary: string;
  keyPoints: string[];
  estimatedDuration: number;
  videoStatus: 'pending' | 'generating' | 'completed' | 'failed';
  videoTitleCn?: string;
  videoTitleEn?: string;
  videoUrl?: string;
  audioUrl?: string;
  avatarImageUrl?: string;
  avatarDescription?: string;
  createdAt?: Date;
}

export interface Video {
  id: string;
  book?: Book;
  extractedContent?: ExtractedContent;
  title: string;
  titleEn: string;
  category: Category;
  videoUrl: string;
  videoUrlEn?: string;
  coverUrl: string;
  duration: number;
  fileSize: number;
  status: '待审核' | '已发布' | '已驳回' | '已禁用';
  disabled: boolean;
  viewCount: number;
  likeCount: number;
  uploadDate: string;
  publishDate?: string;
  aiExtractDate?: string;
  author?: any;
  reviewNotes?: string;
  displayOrder?: number; // 前端手机端展示顺序，数字越小越靠前
  createdAt?: Date;
}

export interface User {
  id: string;
  username?: string;
  email?: string;
  createdAt?: Date;
  canPublish?: boolean;
  canComment?: boolean;
}

export interface StatisticsData {
  date: string;
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalVideos: number;
  newVideos: number;
  publishedVideos: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  pendingAudits: number;
}

// 基础查询函数
export const createQuery = (className: string) => {
  return new AV.Query(className);
};

// 分类相关API
export const categoryAPI = {
  // 获取所有分类
  async getAll() {
    initLeanCloud();
    const query = createQuery('Category');
    query.ascending('sortOrder');
    const results = await query.find();
    return results.map(item => ({
      id: item.id,
      name: item.get('name'),
      nameCn: item.get('nameCn'),
      sortOrder: item.get('sortOrder'),
      createdAt: item.createdAt
    })) as Category[];
  },

  // 根据名称获取分类
  async getByName(name: string) {
    initLeanCloud();
    const query = createQuery('Category');
    query.equalTo('name', name);
    const result = await query.first();
    if (!result) return null;
    return {
      id: result.id,
      name: result.get('name'),
      nameCn: result.get('nameCn'),
      sortOrder: result.get('sortOrder'),
      createdAt: result.createdAt
    } as Category;
  }
};

// 书籍相关API
export const bookAPI = {
  // 获取书籍列表
  async getList(filters: any = {}, page: number = 1, limit: number = 20) {
    initLeanCloud();
    const query = createQuery('Book');

    // 应用筛选条件
    if (filters.title) {
      query.contains('title', filters.title);
    }
    if (filters.author) {
      query.contains('author', filters.author);
    }
    if (filters.category) {
      const category = AV.Object.createWithoutData('Category', filters.category);
      query.equalTo('category', category);
    }
    if (filters.status) {
      query.equalTo('status', filters.status);
    }

    // 分页
    query.limit(limit);
    query.skip((page - 1) * limit);
    query.descending('createdAt');

    // 关联查询分类信息
    query.include('category');

    const results = await query.find();
    return results.map(item => ({
      id: item.id,
      title: item.get('title'),
      author: item.get('author'),
      isbn: item.get('isbn'),
      category: item.get('category') ? {
        id: item.get('category').id,
        name: item.get('category').get('name'),
        nameCn: item.get('category').get('nameCn'),
        sortOrder: item.get('category').get('sortOrder')
      } : undefined,
      coverUrl: item.get('coverUrl'),
      blogCoverUrl: item.get('blogCoverUrl'),
      fileUrl: item.get('fileUrl'),
      uploadDate: item.get('uploadDate'),
      status: item.get('status'),
      createdAt: item.createdAt
    })) as Book[];
  },

  // 创建书籍
  async create(bookData: Omit<Book, 'id' | 'createdAt'>) {
    initLeanCloud();
    const BookClass = AV.Object.extend('Book');
    const book = new BookClass();

    book.set('title', bookData.title);
    book.set('author', bookData.author);
    book.set('isbn', bookData.isbn);
    book.set('category', AV.Object.createWithoutData('Category', bookData.category.id));
    book.set('coverUrl', bookData.coverUrl);
    book.set('fileUrl', bookData.fileUrl);
    book.set('uploadDate', bookData.uploadDate);
    book.set('status', bookData.status);

    const result = await book.save();
    return {
      id: result.id,
      ...bookData,
      createdAt: result.createdAt
    } as Book;
  },

  // 更新书籍（通过后端API，使用Master Key绕过ACL）
  async update(id: string, bookData: Partial<Book>) {
    try {
      const updateData: any = {
        title: bookData.title,
        author: bookData.author
      };
      
      if (bookData.category) {
        updateData.categoryId = bookData.category.id;
      }

      const response = await apiRequest(`/books/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      return response.success ? response.data : null;
    } catch (error) {
      console.error('更新书籍失败:', error);
      throw error;
    }
  },

  // 删除书籍（通过后端API，使用Master Key绕过ACL）
  async delete(id: string) {
    try {
      const response = await apiRequest(`/books/${id}`, {
        method: 'DELETE',
      });
      return response.success;
    } catch (error) {
      console.error('删除书籍失败:', error);
      throw error;
    }
  },

  // 获取书籍详情
  async getById(id: string) {
    initLeanCloud();
    const query = createQuery('Book');
    query.include('category');
    const book = await query.get(id);
    return {
      id: book.id,
      title: book.get('title'),
      author: book.get('author'),
      isbn: book.get('isbn'),
      category: book.get('category') ? {
        id: book.get('category').id,
        name: book.get('category').get('name'),
        nameCn: book.get('category').get('nameCn'),
        sortOrder: book.get('category').get('sortOrder')
      } : undefined,
      coverUrl: book.get('coverUrl'),
      fileUrl: book.get('fileUrl'),
      uploadDate: book.get('uploadDate'),
      status: book.get('status'),
      createdAt: book.createdAt
    } as Book;
  },

  // 上传电子书文件（支持进度回调）
  async uploadBook(
    file: File, 
    bookData: { title: string; author: string; isbn: string; categoryId: string },
    onProgress?: (progress: number) => void
  ) {
    const formData = new FormData();
    formData.append('bookFile', file);
    formData.append('title', bookData.title);
    formData.append('author', bookData.author);
    formData.append('isbn', bookData.isbn);
    formData.append('categoryId', bookData.categoryId);

    // 如果提供了进度回调，使用 XMLHttpRequest 来跟踪上传进度
    if (onProgress) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const token = localStorage.getItem('sessionToken');
        const fileSize = file.size; // 保存文件大小用于进度计算
        
        // 初始化进度为0%
        onProgress(0);
        
        // 跟踪上传进度
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && e.total > 0) {
            // 计算上传进度（0-90%），保留10%给后端处理
            const uploadPercent = Math.min(90, Math.round((e.loaded / e.total) * 90));
            onProgress(uploadPercent);
            console.log(`📤 上传进度: ${uploadPercent}% (${(e.loaded / 1024 / 1024).toFixed(2)}MB / ${(e.total / 1024 / 1024).toFixed(2)}MB)`);
          } else {
            // 如果无法计算进度，使用已加载的字节数估算
            if (e.loaded > 0 && fileSize > 0) {
              const estimatedPercent = Math.min(90, Math.round((e.loaded / fileSize) * 90));
              onProgress(estimatedPercent);
            }
          }
        });

        xhr.addEventListener('loadstart', () => {
          onProgress(1);
        });

        xhr.addEventListener('load', () => {
          // 上传完成，设置为95%，等待后端处理
          onProgress(95);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              // 后端处理完成，设置为100%
              onProgress(100);
              resolve(response.success ? response.data : null);
            } catch (error) {
              reject(new Error('解析响应失败'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.message || `HTTP error! status: ${xhr.status}`));
            } catch {
              reject(new Error(`HTTP error! status: ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('网络请求失败'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('请求已取消'));
        });

        xhr.open('POST', `${API_BASE_URL}/books/upload`);
        
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        
        // 发送请求
        xhr.send(formData);
      });
    } else {
      // 如果没有进度回调，使用原来的 fetch 方式
      const response = await apiRequest('/books/upload', {
        method: 'POST',
        body: formData,
        headers: {} // 让浏览器自动设置Content-Type
      });

      return response.success ? response.data : null;
    }
  },

  // 开始AI提取（拆解书籍）
  async startAIExtraction(bookId: string, segments: 5 | 10 | 20 | 30 = 10) {
    const response = await apiRequest(`/books/${bookId}/extract`, {
      method: 'POST',
      body: JSON.stringify({ segments }),
    });

    return response.success ? response.data : null;
  },

  // 获取书籍的提取内容
  async getBookContents(bookId: string) {
    const response = await apiRequest(`/books/${bookId}/contents`);
    return response.success ? response.data : [];
  },

  // 生成数字人形象
  async generateAvatar(contentId: string, avatarDescription: string) {
    const response = await apiRequest(`/books/content/${contentId}/generate-avatar`, {
      method: 'POST',
      body: JSON.stringify({ avatarDescription }),
    });

    return response.success ? response.data : null;
  },

  // 生成音频（支持中英文）
  async generateAudio(contentId: string, text: string, language: 'zh' | 'en' = 'zh', includeOpeningText: boolean = true) {
    try {
      console.log(`📞 Calling generate audio API: contentId=${contentId}, language=${language}, textLength=${text.length}, includeOpeningText=${includeOpeningText}`);
      const response = await apiRequest(`/books/content/${contentId}/generate-audio`, {
        method: 'POST',
        body: JSON.stringify({ text, language, includeOpeningText }),
      });
      console.log(`✅ Generate audio API response:`, response);
      return response.success ? response.data : null;
    } catch (error: any) {
      console.error(`❌ Generate audio API call failed:`, error);
      throw error;
    }
  },

  // 生成无声视频（步骤2）
  // 生成博客封面图提示词（3种风格）
  async generateBlogCoverPrompts(bookId: string) {
    try {
      const response = await apiRequest(`/books/${bookId}/generate-blog-cover-prompts`, {
        method: 'POST',
      });
      return response.success ? response.data : null;
    } catch (error) {
      console.error('生成博客封面图提示词失败:', error);
      throw error;
    }
  },

  // 生成博客封面图
  async generateBlogCover(bookId: string, customPrompt?: string) {
    try {
      const response = await apiRequest(`/books/${bookId}/generate-blog-cover`, {
        method: 'POST',
        body: JSON.stringify({ customPrompt }),
      });
      return response.success ? response.data : null;
    } catch (error) {
      console.error('生成博客封面图失败:', error);
      throw error;
    }
  },

  async generateSilentVideo(contentId: string, styleDescription?: string) {
    try {
      console.log(`📞 调用生成无声视频API: contentId=${contentId}, styleDescription=${styleDescription}`);
      const response = await apiRequest(`/books/content/${contentId}/generate-silent-video`, {
        method: 'POST',
        body: JSON.stringify({ styleDescription }),
      });
      console.log(`✅ 生成无声视频API响应:`, response);
      if (!response.success) {
        const errorMessage = response.error || response.message || '生成无声视频失败';
        throw new Error(errorMessage);
      }
      return response.data || null;
    } catch (error: any) {
      console.error(`❌ 生成无声视频API调用失败:`, error);
      // 如果错误对象包含详细信息，提取并抛出
      if (error.message) {
        throw error;
      }
      throw new Error(error.message || '生成无声视频失败');
    }
  },

  // 生成视频（步骤3：将无声视频与音频合并）
  async generateVideo(
    contentId: string, 
    audioUrl: string, 
    language: 'zh' | 'en' = 'zh',
    options?: {
      coverImageUrl?: string;
      summary?: string;
      summaryEn?: string;
      chapterTitle?: string;
      chapterTitleEn?: string;
      includeOpeningText?: boolean;
    }
  ) {
    try {
      console.log(`📞 Calling generate video API: contentId=${contentId}, language=${language}`, options);
      const response = await apiRequest(`/books/content/${contentId}/generate-video`, {
        method: 'POST',
        body: JSON.stringify({ 
          audioUrl, 
          language,
          coverImageUrl: options?.coverImageUrl,
          summary: options?.summary,
          summaryEn: options?.summaryEn,
          chapterTitle: options?.chapterTitle,
          chapterTitleEn: options?.chapterTitleEn,
          includeOpeningText: options?.includeOpeningText
        }),
      });
      console.log(`✅ 生成视频API响应:`, response);
      return response.success ? response.data : null;
    } catch (error: any) {
      console.error(`❌ 生成视频API调用失败:`, error);
      throw error;
    }
  },

  // 生成英文翻译
  async translateContent(contentId: string) {
    try {
      console.log(`📞 调用生成翻译API: contentId=${contentId}`);
      const response = await apiRequest(`/books/content/${contentId}/translate`, {
        method: 'POST',
      });
      console.log(`✅ 生成翻译API响应:`, response);
      return response.success ? response.data : null;
    } catch (error: any) {
      console.error(`❌ 生成翻译API调用失败:`, error);
      throw error;
    }
  },

  // 更新内容摘要
  async updateContentSummary(contentId: string, summary: string, summaryEn?: string, chapterTitle?: string, chapterTitleEn?: string) {
    try {
      console.log(`📞 Calling update content API: contentId=${contentId}`);
      const response = await apiRequest(`/books/content/${contentId}/update-summary`, {
        method: 'POST',
        body: JSON.stringify({ summary, summaryEn, chapterTitle, chapterTitleEn }),
      });
      console.log(`✅ Update content API response:`, response);
      return response.success ? response.data : null;
    } catch (error: any) {
      console.error(`❌ Update content API call failed:`, error);
      throw error;
    }
  },

  // 生成英文视频（一键生成：翻译+英文音频+合并视频）
  async generateEnglishVideo(contentId: string) {
    try {
      console.log(`📞 调用生成英文视频API: contentId=${contentId}`);
      const response = await apiRequest(`/books/content/${contentId}/generate-english-video`, {
        method: 'POST',
      });
      console.log(`✅ 生成英文视频API响应:`, response);
      return response.success ? response.data : null;
    } catch (error: any) {
      console.error(`❌ 生成英文视频API调用失败:`, error);
      throw error;
    }
  }
};

// 视频相关API
export const videoAPI = {
  // 获取视频列表
  async getList(filters: any = {}, page: number = 1, limit: number = 20) {
    initLeanCloud();
    const query = createQuery('Video');

    // 应用筛选条件
    if (filters.status) {
      query.equalTo('status', filters.status);
    }
    if (filters.category) {
      const category = AV.Object.createWithoutData('Category', filters.category);
      query.equalTo('category', category);
    }
    if (filters.title) {
      query.contains('title', filters.title);
    }

    // 分页和排序
    query.limit(limit);
    query.skip((page - 1) * limit);
    // 优先按displayOrder排序（升序，null值会被放在最后），然后按createdAt排序（降序）
    // 注意：LeanCloud会先按displayOrder排序，对于displayOrder相同的记录再按createdAt排序
    query.addAscending('displayOrder');
    query.descending('createdAt');

    // 关联查询
    query.include('category');
    query.include('book');
    query.include('author');

    const results = await query.find();
    return results.map(item => ({
      id: item.id,
      title: item.get('title'),
      titleEn: item.get('titleEn'),
      category: item.get('category') ? {
        id: item.get('category').id,
        name: item.get('category').get('name'),
        nameCn: item.get('category').get('nameCn')
      } : undefined,
      book: item.get('book') ? {
        id: item.get('book').id,
        title: item.get('book').get('title'),
        author: item.get('book').get('author')
      } : undefined,
      videoUrl: item.get('videoUrl'),
      videoUrlEn: item.get('videoUrlEn'),
      coverUrl: item.get('coverUrl'),
      duration: item.get('duration'),
      fileSize: item.get('fileSize'),
      status: item.get('status'),
      disabled: item.get('disabled') || false,
      viewCount: item.get('viewCount') || 0,
      likeCount: item.get('likeCount') || 0,
      uploadDate: item.get('uploadDate'),
      publishDate: item.get('publishDate'),
      aiExtractDate: item.get('aiExtractDate'),
      author: item.get('author') ? {
        id: item.get('author').id,
        email: item.get('author').get('email')
      } : undefined,
      reviewNotes: item.get('reviewNotes'),
      displayOrder: item.get('displayOrder') || undefined,
      createdAt: item.createdAt
    })) as Video[];
  },

  // 创建视频（后台发布）
  async create(videoData: Omit<Video, 'id' | 'createdAt'>) {
    initLeanCloud();
    const VideoClass = AV.Object.extend('Video');
    const video = new VideoClass();

    Object.keys(videoData).forEach(key => {
      if (key === 'category' && videoData.category) {
        video.set('category', AV.Object.createWithoutData('Category', videoData.category.id));
      } else if (key === 'book' && videoData.book) {
        video.set('book', AV.Object.createWithoutData('Book', videoData.book.id));
      } else if (key === 'author' && videoData.author) {
        video.set('author', AV.Object.createWithoutData('_User', videoData.author.id));
      } else if (key !== 'id' && key !== 'createdAt') {
        video.set(key, (videoData as any)[key]);
      }
    });

    const result = await video.save();
    return {
      id: result.id,
      ...videoData,
      createdAt: result.createdAt
    } as Video;
  },

  // 更新视频
  async update(id: string, videoData: Partial<Video>) {
    // 如果只更新分类，使用后端API（绕过ACL）
    if (videoData.category && Object.keys(videoData).length === 1) {
      try {
        const response = await apiRequest(`/videos/${id}/category`, {
          method: 'PUT',
          body: JSON.stringify({
            categoryId: videoData.category.id
          }),
        });
        if (response.success) {
          return {
            id: response.data.id,
            category: response.data.category,
            createdAt: new Date()
          } as Partial<Video>;
        }
        throw new Error(response.message || '更新失败');
      } catch (error) {
        console.error('更新视频分类失败:', error);
        throw error;
      }
    }

    // 如果只更新displayOrder，使用后端API（绕过ACL）
    if (videoData.displayOrder !== undefined && Object.keys(videoData).length === 1) {
      try {
        const response = await apiRequest(`/videos/${id}/displayOrder`, {
          method: 'PUT',
          body: JSON.stringify({
            displayOrder: videoData.displayOrder
          }),
        });
        if (response.success) {
          return {
            id: response.data.id,
            displayOrder: response.data.displayOrder,
            createdAt: new Date()
          } as Partial<Video>;
        }
        throw new Error(response.message || '更新失败');
      } catch (error) {
        console.error('更新视频显示顺序失败:', error);
        throw error;
      }
    }

    // 其他更新操作仍然使用LeanCloud SDK（如果有权限）
    initLeanCloud();
    const video = AV.Object.createWithoutData('Video', id);

    Object.keys(videoData).forEach(key => {
      if (key === 'category' && videoData.category) {
        video.set('category', AV.Object.createWithoutData('Category', videoData.category.id));
      } else if (key === 'book' && videoData.book) {
        video.set('book', AV.Object.createWithoutData('Book', videoData.book.id));
      } else if (key !== 'id' && key !== 'createdAt') {
        video.set(key, videoData[key as keyof Video]);
      }
    });

    const result = await video.save();
    return {
      id: result.id,
      ...videoData,
      createdAt: result.createdAt
    } as Video;
  },

  // 审核视频（通过后端API，使用Master Key绕过ACL）
  async review(id: string, action: 'approve' | 'reject', notes?: string) {
    try {
      const response = await apiRequest(`/videos/${id}/review`, {
        method: 'PUT',
        body: JSON.stringify({ action, notes }),
      });
      return response.success ? response.data : null;
    } catch (error) {
      console.error('审核视频失败:', error);
      throw error;
    }
  },

  // 发布视频到待审核（通过后端API）
  async publish(videoData: {
    title: string;
    titleEn?: string;
    categoryId: string;
    videoUrl?: string;
    videoUrlEn?: string;
    coverUrl?: string;
    duration?: number;
  }) {
    try {
      const response = await apiRequest('/videos/publish', {
        method: 'POST',
        body: JSON.stringify(videoData),
      });
      return response.success ? response.data : null;
    } catch (error) {
      console.error('发布视频失败:', error);
      throw error;
    }
  },

  // 禁用/启用视频（通过后端API，使用Master Key绕过ACL）
  async toggleStatus(id: string, disabled: boolean) {
    try {
      const response = await apiRequest(`/videos/${id}/toggle-status`, {
        method: 'PUT',
        body: JSON.stringify({ disabled }),
      });
      return response.success ? response.data : null;
    } catch (error) {
      console.error('切换视频状态失败:', error);
      throw error;
    }
  },

  // 上传视频文件（带进度条）
  async uploadVideo(file: File, onProgress?: (progress: number) => void): Promise<{ url: string; filename: string; size: number }> {
    const formData = new FormData();
    formData.append('video', file);

    const token = localStorage.getItem('sessionToken');
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              resolve(response.data);
            } else {
              reject(new Error(response.message || '上传失败'));
            }
          } catch (error) {
            reject(new Error('解析响应失败'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.message || `HTTP error! status: ${xhr.status}`));
          } catch {
            reject(new Error(`HTTP error! status: ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('网络请求失败'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('请求已取消'));
      });

      // 后台管理界面使用admin端点，不需要认证
      xhr.open('POST', `${API_BASE_URL}/upload/admin/video`);
      
      xhr.send(formData);
    });
  },

  // 上传封面图片（带进度条）
  async uploadCover(file: File, bookId?: string, onProgress?: (progress: number) => void): Promise<{ url: string; filename: string; size: number }> {
    const formData = new FormData();
    formData.append('cover', file);
    if (bookId) {
      formData.append('bookId', bookId);
    }

    const token = localStorage.getItem('sessionToken');
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              resolve(response.data);
            } else {
              reject(new Error(response.message || '上传失败'));
            }
          } catch (error) {
            reject(new Error('解析响应失败'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.message || `HTTP error! status: ${xhr.status}`));
          } catch {
            reject(new Error(`HTTP error! status: ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('网络请求失败'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('请求已取消'));
      });

      // 后台管理界面使用admin端点，不需要认证
      xhr.open('POST', `${API_BASE_URL}/upload/admin/cover`);
      
      xhr.send(formData);
    });
  },

  // 删除视频（通过后端API，使用Master Key绕过ACL）
  async delete(id: string) {
    try {
      const response = await apiRequest(`/videos/${id}`, {
        method: 'DELETE',
      });
      return response.success;
    } catch (error) {
      console.error('删除视频失败:', error);
      throw error;
    }
  }
};

// 用户相关API
export const userAPI = {
  // 创建用户（通过后端API，避免客户端权限问题）
  async createUser(userData: {
    email: string;
    username?: string;
    canPublish?: boolean;
    canComment?: boolean;
  }) {
    try {
      const response = await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      return response.success ? response.user : null;
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  },

  // 获取用户列表（通过后端API，避免直接查询User表）
  async getList(page: number = 1, limit: number = 20) {
    try {
      const response = await apiRequest(`/users?page=${page}&limit=${limit}`);
      return response.success ? response.data : [];
    } catch (error: any) {
      console.error('获取用户列表失败:', error);
      // 只处理真正的网络连接错误，业务错误直接抛出
      if (error.name === 'TypeError' && (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError'))) {
        throw new Error(`无法连接到后端服务器 (${API_BASE_URL})，请确保后端服务正在运行`);
      }
      throw error;
    }
  },

  // 获取用户统计（从StatisticsDaily表获取，避免直接查询User表）
  async getStats() {
    initLeanCloud();
    const query = createQuery('StatisticsDaily');
    query.descending('date');
    const latestStats = await query.first();

    if (latestStats) {
      return {
        totalUsers: latestStats.get('totalUsers') || 0,
        newUsersToday: 0, // StatisticsDaily表中没有每日新增用户的字段，这里暂时设为0
        activeUsers: Math.floor((latestStats.get('totalUsers') || 0) * 0.3) // 估算活跃用户数
      };
    }

    // 如果没有统计数据，返回默认值
    return {
      totalUsers: 0,
      newUsersToday: 0,
      activeUsers: 0
    };
  },

  // 修改用户权限（通过后端API）
  async updatePermissions(userId: string, permissions: {
    canPublish?: boolean;
    canComment?: boolean;
  }) {
    try {
      const response = await apiRequest(`/users/${userId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify(permissions),
      });
      return response.success ? response.user : null;
    } catch (error) {
      console.error('修改用户权限失败:', error);
      throw error;
    }
  },

  // 删除用户（通过后端API）
  async deleteUser(userId: string) {
    try {
      const response = await apiRequest(`/users/${userId}`, {
        method: 'DELETE',
      });
      return response.success;
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }
};

// 统计相关API
export const statisticsAPI = {
  // 获取统计数据
  async getLatest() {
    initLeanCloud();
    const query = createQuery('StatisticsDaily');
    query.descending('date');
    query.limit(1);

    const result = await query.first();
    if (!result) {
      return {
        date: new Date().toISOString().split('T')[0],
        totalUsers: 0,
        activeUsers: 0,
        newUsers: 0,
        totalVideos: 0,
        newVideos: 0,
        publishedVideos: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        pendingAudits: 0
      } as StatisticsData;
    }

    return {
      date: result.get('date'),
      totalUsers: result.get('totalUsers') || 0,
      activeUsers: result.get('activeUsers') || 0,
      newUsers: result.get('newUsers') || 0,
      totalVideos: result.get('totalVideos') || 0,
      newVideos: result.get('newVideos') || 0,
      publishedVideos: result.get('publishedVideos') || 0,
      totalViews: result.get('totalViews') || 0,
      totalLikes: result.get('totalLikes') || 0,
      totalComments: result.get('totalComments') || 0,
      pendingAudits: result.get('pendingAudits') || 0
    } as StatisticsData;
  },

  // 更新统计数据
  async update(statsData: Partial<StatisticsData>) {
    initLeanCloud();
    const today = new Date().toISOString().split('T')[0];

    // 先查找今天的数据
    const query = createQuery('StatisticsDaily');
    query.equalTo('date', today);
    let stats = await query.first();

    if (!stats) {
      // 创建新记录
      const StatsClass = AV.Object.extend('StatisticsDaily');
      stats = new StatsClass();
      stats.set('date', today);
    }

    // 更新数据
    Object.keys(statsData).forEach(key => {
      if (key !== 'date' && key !== 'id') {
        stats.set(key, statsData[key as keyof StatisticsData]);
      }
    });

    await stats.save();
    return { success: true };
  }
};

// 综合统计API
export const dashboardAPI = {
  // 获取仪表板数据
  async getDashboardData() {
    try {
      const [userStats, videoStats, bookStats, stats] = await Promise.all([
        userAPI.getStats(),
        videoAPI.getList({ status: '已发布' }, 1, 1000),
        bookAPI.getList({}, 1, 1000),
        statisticsAPI.getLatest()
      ]);

      // 计算视频统计
      const publishedVideos = videoStats.filter(v => v.status === '已发布').length;
      const pendingAudits = videoStats.filter(v => v.status === '待审核').length;
      const totalViews = videoStats.reduce((sum, v) => sum + (v.viewCount || 0), 0);
      const totalLikes = videoStats.reduce((sum, v) => sum + (v.likeCount || 0), 0);

      return {
        users: userStats,
        videos: {
          total: videoStats.length,
          published: publishedVideos,
          pending: pendingAudits,
          totalViews,
          totalLikes
        },
        books: {
          total: bookStats.length,
          completed: bookStats.filter(b => b.status === '已完成').length,
          processing: bookStats.filter(b => b.status === '提取中').length
        },
        statistics: stats
      };
    } catch (error) {
      console.error('获取仪表板数据失败:', error);
      throw error;
    }
  }
};

export default {
  initLeanCloud,
  categoryAPI,
  bookAPI,
  videoAPI,
  userAPI,
  statisticsAPI,
  dashboardAPI
};
