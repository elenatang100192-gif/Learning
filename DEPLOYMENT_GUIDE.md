# Netlify 部署指南（单一仓库 Monorepo）

本指南将手把手教你如何将前端应用和后台管理界面部署到 Netlify，并配置 LeanCloud 和阿里云 OSS。

**本指南使用单一仓库（Monorepo）方案**，所有代码（前端、后台管理、后端 API）都在同一个 Git 仓库中。

## 📋 目录

1. [准备工作](#准备工作)
2. [部署前端应用](#部署前端应用)
3. [部署后台管理界面](#部署后台管理界面)
4. [配置后端 API](#配置后端-api)
5. [配置环境变量](#配置环境变量)
6. [配置 LeanCloud](#配置-leancloud)
7. [配置阿里云 OSS](#配置阿里云-oss)
8. [验证部署](#验证部署)
9. [常见问题](#常见问题)

---

## 准备工作

### 1. 注册 Netlify 账号

1. 访问 [https://www.netlify.com](https://www.netlify.com)
2. 点击 "Sign up" 注册账号（可以使用 GitHub 账号登录）
3. 完成邮箱验证

### 2. 准备代码仓库（单一仓库 Monorepo）

本指南使用单一仓库方案，将所有代码（前端、后台管理、后端 API）放在同一个 Git 仓库中：

```
Learning/
├── frontend/          # 前端应用
├── admin/            # 后台管理界面
└── admin API/        # 后端 API
```

**初始化仓库**:

```bash
# 进入项目根目录
cd /Users/et/Desktop/Learning

# 初始化 Git 仓库（如果还没有）
git init

# 添加所有文件
git add .

# 提交代码
git commit -m "Initial commit"

# 添加远程仓库（在 GitHub/GitLab/Bitbucket 创建仓库后）
git remote add origin <your-repo-url>

# 推送到远程仓库
git push -u origin main
```

**注意**: 
- 确保 `.env` 文件已添加到 `.gitignore`，不要提交敏感信息
- 如果仓库已存在，直接推送更新：`git push origin main`

### 3. 安装 Netlify CLI（可选，用于本地测试）

```bash
npm install -g netlify-cli
```

---

## 部署前端应用

### 步骤 1: 创建 Netlify 站点

1. 登录 Netlify Dashboard
2. 点击 "Add new site" → "Import an existing project"
3. 选择你的 Git 提供商（GitHub/GitLab/Bitbucket）
4. 选择包含所有代码的仓库（单一仓库方案）
5. 选择仓库后，Netlify 会自动检测项目

### 步骤 2: 配置构建设置

在 Netlify 的构建配置页面，设置以下参数：

**Base directory**: `frontend`（如果前端代码在 frontend 文件夹中）

**Build command**:
```bash
npm install && npm run build
```

**Publish directory**:
```
frontend/dist
```

**Node version**: `18.x` 或 `20.x`（在环境变量中设置）

### 步骤 3: 配置环境变量

在 Netlify Dashboard → Site settings → Environment variables 中添加：

```
VITE_LEANCLOUD_APP_ID=your_leancloud_app_id
VITE_LEANCLOUD_APP_KEY=your_leancloud_app_key
VITE_LEANCLOUD_SERVER_URL=your_leancloud_server_url
VITE_API_BASE_URL=https://your-backend-api.netlify.app/api
```

**注意**: `VITE_API_BASE_URL` 应该指向你的后端 API 地址（如果后端也部署在 Netlify Functions，或者使用其他后端服务）

### 步骤 4: 修改前端 API 配置

编辑 `frontend/src/app/services/leancloud.ts`，确保 API 基础 URL 使用环境变量：

```typescript
// 后端API配置（用于某些API调用）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
```

### 步骤 5: 创建 `netlify.toml` 配置文件

在 `frontend` 目录下创建 `netlify.toml`：

```toml
[build]
  command = "npm install && npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

### 步骤 6: 部署

1. 点击 "Deploy site"
2. Netlify 会自动开始构建和部署
3. 等待部署完成（通常需要 2-5 分钟）

### 步骤 7: 配置自定义域名（可选）

1. 在 Netlify Dashboard → Domain settings
2. 点击 "Add custom domain"
3. 输入你的域名（如 `app.yourdomain.com`）
4. 按照提示配置 DNS 记录

---

## 部署后台管理界面

### 步骤 1: 创建新的 Netlify 站点

1. 在 Netlify Dashboard 点击 "Add new site" → "Import an existing project"
2. 选择同一个 Git 仓库（与前端应用使用同一个仓库）
3. 选择仓库后，配置构建设置

### 步骤 2: 配置构建设置

**Base directory**: `admin`

**Build command**:
```bash
npm install && npm run build
```

**Publish directory**:
```
admin/dist
```

**Node version**: `18.x` 或 `20.x`

### 步骤 3: 配置环境变量

在 Netlify Dashboard → Site settings → Environment variables 中添加：

```
VITE_LEANCLOUD_APP_ID=your_leancloud_app_id
VITE_LEANCLOUD_APP_KEY=your_leancloud_app_key
VITE_LEANCLOUD_SERVER_URL=your_leancloud_server_url
VITE_API_BASE_URL=https://your-backend-api.netlify.app/api
```

### 步骤 4: 创建 `netlify.toml` 配置文件

在 `admin` 目录下创建 `netlify.toml`：

```toml
[build]
  command = "npm install && npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

### 步骤 5: 部署

1. 点击 "Deploy site"
2. 等待部署完成

---

## 配置后端 API

Netlify 支持通过 Netlify Functions 部署 Node.js 后端，但你的后端使用了 `fluent-ffmpeg`、`canvas`、`pdfjs-dist` 等需要系统依赖的包，这些在 Netlify Functions 环境中可能无法运行。

### 方案 A: 使用 Netlify Functions（仅适用于简单 API）

如果你的后端不需要 FFmpeg、OCR 等功能，可以尝试：

1. 在项目根目录创建 `netlify/functions/api.js`
2. 将 Express 路由转换为 Netlify Functions 格式
3. 配置 `netlify.toml`：

```toml
[build]
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api"
  status = 200
```

### 方案 B: 使用其他后端托管服务（推荐）

由于你的后端需要 FFmpeg 等系统依赖，建议使用以下服务：

#### 选项 1: Railway（推荐）

1. 访问 [https://railway.app](https://railway.app)
2. 使用 GitHub 登录
3. 点击 "New Project" → "Deploy from GitHub repo"
4. 选择包含所有代码的仓库（与前端和后台管理使用同一个仓库）
5. 在项目设置中，设置 **Root Directory** 为 `admin API`
6. 配置环境变量（见下方）
7. Railway 会自动检测 Node.js 项目并部署

**重要**: 由于使用单一仓库，Railway 需要知道后端代码在哪个子目录，所以必须设置 Root Directory 为 `admin API`。

#### 选项 2: Render

1. 访问 [https://render.com](https://render.com)
2. 注册账号
3. 点击 "New" → "Web Service"
4. 连接 GitHub 仓库（选择包含所有代码的仓库）
5. 配置：
   - **Name**: `video-app-api`
   - **Root Directory**: `admin API`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: `Node`
   - **Node Version**: `18` 或 `20`

#### 选项 3: Heroku

1. 访问 [https://www.heroku.com](https://www.heroku.com)
2. 注册账号
3. 安装 Heroku CLI
4. 在 `admin API` 目录下创建 `Procfile`：

```
web: node server.js
```

5. 部署（由于使用单一仓库，需要指定子目录）：

```bash
# 方法1: 使用 git subtree（推荐）
cd /Users/et/Desktop/Learning
git subtree push --prefix "admin API" heroku main

# 方法2: 使用 git subtree 强制推送（如果遇到冲突）
git push heroku `git subtree split --prefix "admin API" main`:main --force
```

**注意**: Heroku 对单一仓库的支持不如 Railway 和 Render 方便，建议优先使用 Railway 或 Render。

---

## 配置环境变量

### 后端环境变量

在后端托管服务（Railway/Render/Heroku）中配置以下环境变量：

#### LeanCloud 配置

```
LEANCLOUD_APP_ID=your_leancloud_app_id
LEANCLOUD_APP_KEY=your_leancloud_app_key
LEANCLOUD_MASTER_KEY=your_leancloud_master_key
LEANCLOUD_SERVER_URL=your_leancloud_server_url
```

#### 阿里云 OSS 配置

```
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your_oss_access_key_id
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_BUCKET=your_bucket_name
```

#### API Keys 配置

```
DEEPSEEK_API_KEY=your_deepseek_api_key
DASHSCOPE_API_KEY=your_dashscope_api_key
ARK_API_KEY=your_doubao_api_key
DOUBAO_API_KEY=your_doubao_api_key
DOUBAO_MODEL_ID=your_doubao_model_id
TENCENT_SECRET_ID=your_tencent_secret_id
TENCENT_SECRET_KEY=your_tencent_secret_key
```

#### 服务器配置

```
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-app.netlify.app
ADMIN_URL=https://your-admin-app.netlify.app
```

**注意**: `FRONTEND_URL` 和 `ADMIN_URL` 用于 CORS 配置，确保前端和后台管理可以访问后端 API。如果不设置，后端会自动允许所有 `.netlify.app` 域名的请求。

#### 服务器配置

```
PORT=3001
NODE_ENV=production
```

### 前端环境变量（Netlify）

在 Netlify Dashboard → Site settings → Environment variables 中配置：

#### 前端应用（frontend）

```
VITE_LEANCLOUD_APP_ID=your_leancloud_app_id
VITE_LEANCLOUD_APP_KEY=your_leancloud_app_key
VITE_LEANCLOUD_SERVER_URL=your_leancloud_server_url
VITE_API_BASE_URL=https://your-backend-api.railway.app/api
```

#### 后台管理界面（admin）

```
VITE_LEANCLOUD_APP_ID=your_leancloud_app_id
VITE_LEANCLOUD_APP_KEY=your_leancloud_app_key
VITE_LEANCLOUD_SERVER_URL=your_leancloud_server_url
VITE_API_BASE_URL=https://your-backend-api.railway.app/api
```

---

## 配置 LeanCloud

### 步骤 1: 创建 LeanCloud 应用

1. 访问 [https://console.leancloud.cn](https://console.leancloud.cn)
2. 登录或注册账号
3. 点击 "创建应用"
4. 填写应用名称（如：`VidBrain Video App`）
5. 选择开发版（免费）或专业版（付费）

### 步骤 2: 获取应用凭证

1. 进入应用 → **设置** → **应用凭证**
2. 记录以下信息：
   - **App ID**
   - **App Key**
   - **Master Key**（需要点击"显示"才能看到）
   - **Server URL**（REST API 服务器地址）

### 步骤 3: 配置域名白名单（重要）

1. 进入应用 → **设置** → **安全中心**
2. 在 **Web 安全域名** 中添加：
   - 前端应用域名：`https://your-frontend-app.netlify.app`
   - 后台管理域名：`https://your-admin-app.netlify.app`
   - 后端 API 域名：`https://your-backend-api.railway.app`

### 步骤 4: 初始化数据库结构

1. 使用项目中的初始化脚本：

```bash
cd /Users/et/Desktop/Learning
node scripts/init-database.js
```

2. 或使用浏览器打开 `init-leancloud-database.html` 文件

3. 确保创建了以下数据表：
   - `Category`（分类）
   - `Book`（书籍）
   - `ExtractedContent`（提取的内容）
   - `Video`（视频）
   - `User`（用户）
   - `Comment`（评论）
   - `Like`（点赞）
   - `Favorite`（收藏）
   - `Follow`（关注）

---

## 配置阿里云 OSS

### 步骤 1: 注册阿里云账号

1. 访问 [https://www.aliyun.com](https://www.aliyun.com)
2. 注册/登录账号
3. 完成实名认证（必需）

### 步骤 2: 开通 OSS 服务

1. 进入 **产品** → **对象存储 OSS**
2. 点击 "立即开通"
3. 选择计费方式：**按量付费**（推荐）

### 步骤 3: 创建存储桶（Bucket）

1. 进入 **OSS 控制台** → **Bucket 列表**
2. 点击 "创建 Bucket"
3. 配置信息：
   - **Bucket 名称**: `knowledge-video-app`（全局唯一，建议加随机后缀）
   - **地域**: 选择离用户最近的地域（如：华东1-杭州 `oss-cn-hangzhou`）
   - **存储类型**: **标准存储**
   - **读写权限**: **公共读**（视频需要公开访问）
   - **服务端加密**: 可选
   - **版本控制**: 关闭（节省成本）

4. 点击 "确定" 创建

### 步骤 4: 配置跨域访问（CORS）

1. 进入 Bucket → **权限管理** → **跨域设置**
2. 点击 "创建规则"
3. 配置：
   - **来源**: `*`（或指定域名：`https://your-frontend-app.netlify.app`）
   - **允许 Methods**: `GET, HEAD, POST, PUT, DELETE`
   - **允许 Headers**: `*`
   - **暴露 Headers**: `ETag, x-oss-request-id`
   - **缓存时间**: `3600`

### 步骤 5: 获取访问密钥

1. 点击右上角头像 → **AccessKey 管理**
2. 点击 "创建 AccessKey"
3. **重要**: 立即保存 AccessKey ID 和 AccessKey Secret（只显示一次）

### 步骤 6: 配置生命周期规则（可选，节省成本）

1. 进入 Bucket → **数据管理** → **生命周期**
2. 点击 "创建规则"
3. 配置：
   - **规则名称**: `archive-old-videos`
   - **前缀**: `video-generation/`
   - **策略**: 30天后转为**低频访问存储**（节省约50%存储成本）

---

## 验证部署

### 1. 验证前端应用

1. 访问前端应用的 Netlify URL（如：`https://your-frontend-app.netlify.app`）
2. 检查：
   - ✅ 页面正常加载
   - ✅ 可以登录/注册
   - ✅ 可以浏览视频
   - ✅ 可以发布视频

### 2. 验证后台管理界面

1. 访问后台管理的 Netlify URL（如：`https://your-admin-app.netlify.app`）
2. 检查：
   - ✅ 页面正常加载
   - ✅ 可以登录
   - ✅ 可以管理书籍
   - ✅ 可以管理视频
   - ✅ 可以管理用户

### 3. 验证后端 API

1. 访问后端 API 的健康检查端点（如果配置了）：
   ```
   https://your-backend-api.railway.app/api/health
   ```
2. 检查：
   - ✅ API 正常响应
   - ✅ 可以上传文件
   - ✅ 可以生成视频

### 4. 验证 LeanCloud 连接

1. 在前端应用中尝试登录
2. 检查 LeanCloud 控制台 → **存储** → **User** 表是否有新用户
3. 检查是否有错误日志

### 5. 验证阿里云 OSS

1. 在后台管理中上传一个视频
2. 检查 OSS 控制台 → **文件管理** 是否有新文件
3. 检查视频 URL 是否可以正常访问

---

## 常见问题

### Q1: Netlify 构建失败

**问题**: 构建时出现错误

**解决方案**:
1. 检查 Node 版本是否匹配（在 `netlify.toml` 中设置 `NODE_VERSION = "18"`）
2. 检查 `package.json` 中的依赖是否正确
3. 查看 Netlify 构建日志，找到具体错误信息
4. 确保所有环境变量都已正确配置

### Q2: 前端无法连接到后端 API

**问题**: 前端显示 "无法连接到后端服务器"

**解决方案**:
1. 检查 `VITE_API_BASE_URL` 环境变量是否正确
2. 检查后端 API 是否正常运行
3. 检查 CORS 配置是否正确
4. 检查后端是否允许来自 Netlify 域名的请求

### Q3: LeanCloud 报错 "域名不在白名单中"

**问题**: 前端调用 LeanCloud API 时出现域名错误

**解决方案**:
1. 进入 LeanCloud 控制台 → **设置** → **安全中心**
2. 在 **Web 安全域名** 中添加你的 Netlify 域名
3. 格式：`https://your-app.netlify.app`（不要加斜杠）

### Q4: 视频上传失败

**问题**: 上传视频时出现错误

**解决方案**:
1. 检查 OSS 配置是否正确（AccessKey ID、Secret、Bucket 名称）
2. 检查 OSS Bucket 的权限是否为"公共读"
3. 检查 CORS 配置是否正确
4. 检查文件大小是否超过限制（Netlify 默认限制为 6MB，大文件需要直接上传到 OSS）

### Q5: 后端 API 无法使用 FFmpeg

**问题**: 后端部署后无法使用 FFmpeg

**解决方案**:
1. 确保后端托管服务支持安装系统依赖（Railway/Render 支持）
2. 在 `package.json` 中添加构建脚本安装 FFmpeg
3. 或使用 Docker 镜像，在 Dockerfile 中安装 FFmpeg

### Q6: 环境变量不生效

**问题**: 设置了环境变量但应用无法读取

**解决方案**:
1. **前端**: 确保环境变量以 `VITE_` 开头
2. **后端**: 确保环境变量名称正确（区分大小写）
3. 重新部署应用（环境变量更改后需要重新部署）
4. 检查环境变量是否在正确的环境中设置（Production/Branch）

### Q7: 构建时间过长

**问题**: Netlify 构建超过 15 分钟超时

**解决方案**:
1. 优化依赖安装（使用 `npm ci` 而不是 `npm install`）
2. 启用 Netlify Build Plugins 缓存
3. 在 `netlify.toml` 中配置缓存：

```toml
[build]
  command = "npm ci && npm run build"
  publish = "dist"

[[plugins]]
  package = "@netlify/plugin-cache"
```

### Q8: 视频生成功能不工作

**问题**: 视频生成失败或超时

**解决方案**:
1. 检查所有 API Keys 是否正确配置（Deepseek、Doubao、腾讯云 TTS）
2. 检查后端日志，查看具体错误信息
3. 确保后端有足够的资源（内存、CPU）
4. 考虑增加后端服务的资源配额

---

## 部署检查清单

### 前端应用部署检查

- [ ] Netlify 站点已创建
- [ ] 构建命令配置正确
- [ ] 发布目录配置正确
- [ ] 环境变量已配置
- [ ] `netlify.toml` 文件已创建
- [ ] 自定义域名已配置（可选）
- [ ] 页面可以正常访问
- [ ] LeanCloud 连接正常
- [ ] API 调用正常

### 后台管理界面部署检查

- [ ] Netlify 站点已创建
- [ ] 构建命令配置正确
- [ ] 发布目录配置正确
- [ ] 环境变量已配置
- [ ] `netlify.toml` 文件已创建
- [ ] 自定义域名已配置（可选）
- [ ] 页面可以正常访问
- [ ] 可以登录后台
- [ ] 可以管理数据

### 后端 API 部署检查

- [ ] 后端服务已部署（Railway/Render/Heroku）
- [ ] 所有环境变量已配置
- [ ] API 可以正常访问
- [ ] CORS 配置正确
- [ ] FFmpeg 可以正常使用（如果使用）
- [ ] 文件上传功能正常
- [ ] 视频生成功能正常

### LeanCloud 配置检查

- [ ] LeanCloud 应用已创建
- [ ] 应用凭证已获取
- [ ] 域名白名单已配置
- [ ] 数据库结构已初始化
- [ ] 测试数据已创建

### 阿里云 OSS 配置检查

- [ ] OSS 服务已开通
- [ ] Bucket 已创建
- [ ] CORS 规则已配置
- [ ] AccessKey 已获取
- [ ] 文件上传功能正常
- [ ] 文件可以正常访问

---

## 后续优化

### 1. 性能优化

- 启用 Netlify CDN 缓存
- 配置图片和视频的 CDN 加速
- 使用 Netlify Image Optimization
- 启用 Gzip/Brotli 压缩

### 2. 安全优化

- 配置 HTTPS（Netlify 自动提供）
- 设置安全响应头
- 定期更新依赖包
- 使用环境变量管理敏感信息

### 3. 监控和日志

- 配置 Netlify Analytics（付费功能）
- 使用 Sentry 监控错误
- 配置日志收集服务
- 设置告警通知

### 4. CI/CD 优化

- 配置自动部署（推送到 main 分支自动部署）
- 配置预览部署（Pull Request 自动部署预览）
- 配置部署通知（Slack/Email）

---

## 总结

完成以上步骤后，你的应用应该已经成功部署到 Netlify，并配置好了 LeanCloud 和阿里云 OSS。如果遇到问题，请参考常见问题部分或查看 Netlify 的官方文档。

**重要提示**:
- 定期备份 LeanCloud 数据库
- 监控 OSS 存储使用量和费用
- 定期更新依赖包以修复安全漏洞
- 保护 API Keys 和 AccessKeys，不要提交到 Git 仓库

祝部署顺利！🎉

