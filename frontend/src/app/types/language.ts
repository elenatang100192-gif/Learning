export type Language = 'zh' | 'en';

export interface Translations {
  // 通用
  home: string;
  profile: string;
  publish: string;
  
  // 分类
  tech: string;
  arts: string;
  business: string;
  
  // 登录页面
  loginTitle: string;
  loginSubtitle: string;
  companyEmail: string;
  emailPlaceholder: string;
  sendCode: string;
  verificationCode: string;
  sentTo: string;
  enterCode: string;
  login: string;
  backToEmail: string;
  codeExpiry: string;
  demoMode: string;
  emailError: string;
  codeError: string;
  sending: string;
  loggingIn: string;
  sendCodeError: string;
  loginError: string;
  loginSuccess: string;
  codeSent: string;
  
  // 首页
  notifications: string;
  
  // 个人中心
  myPublications: string;
  myFavorites: string;
  watchHistory: string;
  logout: string;
  
  // 视频互动
  like: string;
  comment: string;
  share: string;
  follow: string;
  following: string;
  
  // 发布页面
  publishVideo: string;
  videoTitle: string;
  videoTitleEn: string;
  titlePlaceholder: string;
  titlePlaceholderEn: string;
  selectCategory: string;
  uploadVideo: string;
  uploadCover: string;
  submit: string;
  cancel: string;
  
  // 通知中心
  notificationTitle: string;
  noNotifications: string;
  approved: string;
  rejected: string;
  pending: string;
  
  // 我的发布
  myPublicationsTitle: string;
  noPublications: string;
  views: string;
  
  // 评论
  addComment: string;
  commentPlaceholder: string;
  send: string;
}

export const translations: Record<Language, Translations> = {
  zh: {
    // 通用
    home: '首页',
    profile: '我的',
    publish: '发布',
    
    // 分类
    tech: '科技',
    arts: '艺术人文',
    business: '商业业务',
    
    // 登录页面
    loginTitle: '知识视频平台',
    loginSubtitle: 'Ashley Furniture 内部系统',
    companyEmail: '公司邮箱',
    emailPlaceholder: 'name@ashleyfurniture.com',
    sendCode: '发送验证码',
    verificationCode: '验证码',
    sentTo: '已发送至',
    enterCode: '请输入6位验证码',
    login: '登录',
    backToEmail: '返回重新输入邮箱',
    codeExpiry: '验证码将发送至您的公司邮箱，5分钟内有效',
    demoMode: '演示模式：输入任意6位数字即可登录',
    emailError: '请输入有效的邮箱地址',
    codeError: '请输入6位验证码',
    sending: '发送中...',
    loggingIn: '登录中...',
    sendCodeError: '发送验证码失败，请重试',
    loginError: '登录失败，请检查验证码',
    loginSuccess: '登录成功！',
    codeSent: '验证码已发送到您的邮箱',
    
    // 首页
    notifications: '通知',
    
    // 个人中心
    myPublications: '我的发布',
    myFavorites: '我的收藏',
    watchHistory: '观看历史',
    logout: '退出登录',
    
    // 视频互动
    like: '点赞',
    comment: '评论',
    share: '分享',
    follow: '关注',
    following: '已关注',
    
    // 发布页面
    publishVideo: '发布视频',
    videoTitle: '视频标题（中文）',
    videoTitleEn: '视频标题（英文）',
    titlePlaceholder: '请输入中文标题...',
    titlePlaceholderEn: '请输入英文标题...',
    selectCategory: '选择分类',
    uploadVideo: '上传视频',
    uploadCover: '上传封面',
    submit: '提交审核',
    cancel: '取消',
    
    // 通知中心
    notificationTitle: '通知中心',
    noNotifications: '暂无通知',
    approved: '已通过',
    rejected: '未通过',
    pending: '审核中',
    
    // 我的发布
    myPublicationsTitle: '我的发布',
    noPublications: '暂无发布内容',
    views: '播放',
    
    // 评论
    addComment: '添加评论',
    commentPlaceholder: '说点什么...',
    send: '发送',
  },
  en: {
    // 通用
    home: 'Home',
    profile: 'Profile',
    publish: 'Publish',
    
    // 分类
    tech: 'Tech',
    arts: 'Arts',
    business: 'Business',
    
    // 登录页面
    loginTitle: 'VidBrain AI Short Video Platform',
    loginSubtitle: 'Ashley Furniture Internal System',
    companyEmail: 'Company Email',
    emailPlaceholder: 'name@ashleyfurniture.com',
    sendCode: 'Send Code',
    verificationCode: 'Verification Code',
    sentTo: 'Sent to',
    enterCode: 'Enter 6-digit code',
    login: 'Login',
    backToEmail: 'Back to Email',
    codeExpiry: 'Code will be sent to your company email, valid for 5 minutes',
    demoMode: 'Demo mode: Enter any 6-digit number to login',
    emailError: 'Please enter a valid email address',
    codeError: 'Please enter 6-digit code',
    sending: 'Sending...',
    loggingIn: 'Logging in...',
    sendCodeError: 'Failed to send code, please try again',
    loginError: 'Login failed, please check your code',
    loginSuccess: 'Login successful!',
    codeSent: 'Code sent to your email',
    
    // 首页
    notifications: 'Notifications',
    
    // 个人中心
    myPublications: 'My Publications',
    myFavorites: 'My Favorites',
    watchHistory: 'Watch History',
    logout: 'Logout',
    
    // 视频互动
    like: 'Like',
    comment: 'Comment',
    share: 'Share',
    follow: 'Follow',
    following: 'Following',
    
    // 发布页面
    publishVideo: 'Publish Video',
    videoTitle: 'Video Title (Chinese)',
    videoTitleEn: 'Video Title (English)',
    titlePlaceholder: 'Enter video title (Chinese)...',
    titlePlaceholderEn: 'Enter video title (English)...',
    selectCategory: 'Select Category',
    uploadVideo: 'Upload Video',
    uploadCover: 'Upload Cover',
    submit: 'Submit',
    cancel: 'Cancel',
    
    // 通知中心
    notificationTitle: 'Notifications',
    noNotifications: 'No notifications',
    approved: 'Approved',
    rejected: 'Rejected',
    pending: 'Pending',
    
    // 我的发布
    myPublicationsTitle: 'My Publications',
    noPublications: 'No publications yet',
    views: 'Views',
    
    // 评论
    addComment: 'Add Comment',
    commentPlaceholder: 'Say something...',
    send: 'Send',
  },
};