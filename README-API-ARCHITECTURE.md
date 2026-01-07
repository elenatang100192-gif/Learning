# 视频APP系统架构说明

## 🏛️ 系统架构总览

本项目采用前后端分离的现代化架构：

```
┌─────────────────┐    HTTP API    ┌─────────────────┐    LeanCloud SDK    ┌─────────────────┐
│   前端应用      │───────────────▶│   后端API       │────────────────────▶│   LeanCloud      │
│   (React)       │                │   (Express.js)  │                     │   数据库         │
│   localhost:5174 │               │   localhost:3001│                     │                 │
└─────────────────┘                └─────────────────┘                     └─────────────────┘
         │                                 │                                        │
         │                                 │                                        │
         ▼                                 ▼                                        ▼
┌─────────────────┐               ┌─────────────────┐                    ┌─────────────────┐
│   后台管理界面  │◀──────────────│   相同的API     │                    │   MongoDB        │
│   (React)       │               │   接口          │                    │   数据库         │
│   localhost:5173│               └─────────────────┘                    └─────────────────┘
└─────────────────┘
```

## 🎯 架构优势

### ✅ 前后端分离
- **前端**: 专注于用户界面和用户体验
- **后端**: 专注于业务逻辑和数据处理
- **解耦**: 前后端可以独立开发、部署和扩展

### ✅ API标准化
- **RESTful设计**: 统一的HTTP API接口
- **数据格式**: 标准JSON响应格式
- **错误处理**: 统一的错误响应结构

### ✅ 安全性增强
- **认证**: Session-based认证机制
- **CORS**: 跨域资源共享控制
- **输入验证**: 服务端数据验证
- **速率限制**: API调用频率控制

### ✅ 可扩展性
- **模块化**: 路由分离，便于功能扩展
- **中间件**: 可插拔的中间件架构
- **数据库抽象**: 通过API层访问数据库

## 📁 项目结构

```
Learning/
├── frontend/                  # 前端应用
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # React组件
│   │   │   ├── services/       # API服务层
│   │   │   └── contexts/       # React上下文
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── admin/                     # 后台管理界面
│   ├── src/
│   │   └── app/
│   │       ├── components/     # 管理界面组件
│   │       └── services/       # 共享API服务
│   └── package.json
│
├── admin API/                 # 后端API服务
│   ├── routes/                 # API路由
│   ├── server.js              # Express服务器
│   └── package.json
│
├── scripts/
│   └── init-database.js       # 数据库初始化脚本
│
└── 配置指南-LeanCloud+阿里云OSS.md  # 配置文档
```

## 🔄 数据流

### 用户注册/登录流程
```
1. 用户输入邮箱 → 前端
2. 前端调用 POST /api/auth/send-otp → 后端API
3. 后端调用 LeanCloud.User.requestEmailVerify() → LeanCloud
4. 用户收到OTP邮件
5. 用户输入OTP → 前端
6. 前端调用 POST /api/auth/login → 后端API
7. 后端调用 LeanCloud.User.logInWithEmail() → LeanCloud
8. 返回用户信息和Session Token
9. 前端存储Token到localStorage
```

### 视频浏览流程
```
1. 用户进入视频Feed → 前端
2. 前端调用 GET /api/videos → 后端API
3. 后端调用 LeanCloud查询 → LeanCloud数据库
4. 返回视频列表 → 前端渲染
5. 用户点击视频 → 前端播放
6. 前端调用 POST /api/videos/:id/view → 后端API
7. 后端更新观看次数 → LeanCloud数据库
```

### 视频发布流程
```
1. 用户填写表单并上传文件 → 前端
2. 前端调用 POST /api/upload/video → 后端API
3. 后端上传文件到LeanCloud存储
4. 前端调用 POST /api/videos/publish → 后端API
5. 后端创建视频记录 → LeanCloud数据库
6. 视频进入审核状态
```

## 🚀 启动指南

### 1. 启动后端API
```bash
cd admin\ API
npm install
npm run dev
# 服务运行在 http://localhost:3001
```

### 2. 启动前端应用
```bash
cd frontend
npm install
npm run dev
# 服务运行在 http://localhost:5174
```

### 3. 启动后台管理界面
```bash
cd admin
npm install
npm run dev
# 服务运行在 http://localhost:5173
```

## 🔧 API设计原则

### 统一的响应格式
```json
// 成功响应
{
  "success": true,
  "data": { /* 数据内容 */ },
  "pagination": { /* 分页信息，可选 */ }
}

// 错误响应
{
  "success": false,
  "message": "错误描述",
  "errors": [ /* 验证错误详情，可选 */ ]
}
```

### RESTful路由设计
- `GET /resource` - 获取资源列表
- `GET /resource/:id` - 获取单个资源
- `POST /resource` - 创建资源
- `PUT /resource/:id` - 更新资源
- `DELETE /resource/:id` - 删除资源

### 认证机制
- 使用Session Token进行认证
- Token存储在前端localStorage中
- 每次API请求自动携带认证信息

## 🗄️ 数据存储

### LeanCloud优势
- **快速开发**: 无需搭建数据库服务器
- **自动扩展**: 根据使用量自动扩容
- **文件存储**: 内置文件上传和CDN
- **实时功能**: 支持实时消息推送

### 数据表结构
- **Category**: 视频分类
- **Video**: 视频内容和元数据
- **_User**: 用户账户信息
- **Like**: 用户点赞记录
- **Favorite**: 用户收藏记录
- **WatchHistory**: 观看历史记录
- **StatisticsDaily**: 每日统计数据

## 🔒 安全考虑

### 前端安全
- **XSS防护**: React自动转义
- **CSRF防护**: SameSite Cookie设置
- **内容安全**: 输入验证和清理

### 后端安全
- **Helmet**: HTTP安全头
- **CORS**: 限制允许的域名
- **速率限制**: 防止API滥用
- **输入验证**: 防止恶意输入

### 数据安全
- **加密存储**: 敏感信息加密
- **访问控制**: 基于角色的权限控制
- **审计日志**: 操作记录追踪

## 📊 性能优化

### 前端优化
- **代码分割**: 按路由分割代码包
- **懒加载**: 组件和图片懒加载
- **缓存**: API响应缓存
- **压缩**: Gzip压缩传输

### 后端优化
- **数据库索引**: 优化查询性能
- **缓存**: Redis缓存热点数据
- **压缩**: 响应数据压缩
- **连接池**: 数据库连接复用

## 🔄 部署策略

### 开发环境
- 本地开发服务器
- Hot reload支持
- 开发工具集成

### 生产环境
- **前端**: 静态文件部署到CDN
- **后端**: Docker容器化部署
- **数据库**: LeanCloud云数据库
- **监控**: 日志收集和性能监控

## 🚧 扩展计划

### 短期目标
- [ ] 添加评论功能
- [ ] 实现视频搜索
- [ ] 添加用户关注系统
- [ ] 优化移动端体验

### 长期规划
- [ ] 实时聊天功能
- [ ] 视频直播功能
- [ ] 推荐算法
- [ ] 多语言支持
- [ ] 国际化部署

## 📞 支持

如有问题或建议，请通过以下方式联系：
- 提交GitHub Issue
- 发送邮件至开发团队
- 查看在线文档

---

**最后更新**: 2025-12-29
