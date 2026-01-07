// 加载环境变量（必须在其他模块之前加载）
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const AV = require('leancloud-storage');

// 初始化LeanCloud（从环境变量读取）
AV.init({
  appId: process.env.LEANCLOUD_APP_ID || 'RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz',
  appKey: process.env.LEANCLOUD_APP_KEY || '1w0cQLBZIaJ32tjaU7RkDu3n',
  masterKey: process.env.LEANCLOUD_MASTER_KEY || 'Ub2GDZGGNo0NuUOvDRheK04Y',
  serverURL: process.env.LEANCLOUD_SERVER_URL || 'https://rdecdltb.lc-cn-n1-shared.com'
});

// 使用Master Key进行操作
AV.Cloud.useMasterKey();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// CORS配置（支持生产环境和开发环境）
const allowedOrigins = [
  'http://localhost:5174', // 前端开发环境
  'http://localhost:5173', // 前端开发环境
  'http://localhost:5175', // 后台管理界面开发环境
  'http://localhost:5176', // 后台管理界面（备用端口）
  // 从环境变量读取生产环境域名
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.ADMIN_URL ? [process.env.ADMIN_URL] : []),
].filter(Boolean); // 过滤掉undefined值

app.use(cors({
  origin: function (origin, callback) {
    // 允许没有origin的请求（如移动应用或Postman）
    if (!origin) return callback(null, true);
    
    // 检查origin是否在白名单中
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // 在生产环境中，可以允许所有Netlify域名
      if (process.env.NODE_ENV === 'production' && origin && origin.includes('.netlify.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// API请求日志中间件
app.use('/api', (req, res, next) => {
  console.log(`🌐 API CALL: ${req.method} ${req.originalUrl}`);
  console.log(`📋 Query:`, JSON.stringify(req.query));
  next();
});

// 特殊处理videos路由
app.use('/api/videos', (req, res, next) => {
  console.log(`🎬 Videos middleware: ${req.method} ${req.path}`);
  next();
});

// API路由
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const categoryRoutes = require('./routes/categories');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const likeRoutes = require('./routes/likes');
const favoriteRoutes = require('./routes/favorites');
const bookRoutes = require('./routes/books');
const commentRoutes = require('./routes/comments');
const followRoutes = require('./routes/follows');

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/follows', followRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Catch-all中间件 - 记录所有未匹配的API请求
app.use('/api', (req, res, next) => {
  // 只处理/api路径下的请求
  if (!res.headersSent) {
    console.log(`❌ Unmatched API route: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      success: false,
      message: 'API endpoint not found',
      path: req.path,
      method: req.method
    });
  } else {
    next();
  }
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('Server Error:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.errors
    });
  }

  if (error.code === 101) { // LeanCloud Object not found
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }

  if (error.code === 403) { // Forbidden
    return res.status(403).json({
      success: false,
      message: 'Access forbidden'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Video App Backend API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 LeanCloud connected: ${AV.applicationId}`);
});

module.exports = app;
