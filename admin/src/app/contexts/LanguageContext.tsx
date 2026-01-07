import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.zh;
}

const translations = {
  zh: {
    // 通用
    dashboard: '后台概览',
    books: '书籍管理',
    videos: '视频管理',
    users: '用户管理',
    statistics: '数据统计',
    settings: '设置',
    logout: '退出登录',
    mainFeatures: '主要功能',
    videoApp: '视频小程序',
    adminSystem: '后台管理系统',
    
    // 操作
    add: '添加',
    edit: '编辑',
    delete: '删除',
    save: '保存',
    cancel: '取消',
    confirm: '确认',
    search: '搜索',
    reset: '重置',
    submit: '提交',
    upload: '上传',
    download: '下载',
    view: '查看',
    close: '关闭',
    back: '返回',
    
    // 状态
    pending: '待审核',
    approved: '已发布',
    rejected: '已驳回',
    disabled: '已禁用',
    
    // 提示信息
    success: '操作成功',
    error: '操作失败',
    loading: '加载中...',
    noData: '暂无数据',
    confirmDelete: '确认删除？',
    deleteSuccess: '删除成功',
    deleteFailed: '删除失败',
    saveSuccess: '保存成功',
    saveFailed: '保存失败',
    uploadSuccess: '上传成功',
    uploadFailed: '上传失败',
    
    // 书籍管理
    bookTitle: '书名',
    bookAuthor: '作者',
    bookCategory: '分类',
    extractContent: '提取内容',
    generateVideo: '生成视频',
    publishVideo: '发布视频',
    
    // 视频管理
    videoTitle: '视频标题',
    videoCategory: '视频分类',
    videoStatus: '状态',
    videoDuration: '时长',
    videoViews: '播放量',
    videoLikes: '点赞',
    sourceBook: '来源书籍',
    publishDate: '发布日期',
    reviewVideo: '审核视频',
    publishFromBackend: '后台发布视频',
    
    // 用户管理
    username: '用户名',
    email: '邮箱',
    permissions: '权限',
    canPublish: '可发布',
    canComment: '可评论',
    modifyPermissions: '修改权限',
    deleteUser: '删除用户',
    
    // 统计
    totalBooks: '总书籍数',
    totalVideos: '总视频数',
    totalUsers: '总用户数',
    totalViews: '总播放量',
    
    // Dashboard
    popularVideos: '热门视频',
    views: '次播放',
    viewVideo: '查看视频',
    noVideoData: '暂无视频数据',
    watchVideo: '观看视频',
  },
  en: {
    // Common
    dashboard: 'Dashboard',
    books: 'Book Management',
    videos: 'Video Management',
    users: 'User Management',
    statistics: 'Statistics',
    settings: 'Settings',
    logout: 'Logout',
    mainFeatures: 'Main Features',
    videoApp: 'Video App',
    adminSystem: 'Admin System',
    
    // Actions
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    search: 'Search',
    reset: 'Reset',
    submit: 'Submit',
    upload: 'Upload',
    download: 'Download',
    view: 'View',
    close: 'Close',
    back: 'Back',
    
    // Status
    pending: 'Pending Review',
    approved: 'Published',
    rejected: 'Rejected',
    disabled: 'Disabled',
    
    // Messages
    success: 'Operation successful',
    error: 'Operation failed',
    loading: 'Loading...',
    noData: 'No data available',
    confirmDelete: 'Confirm deletion?',
    deleteSuccess: 'Deleted successfully',
    deleteFailed: 'Failed to delete',
    saveSuccess: 'Saved successfully',
    saveFailed: 'Failed to save',
    uploadSuccess: 'Uploaded successfully',
    uploadFailed: 'Failed to upload',
    
    // Book Management
    bookTitle: 'Book Title',
    bookAuthor: 'Author',
    bookCategory: 'Category',
    extractContent: 'Extract Content',
    generateVideo: 'Generate Video',
    publishVideo: 'Publish Video',
    
    // Video Management
    videoTitle: 'Video Title',
    videoCategory: 'Category',
    videoStatus: 'Status',
    videoDuration: 'Duration',
    videoViews: 'Views',
    videoLikes: 'Likes',
    sourceBook: 'Source Book',
    publishDate: 'Publish Date',
    reviewVideo: 'Review Video',
    publishFromBackend: 'Publish from Backend',
    
    // User Management
    username: 'Username',
    email: 'Email',
    permissions: 'Permissions',
    canPublish: 'Can Publish',
    canComment: 'Can Comment',
    modifyPermissions: 'Modify Permissions',
    deleteUser: 'Delete User',
    
    // Statistics
    totalBooks: 'Total Books',
    totalVideos: 'Total Videos',
    totalUsers: 'Total Users',
    totalViews: 'Total Views',
    
    // Dashboard
    popularVideos: 'Popular Videos',
    views: 'views',
    viewVideo: 'View Video',
    noVideoData: 'No video data',
    watchVideo: 'Watch Video',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // 固定使用英文
  const language: Language = 'en';

  const setLanguage = (lang: Language) => {
    // 不再允许切换语言，固定为英文
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations.en // 始终返回英文翻译
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

