// 视频分类
export type VideoCategory = '科技' | '艺术人文' | '商业业务';

// 视频状态
export type VideoStatus = '待提取' | '待审核' | '已发布' | '已驳回';

// 书籍信息
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: VideoCategory;
  uploadDate: string;
  status: '待处理' | '提取中' | '已完成';
  coverUrl?: string;
  extractedContent?: ExtractedContent[];
}

// AI提取的内容
export interface ExtractedContent {
  id: string;
  chapterTitle: string;
  summary: string;
  keyPoints: string[];
  estimatedDuration: number; // 秒
  videoStatus: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  videoTitleCn?: string; // 视频标题（中文）
  videoTitleEn?: string; // 视频标题（英文）
}

// 视频信息
export interface Video {
  id: string;
  bookId: string;
  bookTitle: string;
  title: string;
  category: VideoCategory;
  status: VideoStatus;
  duration: number; // 秒
  views: number;
  likes: number;
  coverUrl: string;
  uploadDate: string;
  publishDate?: string;
  aiExtractDate?: string;
  reviewNotes?: string;
  disabled?: boolean; // 是否禁用（不在前端展示）
  author?: string; // 发布作者
}

// 用户信息
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  joinDate: string;
  canPublish: boolean;
  canComment: boolean;
  totalViews: number;
  totalVideos: number;
}

// 统计数据
export interface Statistics {
  totalVideos: number;
  totalViews: number;
  totalUsers: number;
  todayViews: number;
  weeklyViews: number[];
  categoryDistribution: { category: VideoCategory; count: number; }[];
  topVideos: { title: string; views: number; }[];
}

// 模拟书籍数据
export const mockBooks: Book[] = [
  {
    id: 'book-1',
    title: '人工智能简史',
    author: '尼克·博斯特罗姆',
    isbn: '978-7-5086-7123-4',
    category: '科技',
    uploadDate: '2024-12-15',
    status: '已完成',
    coverUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400',
    extractedContent: [
      {
        id: 'extracted-1',
        chapterTitle: 'AI的起源与发展',
        summary: '介绍了人工智能的历史和主要发展阶段。',
        keyPoints: ['人工智能的定义', '早期研究', '现代进展'],
        estimatedDuration: 180,
        videoStatus: 'completed',
        videoUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400',
        videoTitleCn: 'AI的起源与发展',
        videoTitleEn: 'Origin and Development of AI'
      },
      {
        id: 'extracted-2',
        chapterTitle: '机器学习的核心概念',
        summary: '解释了机器学习的基本原理和应用。',
        keyPoints: ['监督学习', '无监督学习', '强化学习'],
        estimatedDuration: 210,
        videoStatus: 'pending'
      }
    ]
  },
  {
    id: 'book-2',
    title: '艺术的故事',
    author: '贡布里希',
    isbn: '978-7-5086-3421-5',
    category: '艺术人文',
    uploadDate: '2024-12-14',
    status: '提取中',
    coverUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400'
  },
  {
    id: 'book-3',
    title: '从0到1',
    author: '彼得·蒂尔',
    isbn: '978-7-5086-5231-8',
    category: '商业业务',
    uploadDate: '2024-12-16',
    status: '待处理',
    coverUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400'
  },
  {
    id: 'book-4',
    title: '量子物理史话',
    author: '曹天元',
    isbn: '978-7-5086-6234-2',
    category: '科技',
    uploadDate: '2024-12-13',
    status: '已完成',
    coverUrl: 'https://images.unsplash.com/photo-1636690598696-941c4216cd88?w=400'
  },
  {
    id: 'book-5',
    title: '美学散步',
    author: '宗白华',
    isbn: '978-7-5086-4521-3',
    category: '艺术人文',
    uploadDate: '2024-12-12',
    status: '已完成',
    coverUrl: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=400'
  }
];

// 模拟视频数据
export const mockVideos: Video[] = [
  {
    id: 'video-1',
    bookId: 'book-1',
    bookTitle: '人工智能简史',
    title: 'AI的起源与发展',
    category: '科技',
    status: '已发布',
    duration: 180,
    views: 15234,
    likes: 892,
    coverUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400',
    uploadDate: '2024-12-15',
    publishDate: '2024-12-15',
    aiExtractDate: '2024-12-15',
    author: '系统管理员'
  },
  {
    id: 'video-2',
    bookId: 'book-1',
    bookTitle: '人工智能简史',
    title: '机器学习的核心概念',
    category: '科技',
    status: '待审核',
    duration: 210,
    views: 0,
    likes: 0,
    coverUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400',
    uploadDate: '2024-12-16',
    aiExtractDate: '2024-12-16'
  },
  {
    id: 'video-3',
    bookId: 'book-4',
    bookTitle: '量子物理史话',
    title: '量子力学的诞生',
    category: '科技',
    status: '已发布',
    duration: 195,
    views: 8923,
    likes: 456,
    coverUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
    uploadDate: '2024-12-13',
    publishDate: '2024-12-14',
    author: '系统管理员'
  },
  {
    id: 'video-4',
    bookId: 'book-5',
    bookTitle: '美学散步',
    title: '中国美学的意境',
    category: '艺术人文',
    status: '已发布',
    duration: 165,
    views: 6234,
    likes: 312,
    coverUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400',
    uploadDate: '2024-12-12',
    publishDate: '2024-12-13',
    author: '系统管理员',
    disabled: true // 已禁用示例
  },
  {
    id: 'video-5',
    bookId: 'book-2',
    bookTitle: '艺术的故事',
    title: '文艺复兴的艺术革命',
    category: '艺术人文',
    status: '待审核',
    duration: 220,
    views: 0,
    likes: 0,
    coverUrl: 'https://images.unsplash.com/photo-1549887534-1541e9326642?w=400',
    uploadDate: '2024-12-16',
    aiExtractDate: '2024-12-16'
  },
  {
    id: 'video-6',
    bookId: 'book-3',
    bookTitle: '从0到1',
    title: '创新的本质',
    category: '商业业务',
    status: '待提取',
    duration: 0,
    views: 0,
    likes: 0,
    coverUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
    uploadDate: '2024-12-16'
  }
];

// 模拟用户数据
export const mockUsers: User[] = [
  {
    id: 'user-1',
    username: '张三',
    email: 'zhangsan@example.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
    joinDate: '2024-01-15',
    canPublish: true,
    canComment: true,
    totalViews: 25430,
    totalVideos: 15
  },
  {
    id: 'user-2',
    username: '李四',
    email: 'lisi@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    joinDate: '2024-02-20',
    canPublish: false,
    canComment: true,
    totalViews: 8920,
    totalVideos: 0
  },
  {
    id: 'user-3',
    username: '王五',
    email: 'wangwu@example.com',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100',
    joinDate: '2024-03-10',
    canPublish: true,
    canComment: true,
    totalViews: 12340,
    totalVideos: 8
  },
  {
    id: 'user-4',
    username: '赵六',
    email: 'zhaoliu@example.com',
    joinDate: '2024-06-05',
    canPublish: false,
    canComment: false,
    totalViews: 450,
    totalVideos: 0
  }
];

// 模拟统计数据
export const mockStatistics: Statistics = {
  totalVideos: 6,
  totalViews: 30391,
  totalUsers: 4,
  todayViews: 2340,
  weeklyViews: [3200, 4100, 3800, 5200, 4500, 4900, 2340],
  categoryDistribution: [
    { category: '科技', count: 3 },
    { category: '艺术人文', count: 2 },
    { category: '商业业务', count: 1 }
  ],
  topVideos: [
    { title: 'AI的起源与发展', views: 15234 },
    { title: '量子力学的诞生', views: 8923 },
    { title: '中国美学的意境', views: 6234 }
  ]
};