# 项目技术规划文档 / Project Technical Planning Document

## 中文版 / Chinese Version

### 📋 项目概述 / Project Overview

**项目名称**: 知识视频APP / Knowledge Video App

**项目描述**: 一个基于书籍内容的知识分享移动应用，通过AI技术将书籍精华内容转化为视频，为用户提供沉浸式的知识学习体验。支持iOS和Android双平台，可发布至App Store和Google Play应用商店。

**Project Description**: A knowledge-sharing mobile application based on book content that converts book highlights into videos through AI technology, providing users with an immersive learning experience. Supports both iOS and Android platforms and can be published to App Store and Google Play.

---

## 🏗️ 技术架构 / Technical Architecture

### 前端技术栈 / Frontend Tech Stack

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 18.3.1 | 前端框架 / Frontend Framework |
| **TypeScript** | Latest | 类型安全 / Type Safety |
| **Vite** | 6.3.5 | 构建工具 / Build Tool |
| **Tailwind CSS** | 4.1.12 | 样式框架 / Styling Framework |
| **Radix UI** | Latest | UI组件库 / UI Component Library |
| **shadcn/ui** | Latest | UI组件系统 / UI Component System |
| **LeanCloud SDK** | 4.14.0 | BaaS客户端 / BaaS Client |

**项目结构**:
```
frontend/          # 用户端Web应用 / User-facing Web App
admin/            # 后台管理Web应用 / Admin Management Web App
admin API/        # 后端API服务 / Backend API Service
```

### 后端技术栈 / Backend Tech Stack

| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | 18+ | 运行时环境 / Runtime Environment |
| **Express** | 4.18.2 | Web框架 / Web Framework |
| **LeanCloud** | Latest | BaaS平台（数据库+认证） / BaaS Platform (Database + Auth) |
| **阿里云OSS** | Latest | 文件存储 / File Storage |
| **FFmpeg** | Latest | 视频处理 / Video Processing |
| **Nodemailer** | 7.0.12 | 邮件服务 / Email Service |

**核心依赖**:
- `leancloud-storage`: LeanCloud数据存储SDK
- `ali-oss`: 阿里云OSS SDK
- `fluent-ffmpeg`: FFmpeg Node.js封装
- `express`: Web服务器框架
- `cors`: 跨域资源共享
- `multer`: 文件上传处理
- `nodemailer`: 邮件发送

### 数据库设计 / Database Design

**LeanCloud MongoDB数据库表结构**:

| 表名 | 说明 |
|------|------|
| `Category` | 分类表（科技/艺术人文/商业业务） |
| `Book` | 书籍信息表 |
| `Video` | 视频信息表 |
| `ExtractedContent` | AI提取内容表 |
| `Like` | 点赞表 |
| `Favorite` | 收藏表 |
| `Comment` | 评论表 |
| `WatchHistory` | 播放历史表 |
| `AuditLog` | 审核日志表 |
| `UserSession` | 用户会话表 |
| `Notification` | 通知表 |
| `StatisticsDaily` | 每日统计表 |

---

## 🤖 AI产品集成 / AI Products Integration

### 1. 书籍内容提取 / Book Content Extraction

**产品**: Deepseek
- **API Key**: `sk-c3a8c2ddc6dc49c4b6f43b3394147ead`
- **用途**: 书籍拆解、内容提取、生成视频脚本大纲
- **Use Case**: Book decomposition, content extraction, video script outline generation

### 2. 文字转语音 / Text-to-Speech (TTS)

**产品**: 腾讯云TTS / Tencent Cloud TTS
- **文档**: https://cloud.tencent.com/document/product/1073/34079
- **配置**: 
  - `TENCENT_SECRET_ID`: 环境变量
  - `TENCENT_SECRET_KEY`: 环境变量
- **用途**: 中文/英文文字转语音
- **Use Case**: Chinese/English text-to-speech conversion

### 3. 文字生成视频 / Text-to-Video

**产品**: Doubao-Seedance-1.5-pro
- **Model ID**: `doubao-seedance-1-5-pro-251215`
- **API Key**: `866a3f1e-a011-4f07-a5a8-01cd771f8552`
- **文档**: https://www.volcengine.com/docs/82379/1520758?lang=zh
- **用途**: 文字生成视频
- **Use Case**: Text-to-video generation

**备选方案**:
- 通义万相 / Tongyi Wanxiang
- Vidu
- Seedance
- 可灵 / Kling

### 4. AI处理流程 / AI Processing Workflow

```
书籍录入 → AI提取精华 → AI生成视频脚本 → TTS生成语音 → 视频生成 → 人工审核 → 发布上线
Book Input → AI Extract Highlights → AI Generate Script → TTS Generate Audio → Video Generation → Manual Review → Publish
```

---

## 🚀 部署方案 / Deployment Strategy

### 前端部署 / Frontend Deployment

#### 方案A: Netlify（国外服务）

**优势**:
- ✅ 配置简单，自动化程度高
- ✅ 免费额度充足
- ⚠️ 国内访问可能较慢

**部署步骤**:
1. 连接GitHub仓库
2. 配置构建命令: `npm install && npm run build`
3. 发布目录: `dist`
4. 配置环境变量（见下方）
5. 自动部署

#### 方案B: 腾讯云静态网站托管（国内服务，推荐）

**优势**:
- ✅ 国内访问速度快
- ✅ 与后端在同一平台，管理方便
- ✅ 支持Git自动部署
- ✅ 免费额度充足

**部署步骤**:
1. 开通云开发服务
2. 创建静态网站托管站点
3. 配置Git仓库连接
4. 设置构建命令和输出目录
5. 配置环境变量
6. 自动部署

### 后台管理部署 / Admin Dashboard Deployment

与前端部署方式相同，使用独立的站点配置。

### 后端API部署 / Backend API Deployment

#### 方案A: Railway（国外服务）

**优势**:
- ✅ 配置简单
- ✅ 自动检测Node.js项目
- ⚠️ 国内访问可能较慢

**部署步骤**:
1. 连接GitHub仓库
2. 设置Root Directory为 `admin API`
3. 配置环境变量
4. 自动部署

#### 方案B: 腾讯云CloudBase Run（国内服务，推荐）

**优势**:
- ✅ 国内访问速度快
- ✅ 支持Docker容器
- ✅ 可以安装FFmpeg等系统依赖
- ✅ 与前端在同一平台

**部署步骤**:
1. 创建云托管服务
2. 配置Git仓库连接
3. 设置目标目录为 `admin API`
4. 创建Dockerfile（包含FFmpeg安装）
5. 配置服务端口（3001）
6. 配置环境变量
7. 自动部署

**Dockerfile示例**:
```dockerfile
FROM node:18
RUN apt-get update && apt-get install -y ffmpeg
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

#### 方案C: 阿里云SAE（国内服务）

**优势**:
- ✅ 国内服务，访问速度快
- ✅ 支持Docker容器
- ✅ 按量付费，成本可控

### 数据库部署 / Database Deployment

**LeanCloud MongoDB**:
- 免费套餐: 5GB存储，30,000次API请求/天
- 配置步骤:
  1. 注册LeanCloud账号
  2. 创建应用
  3. 获取App ID、App Key、Master Key
  4. 初始化数据库结构
  5. 配置域名白名单

### 文件存储部署 / File Storage Deployment

**阿里云OSS**:
- 存储费用: ¥0.12/GB/月（标准存储）
- CDN流量费用: ¥0.24/GB（国内流量）
- 配置步骤:
  1. 注册阿里云账号
  2. 开通OSS服务
  3. 创建Bucket
  4. 配置CORS规则
  5. 获取AccessKey ID和Secret

---

## 📦 环境变量配置 / Environment Variables Configuration

### 前端环境变量 / Frontend Environment Variables

```bash
VITE_LEANCLOUD_APP_ID=RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz
VITE_LEANCLOUD_APP_KEY=1w0cQLBZIaJ32tjaU7RkDu3n
VITE_LEANCLOUD_SERVER_URL=https://rdecdltb.lc-cn-n1-shared.com
VITE_API_BASE_URL=https://your-backend-api.railway.app/api
```

### 后端环境变量 / Backend Environment Variables

#### LeanCloud配置
```bash
LEANCLOUD_APP_ID=RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz
LEANCLOUD_APP_KEY=1w0cQLBZIaJ32tjaU7RkDu3n
LEANCLOUD_MASTER_KEY=Ub2GDZGGNo0NuUOvDRheK04Y
LEANCLOUD_SERVER_URL=https://rdecdltb.lc-cn-n1-shared.com
```

#### AI API Keys
```bash
DEEPSEEK_API_KEY=sk-c3a8c2ddc6dc49c4b6f43b3394147ead
DASHSCOPE_API_KEY=sk-7d830956ecb642349f40833295dfd04c
ARK_API_KEY=866a3f1e-a011-4f07-a5a8-01cd771f8552
DOUBAO_MODEL_ID=doubao-seedance-1-5-pro-251215
DOUBAO_TTS_APP_ID=7616870473
DOUBAO_TTS_ACCESS_KEY=q8Fx7NRJOVxrl6486XjBKaTL4gqVwqXm
DOUBAO_TTS_SECRET_KEY=d9ryy2RnuxT5wGmmA4EteU24fVRjcYSb
DOUBAO_TTS_RESOURCE_ID=seed-tts-1.0
```

#### 阿里云OSS配置
```bash
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_BUCKET=knowledge-video-app
```

#### 腾讯云TTS配置
```bash
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
```

#### 邮件服务配置
```bash
EMAIL_USER=your-email@163.com
EMAIL_PASS=your_password
EMAIL_HOST=smtp.163.com
EMAIL_PORT=465
EMAIL_SECURE=true
```

#### 服务器配置
```bash
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-app.netlify.app
ADMIN_URL=https://your-admin-app.netlify.app
```

---

## 💰 成本估算 / Cost Estimation

### 300用户量场景 / 300 Users Scenario

**月成本估算**:

| 服务 | 费用 | 说明 |
|------|------|------|
| **LeanCloud** | ¥0 | 免费套餐足够 |
| **阿里云OSS存储** | ¥10-15/月 | 72GB/年，标准存储 |
| **CDN流量** | ¥100-120/月 | 450GB/月 |
| **请求费用** | ¥5-10/月 | OSS请求费用 |
| **总计** | **¥110-135/月** | 第一年 |

**成本优化建议**:
- 使用生命周期规则：30天后转为低频访问存储（节省50%成本）
- 视频压缩：上传前压缩视频，减少存储空间
- CDN缓存：设置合理的缓存时间（30天）

---

## 🔐 安全特性 / Security Features

### 用户访问控制 / User Access Control

- 🔒 **仅限预注册用户**: 只有通过后台管理创建的用户才能使用邮箱OTP登录
- 🚫 **阻止未授权访问**: 未注册用户尝试登录时会收到"用户不存在，请联系管理员注册账号"的提示
- 👥 **管理员管理**: 所有用户账号由管理员统一管理，确保安全性

### 安全流程 / Security Workflow

1. **管理员创建用户**: 在后台管理界面添加用户账号
2. **用户获取OTP**: 只有已注册用户才能请求OTP验证码
3. **OTP验证登录**: 使用6位数字验证码完成登录
4. **会话管理**: 安全的token-based认证系统

---

## 📊 项目结构 / Project Structure

```
Learning/
├── frontend/              # 用户端Web应用
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # UI组件
│   │   │   ├── contexts/      # React Context
│   │   │   ├── services/      # API服务
│   │   │   └── types/         # TypeScript类型
│   │   └── styles/            # 样式文件
│   ├── package.json
│   └── vite.config.ts
├── admin/                 # 后台管理Web应用
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # 管理界面组件
│   │   │   └── services/     # API服务
│   │   └── styles/           # 样式文件
│   ├── package.json
│   └── vite.config.ts
├── admin API/            # 后端API服务
│   ├── routes/           # API路由
│   ├── utils/           # 工具函数
│   ├── server.js        # 服务器入口
│   ├── Dockerfile       # Docker配置
│   └── package.json
├── scripts/              # 数据库初始化脚本
├── README.md             # 项目说明文档
└── planning.md           # 本文件
```

---

## 🎯 核心功能 / Core Features

### 用户端功能 / User Features

1. **视频浏览**: 上下滑动切换视频（类似抖音交互）
2. **内容分类**: 科技、艺术人文、商业业务三大分类
3. **用户交互**: 点赞、收藏、分享、评论
4. **个人中心**: 用户信息管理、发布列表、审核状态查看
5. **视频发布**: 支持视频文件上传、双语标题输入
6. **登录认证**: OTP邮箱验证码登录（仅限@ashleyfurniture.com域名）

### 后台管理功能 / Admin Features

1. **书籍管理**: 书籍信息录入、AI内容提取处理
2. **视频管理**: 视频审核工作流、发布控制
3. **用户管理**: 用户数据统计、权限管理
4. **数据统计**: 播放数据分析、用户活跃度统计

---

## 📝 开发规范 / Development Standards

- **代码风格**: ESLint + Prettier
- **Git提交**: Conventional Commits
- **分支管理**: Git Flow
- **代码审查**: Pull Request流程

---

## 🔄 内容上传流程 / Content Upload Workflow

```
书籍录入 → AI提取精华 → AI生成视频脚本 → TTS生成语音 → 视频生成 → 人工审核 → 发布上线
Book Input → AI Extract → AI Generate Script → TTS Generate Audio → Video Generation → Manual Review → Publish
```

---

## 📚 相关文档 / Related Documentation

- [README.md](./README.md) - 项目详细说明文档
- [配置指南-LeanCloud+阿里云OSS.md](./配置指南-LeanCloud+阿里云OSS.md) - 配置指南
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 部署指南
- [DATABASE_INIT_README.md](./DATABASE_INIT_README.md) - 数据库初始化指南

---

## 🌐 English Version

### 📋 Project Overview

**Project Name**: Knowledge Video App

**Project Description**: A knowledge-sharing mobile application based on book content that converts book highlights into videos through AI technology, providing users with an immersive learning experience. Supports both iOS and Android platforms and can be published to App Store and Google Play.

---

## 🏗️ Technical Architecture

### Frontend Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | Frontend Framework |
| **TypeScript** | Latest | Type Safety |
| **Vite** | 6.3.5 | Build Tool |
| **Tailwind CSS** | 4.1.12 | Styling Framework |
| **Radix UI** | Latest | UI Component Library |
| **shadcn/ui** | Latest | UI Component System |
| **LeanCloud SDK** | 4.14.0 | BaaS Client |

### Backend Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime Environment |
| **Express** | 4.18.2 | Web Framework |
| **LeanCloud** | Latest | BaaS Platform (Database + Auth) |
| **Alibaba Cloud OSS** | Latest | File Storage |
| **FFmpeg** | Latest | Video Processing |
| **Nodemailer** | 7.0.12 | Email Service |

---

## 🤖 AI Products Integration

### 1. Book Content Extraction

**Product**: Deepseek
- **API Key**: `sk-c3a8c2ddc6dc49c4b6f43b3394147ead`
- **Use Case**: Book decomposition, content extraction, video script outline generation

### 2. Text-to-Speech (TTS)

**Product**: Tencent Cloud TTS
- **Documentation**: https://cloud.tencent.com/document/product/1073/34079
- **Use Case**: Chinese/English text-to-speech conversion

### 3. Text-to-Video

**Product**: Doubao-Seedance-1.5-pro
- **Model ID**: `doubao-seedance-1-5-pro-251215`
- **API Key**: `866a3f1e-a011-4f07-a5a8-01cd771f8552`
- **Use Case**: Text-to-video generation

**Alternative Solutions**:
- Tongyi Wanxiang
- Vidu
- Seedance
- Kling

### 4. AI Processing Workflow

```
Book Input → AI Extract Highlights → AI Generate Script → TTS Generate Audio → Video Generation → Manual Review → Publish
```

---

## 🚀 Deployment Strategy

### Frontend Deployment

#### Option A: Netlify (International Service)

**Advantages**:
- ✅ Simple configuration, high automation
- ✅ Generous free tier
- ⚠️ May be slow in China

#### Option B: Tencent Cloud Static Website Hosting (Domestic Service, Recommended)

**Advantages**:
- ✅ Fast access in China
- ✅ Same platform as backend, easier management
- ✅ Git auto-deployment support
- ✅ Generous free tier

### Backend API Deployment

#### Option A: Railway (International Service)

**Advantages**:
- ✅ Simple configuration
- ✅ Auto-detects Node.js projects
- ⚠️ May be slow in China

#### Option B: Tencent Cloud CloudBase Run (Domestic Service, Recommended)

**Advantages**:
- ✅ Fast access in China
- ✅ Docker container support
- ✅ Can install system dependencies like FFmpeg
- ✅ Same platform as frontend

#### Option C: Alibaba Cloud SAE (Domestic Service)

**Advantages**:
- ✅ Fast access in China
- ✅ Docker container support
- ✅ Pay-as-you-go pricing

### Database Deployment

**LeanCloud MongoDB**:
- Free tier: 5GB storage, 30,000 API requests/day
- Configuration steps:
  1. Register LeanCloud account
  2. Create application
  3. Get App ID, App Key, Master Key
  4. Initialize database structure
  5. Configure domain whitelist

### File Storage Deployment

**Alibaba Cloud OSS**:
- Storage cost: ¥0.12/GB/month (standard storage)
- CDN traffic cost: ¥0.24/GB (domestic traffic)
- Configuration steps:
  1. Register Alibaba Cloud account
  2. Enable OSS service
  3. Create Bucket
  4. Configure CORS rules
  5. Get AccessKey ID and Secret

---

## 💰 Cost Estimation

### 300 Users Scenario

**Monthly Cost Estimate**:

| Service | Cost | Description |
|---------|------|-------------|
| **LeanCloud** | ¥0 | Free tier sufficient |
| **Alibaba Cloud OSS Storage** | ¥10-15/month | 72GB/year, standard storage |
| **CDN Traffic** | ¥100-120/month | 450GB/month |
| **Request Fees** | ¥5-10/month | OSS request fees |
| **Total** | **¥110-135/month** | First year |

**Cost Optimization Suggestions**:
- Use lifecycle rules: Convert to low-frequency access storage after 30 days (save 50% cost)
- Video compression: Compress videos before upload to reduce storage space
- CDN caching: Set reasonable cache time (30 days)

---

## 🔐 Security Features

### User Access Control

- 🔒 **Pre-registered users only**: Only users created through admin dashboard can use email OTP login
- 🚫 **Block unauthorized access**: Unregistered users receive "User does not exist, please contact administrator" message
- 👥 **Admin management**: All user accounts managed by administrators for security

### Security Workflow

1. **Admin creates user**: Add user account in admin dashboard
2. **User gets OTP**: Only registered users can request OTP verification code
3. **OTP verification login**: Complete login with 6-digit verification code
4. **Session management**: Secure token-based authentication system

---

## 🎯 Core Features

### User Features

1. **Video Browsing**: Swipe up/down to switch videos (TikTok-like interaction)
2. **Content Categories**: Technology, Arts & Humanities, Business
3. **User Interactions**: Like, Favorite, Share, Comment
4. **Personal Center**: User info management, publication list, review status
5. **Video Publishing**: Support video file upload, bilingual title input
6. **Login Authentication**: OTP email verification code login (only @ashleyfurniture.com domain)

### Admin Features

1. **Book Management**: Book info entry, AI content extraction processing
2. **Video Management**: Video review workflow, publication control
3. **User Management**: User data statistics, permission management
4. **Data Statistics**: Playback data analysis, user activity statistics

---

## 📝 Development Standards

- **Code Style**: ESLint + Prettier
- **Git Commits**: Conventional Commits
- **Branch Management**: Git Flow
- **Code Review**: Pull Request workflow

---

## 🔄 Content Upload Workflow

```
Book Input → AI Extract Highlights → AI Generate Script → TTS Generate Audio → Video Generation → Manual Review → Publish
```

---

## 📚 Related Documentation

- [README.md](./README.md) - Detailed project documentation
- [配置指南-LeanCloud+阿里云OSS.md](./配置指南-LeanCloud+阿里云OSS.md) - Configuration guide
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment guide
- [DATABASE_INIT_README.md](./DATABASE_INIT_README.md) - Database initialization guide

---

**Last Updated**: 2025-01-19
**Version**: 1.0.0

