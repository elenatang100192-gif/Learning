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

### 方案选择

**方案 A: Netlify（国外服务，推荐用于海外用户）**
- ✅ 配置简单，自动化程度高
- ✅ 免费额度充足
- ⚠️ 国内访问可能较慢

**方案 B: 腾讯云静态网站托管（国内服务，推荐用于国内用户）**
- ✅ 国内访问速度快
- ✅ 与腾讯云托管后端在同一平台，管理方便
- ✅ 支持 Git 自动部署
- ✅ 有免费额度
- ✅ 与后端服务集成方便

**本指南同时提供两种方案的部署步骤。**

---

### 方案 A: 使用 Netlify 部署前端应用

#### 步骤 1: 创建 Netlify 站点

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

在 Netlify Dashboard → Site settings → Environment variables 中添加以下环境变量：

#### 环境变量列表

需要添加以下 4 个环境变量：

1. **VITE_LEANCLOUD_APP_ID**
2. **VITE_LEANCLOUD_APP_KEY**
3. **VITE_LEANCLOUD_SERVER_URL**
4. **VITE_API_BASE_URL**

#### 详细填写步骤

对于每个环境变量，按照以下步骤填写：

**1. 点击 "Add a variable" 或 "New environment variable" 按钮**

**2. 填写 Key（环境变量名称）**
   - 在 **Key** 输入框中输入环境变量名称（例如：`VITE_LEANCLOUD_APP_ID`）
   - 注意：不要包含 `=` 号，只输入变量名

**3. 配置 Secret（敏感值）**
   - ✅ **勾选** "Contains secret values" 复选框（对于包含密钥的环境变量）
   - 需要勾选 Secret 的变量：
     - `VITE_LEANCLOUD_APP_KEY`（包含密钥）
     - `VITE_LEANCLOUD_APP_ID`（可选，建议勾选）
   - 不需要勾选 Secret 的变量：
     - `VITE_LEANCLOUD_SERVER_URL`（URL 地址，非敏感）
     - `VITE_API_BASE_URL`（URL 地址，非敏感）

**4. 选择 Scopes（作用域）**
   - 选择 **"All scopes"**（默认选项）
   - 这样环境变量会在所有部署上下文中可用（构建、函数、后处理等）

**5. 填写 Values（值）**
   - 选择 **"Same value for all deploy contexts"**（所有部署上下文使用相同值）
   - 在输入框中输入对应的值（见下方实际值）

**6. 点击 "Create variable" 按钮保存**

#### 实际值（从 SENSITIVE_INFO.md 获取）

```
VITE_LEANCLOUD_APP_ID=RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz
VITE_LEANCLOUD_APP_KEY=1w0cQLBZIaJ32tjaU7RkDu3n
VITE_LEANCLOUD_SERVER_URL=https://rdecdltb.lc-cn-n1-shared.com
VITE_API_BASE_URL=https://your-backend-api.railway.app/api
```

**⚠️ 重要提示**:
- `VITE_API_BASE_URL` 需要替换为你的实际后端 API 地址（如果使用 Railway，格式为：`https://your-app-name.railway.app/api`）
- 如果后端部署在其他服务，请相应修改 URL
- 所有包含密钥的环境变量都应该勾选 "Contains secret values"

#### 填写示例

**示例 1: VITE_LEANCLOUD_APP_ID**
- **Key**: `VITE_LEANCLOUD_APP_ID`
- **Contains secret values**: ✅ 勾选（建议）
- **Scopes**: All scopes
- **Values**: Same value for all deploy contexts
- **Value**: `RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz`

**示例 2: VITE_LEANCLOUD_APP_KEY**
- **Key**: `VITE_LEANCLOUD_APP_KEY`
- **Contains secret values**: ✅ **必须勾选**（这是密钥）
- **Scopes**: All scopes
- **Values**: Same value for all deploy contexts
- **Value**: `1w0cQLBZIaJ32tjaU7RkDu3n`

**示例 3: VITE_LEANCLOUD_SERVER_URL**
- **Key**: `VITE_LEANCLOUD_SERVER_URL`
- **Contains secret values**: ❌ 不勾选（URL 地址）
- **Scopes**: All scopes
- **Values**: Same value for all deploy contexts
- **Value**: `https://rdecdltb.lc-cn-n1-shared.com`

**示例 4: VITE_API_BASE_URL**
- **Key**: `VITE_API_BASE_URL`
- **Contains secret values**: ❌ 不勾选（URL 地址）
- **Scopes**: All scopes
- **Values**: Same value for all deploy contexts
- **Value**: `https://your-backend-api.railway.app/api`（替换为实际后端地址）

**注意**: `VITE_API_BASE_URL` 应该指向你的后端 API 地址（如果后端部署在 Railway，格式为：`https://your-app-name.railway.app/api`）

### 步骤 4: 验证前端 API 配置（已自动配置）

**✅ 好消息**：前端代码已经配置好了环境变量支持，无需手动修改！

前端文件 `frontend/src/app/services/leancloud.ts` 已经正确配置：

```typescript
// 后端API配置（支持环境变量）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
```

**说明**：
- ✅ 代码已经使用 `import.meta.env.VITE_API_BASE_URL` 读取环境变量
- ✅ 如果环境变量未设置，会使用默认值 `http://localhost:3001/api`（本地开发）
- ✅ 部署到 Netlify 后，会自动使用你在 Netlify 中配置的 `VITE_API_BASE_URL` 环境变量

**验证步骤**（可选）：
1. 打开文件 `frontend/src/app/services/leancloud.ts`
2. 确认第 2 行代码为：`const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';`
3. 如果代码正确，则无需任何修改

**⚠️ 重要提示**：
- 确保在 Netlify 中正确配置了 `VITE_API_BASE_URL` 环境变量（步骤 3）
- 环境变量的值应该是你的后端 API 地址，例如：`https://your-backend-api.railway.app/api`

### 步骤 5: 创建 `netlify.toml` 配置文件

`netlify.toml` 是 Netlify 的配置文件，用于告诉 Netlify 如何构建和部署你的应用。

#### 为什么需要这个文件？

虽然可以在 Netlify Dashboard 中手动配置构建设置，但使用 `netlify.toml` 文件有以下优势：
- ✅ **版本控制**：配置随代码一起管理，团队成员都能看到
- ✅ **一致性**：确保本地和部署环境使用相同的配置
- ✅ **自动化**：每次部署自动应用配置，无需手动设置

#### 操作步骤

**1. 创建文件**

在 `frontend` 目录下创建新文件 `netlify.toml`：

**方法 A: 使用代码编辑器**
- 在代码编辑器中打开 `frontend` 目录
- 创建新文件，命名为 `netlify.toml`（注意：文件名必须完全一致，包括扩展名 `.toml`）

**方法 B: 使用命令行**
```bash
cd /Users/et/Desktop/Learning/frontend
touch netlify.toml
```

**2. 添加配置内容**

将以下内容复制到 `netlify.toml` 文件中：

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

**3. 保存文件**

保存文件后，确保文件位于 `frontend/netlify.toml`（与 `package.json` 同级目录）

#### 配置项详细说明

**1. `[build]` 部分 - 构建配置**

```toml
[build]
  command = "npm install && npm run build"
  publish = "dist"
```

- **`command`**: 构建命令
  - `npm install`: 安装依赖包
  - `npm run build`: 执行构建（对应 `package.json` 中的 `build` 脚本）
  - Netlify 会按顺序执行这些命令

- **`publish`**: 发布目录
  - `dist`: Vite 构建后的输出目录
  - Netlify 会将此目录中的文件部署到 CDN

**2. `[[redirects]]` 部分 - 路由重定向**

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- **作用**: 配置单页应用（SPA）的路由
- **`from = "/*"`**: 匹配所有路径（`*` 是通配符）
- **`to = "/index.html"`**: 重定向到 `index.html`
- **`status = 200`**: HTTP 状态码 200（成功），而不是 301/302（重定向）
  - 这样浏览器地址栏不会改变，用户体验更好
  - 对于 React Router 等前端路由库是必需的

**为什么需要这个？**
- React 应用使用前端路由（如 `/home`, `/profile` 等）
- 当用户直接访问这些 URL 时，服务器需要返回 `index.html`
- 然后由 React Router 处理路由，显示正确的页面

**3. `[build.environment]` 部分 - 构建环境变量**

```toml
[build.environment]
  NODE_VERSION = "18"
```

- **作用**: 指定构建时使用的 Node.js 版本
- **`NODE_VERSION = "18"`**: 使用 Node.js 18.x 版本
- 确保构建环境与开发环境一致，避免版本差异导致的问题

#### 验证配置

创建文件后，可以通过以下方式验证：

**1. 检查文件位置**
```bash
cd /Users/et/Desktop/Learning/frontend
ls -la netlify.toml
```

**2. 检查文件内容**
```bash
cat netlify.toml
```

**3. 提交到 Git**
```bash
cd /Users/et/Desktop/Learning
git add frontend/netlify.toml
git commit -m "Add netlify.toml configuration for frontend"
git push
```

#### 注意事项

- ✅ 文件必须命名为 `netlify.toml`（小写，扩展名 `.toml`）
- ✅ 文件必须放在 `frontend` 目录的根目录下（与 `package.json` 同级）
- ✅ TOML 格式对缩进敏感，使用 2 个空格缩进
- ✅ `[[redirects]]` 中的双括号 `[[ ]]` 表示数组，用于定义多个重定向规则

#### 常见问题

**Q: 如果我不创建这个文件会怎样？**
A: Netlify 会使用默认配置，但可能无法正确处理前端路由。建议创建此文件以确保正确部署。

**Q: 可以修改 `publish` 目录吗？**
A: 可以，但需要确保与 `vite.config.ts` 中的 `build.outDir` 配置一致。默认情况下，Vite 输出到 `dist` 目录。

**Q: Node 版本可以改为其他版本吗？**
A: 可以，但建议使用 Node.js 18 或 20（LTS 版本）。确保与你的开发环境一致。

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

在 Netlify Dashboard → Site settings → Environment variables 中添加以下环境变量：

#### 环境变量列表

需要添加以下 4 个环境变量：

1. **VITE_LEANCLOUD_APP_ID**
2. **VITE_LEANCLOUD_APP_KEY**
3. **VITE_LEANCLOUD_SERVER_URL**
4. **VITE_API_BASE_URL**

#### 详细填写步骤

对于每个环境变量，按照以下步骤填写：

**1. 点击 "Add a variable" 或 "New environment variable" 按钮**

**2. 填写 Key（环境变量名称）**
   - 在 **Key** 输入框中输入环境变量名称（例如：`VITE_LEANCLOUD_APP_ID`）
   - 注意：不要包含 `=` 号，只输入变量名

**3. 配置 Secret（敏感值）**
   - ✅ **勾选** "Contains secret values" 复选框（对于包含密钥的环境变量）
   - 需要勾选 Secret 的变量：
     - `VITE_LEANCLOUD_APP_KEY`（包含密钥）
     - `VITE_LEANCLOUD_APP_ID`（可选，建议勾选）
   - 不需要勾选 Secret 的变量：
     - `VITE_LEANCLOUD_SERVER_URL`（URL 地址，非敏感）
     - `VITE_API_BASE_URL`（URL 地址，非敏感）

**4. 选择 Scopes（作用域）**
   - 选择 **"All scopes"**（默认选项）
   - 这样环境变量会在所有部署上下文中可用（构建、函数、后处理等）

**5. 填写 Values（值）**
   - 选择 **"Same value for all deploy contexts"**（所有部署上下文使用相同值）
   - 在输入框中输入对应的值（见下方实际值）

**6. 点击 "Create variable" 按钮保存**

#### 实际值（从 SENSITIVE_INFO.md 获取）

```
VITE_LEANCLOUD_APP_ID=RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz
VITE_LEANCLOUD_APP_KEY=1w0cQLBZIaJ32tjaU7RkDu3n
VITE_LEANCLOUD_SERVER_URL=https://rdecdltb.lc-cn-n1-shared.com
VITE_API_BASE_URL=https://your-backend-api.railway.app/api
```

**⚠️ 重要提示**:
- `VITE_API_BASE_URL` 需要替换为你的实际后端 API 地址（如果使用 Railway，格式为：`https://your-app-name.railway.app/api`）
- 如果后端部署在其他服务，请相应修改 URL
- 所有包含密钥的环境变量都应该勾选 "Contains secret values"

#### 填写示例

**示例 1: VITE_LEANCLOUD_APP_ID**
- **Key**: `VITE_LEANCLOUD_APP_ID`
- **Contains secret values**: ✅ 勾选（建议）
- **Scopes**: All scopes
- **Values**: Same value for all deploy contexts
- **Value**: `RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz`

**示例 2: VITE_LEANCLOUD_APP_KEY**
- **Key**: `VITE_LEANCLOUD_APP_KEY`
- **Contains secret values**: ✅ **必须勾选**（这是密钥）
- **Scopes**: All scopes
- **Values**: Same value for all deploy contexts
- **Value**: `1w0cQLBZIaJ32tjaU7RkDu3n`

**示例 3: VITE_LEANCLOUD_SERVER_URL**
- **Key**: `VITE_LEANCLOUD_SERVER_URL`
- **Contains secret values**: ❌ 不勾选（URL 地址）
- **Scopes**: All scopes
- **Values**: Same value for all deploy contexts
- **Value**: `https://rdecdltb.lc-cn-n1-shared.com`

**示例 4: VITE_API_BASE_URL**
- **Key**: `VITE_API_BASE_URL`
- **Contains secret values**: ❌ 不勾选（URL 地址）
- **Scopes**: All scopes
- **Values**: Same value for all deploy contexts
- **Value**: `https://your-backend-api.railway.app/api`（替换为实际后端地址）

**注意**: `VITE_API_BASE_URL` 应该指向你的后端 API 地址（如果后端部署在 Railway，格式为：`https://your-app-name.railway.app/api`）

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

### 方案 B: 使用腾讯云静态网站托管部署前端和后台管理界面（推荐，国内服务）

腾讯云静态网站托管（CloudBase Hosting）是腾讯云提供的静态网站托管服务，类似于 Netlify，但更适合国内用户。

#### 优势

- ✅ **国内访问速度快**：服务器在国内，访问速度比 Netlify 快
- ✅ **与后端集成方便**：与腾讯云托管后端在同一平台，管理更方便
- ✅ **Git 自动部署**：支持 GitHub/GitLab 自动部署
- ✅ **免费额度**：有免费额度，适合小型项目
- ✅ **HTTPS 自动配置**：自动配置 SSL 证书
- ✅ **CDN 加速**：自动配置 CDN，提升访问速度

#### 部署前端应用

**步骤 1: 开通静态网站托管**

1. 登录腾讯云控制台
2. 进入云开发控制台（与后端部署使用同一个环境）
3. 点击左侧菜单 "静态网站托管"
4. 点击 "开通静态网站托管"
5. 等待开通完成（通常几秒钟）

**步骤 2: 创建前端应用站点**

1. 在静态网站托管页面，点击 "新建站点"
2. 填写站点信息：
   - **站点名称**: `frontend`（自定义）
   - **站点描述**: `视频应用前端界面`（可选）

**步骤 3: 配置 Git 仓库**

1. 在站点配置页面，找到 "Git 仓库" 部分
2. 点击 "授权 GitHub"（如果还没有授权）
   - 会跳转到 GitHub 授权页面
   - 点击 "Authorize" 授权
   - 授权成功后返回配置页面
3. 选择仓库：
   - **仓库**: 选择 `elenatang100192-gif/Learning`
   - **分支**: 选择 `main`
4. **启用自动部署**: 打开开关（推荐）
   - 这样每次推送到 `main` 分支时，会自动触发部署

**步骤 4: 配置构建设置**

**项目框架说明**:
- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 6.x
- **样式框架**: Tailwind CSS 4.x
- **UI组件库**: Radix UI + shadcn/ui
- **项目类型**: 单页应用（SPA - Single Page Application）

**配置步骤**:

1. **代码目录**: 输入 `frontend`
   - 这是代码仓库中前端代码所在的目录
   - CloudBase 会在这个目录下查找 `package.json` 和构建文件

2. **构建命令**: 输入 `npm install && npm run build`
   - `npm install`: 安装项目依赖（React、Vite、Tailwind CSS 等）
   - `npm run build`: 执行 Vite 构建命令，将 React + TypeScript 代码编译打包
   - 构建完成后会在 `dist` 目录生成静态文件（HTML、CSS、JS）

3. **输出目录**: 输入 `dist`
   - Vite 构建后的输出目录
   - 包含 `index.html` 和所有静态资源文件
   - CloudBase 会将此目录中的文件部署到 CDN

**步骤 5: 配置环境变量**

1. 展开 "环境变量" 部分
2. 点击 "添加环境变量"
3. 添加以下环境变量（从 `SENSITIVE_INFO.md` 获取实际值）：

```
VITE_LEANCLOUD_APP_ID=RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz
VITE_LEANCLOUD_APP_KEY=1w0cQLBZIaJ32tjaU7RkDu3n
VITE_LEANCLOUD_SERVER_URL=https://rdecdltb.lc-cn-n1-shared.com
VITE_API_BASE_URL=https://your-service-id.region.app.tcloudbase.com/api
```

**⚠️ 重要**: `VITE_API_BASE_URL` 需要替换为你的腾讯云托管后端地址（格式：`https://your-service-id.region.app.tcloudbase.com/api`）

**步骤 6: 部署站点**

1. 检查所有配置是否正确
2. 点击 "提交" 或 "部署"
3. CloudBase 会自动：
   - 从 GitHub 拉取代码
   - 安装依赖
   - 执行构建命令
   - 部署到 CDN
4. 等待部署完成（通常需要 2-3 分钟）

**步骤 7: 获取访问地址**

1. 部署完成后，在站点列表中点击你的站点
2. 在站点详情页面，找到 "访问地址"
3. 复制访问地址，格式类似：`https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-frontend/`
4. 这就是你的前端应用地址

**⚠️ 重要：如果部署在子路径下**

如果 CloudBase 将你的站点部署在子路径下（如 `/Video-frontend/`），需要配置 `base` 路径：

1. 在 `frontend/vite.config.ts` 中添加 `base` 配置：
   ```typescript
   export default defineConfig({
     // ... 其他配置
     base: '/Video-frontend/', // 替换为你的实际子路径
   })
   ```

2. 重新构建并部署

**注意**: `base` 路径必须与 CloudBase 部署的实际路径一致（包括前后的斜杠）。

#### 部署后台管理界面

**⚠️ 重要提示**: 
- **静态网站托管只能部署前端静态文件**（HTML、CSS、JS）
- **后端 API 必须使用云托管（CloudBase Run）部署**，不能使用静态网站托管
- 如果你看到这个错误，说明你误将后端部署到了静态网站托管

**正确的部署方式**:
- ✅ **前端应用** → 静态网站托管
- ✅ **后台管理界面** → 静态网站托管  
- ✅ **后端 API** → 云托管（CloudBase Run）

**步骤 1: 创建后台管理站点**

1. 在静态网站托管页面，点击 "新建站点"
2. 填写站点信息：
   - **站点名称**: `admin`（自定义）
   - **站点描述**: `视频应用后台管理界面`（可选）

**步骤 2-7: 配置步骤与前端应用相同**

**项目框架说明**（与前端应用相同）:
- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 6.x
- **样式框架**: Tailwind CSS 4.x
- **UI组件库**: Radix UI + shadcn/ui
- **项目类型**: 单页应用（SPA - Single Page Application）

**配置步骤**:

- **代码目录**: `admin`
  - 这是代码仓库中后台管理代码所在的目录
- **构建命令**: `npm install && npm run build`
  - 安装依赖并执行 Vite 构建
- **输出目录**: `dist`
  - Vite 构建后的输出目录
- **环境变量**: 与前端应用相同（包括 `VITE_API_BASE_URL`）

**⚠️ 重要：如果部署在子路径下**

如果 CloudBase 将你的站点部署在子路径下（如 `/Video-admin/`），需要配置 `base` 路径：

1. 在 `admin/vite.config.ts` 中添加 `base` 配置：
   ```typescript
   export default defineConfig({
     // ... 其他配置
     base: '/Video-admin/', // 替换为你的实际子路径
   })
   ```

2. 重新构建并部署

**注意**: `base` 路径必须与 CloudBase 部署的实际路径一致（包括前后的斜杠）。

**步骤 8: 获取访问地址**

部署完成后，获取后台管理的访问地址，格式类似：`https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-admin/`

#### 配置自定义域名（可选）

1. 在站点详情页面，点击 "自定义域名"
2. 添加你的域名（如：`app.yourdomain.com`）
3. 按照提示配置 DNS 记录
4. 等待 SSL 证书自动配置完成（通常几分钟）

#### 费用说明

- **免费额度**：
  - 存储空间：5GB
  - 流量：5GB/月
  - 请求次数：100万次/月
- **超出后按量付费**，价格较低

#### 文档

- 腾讯云静态网站托管文档：https://cloud.tencent.com/document/product/1210

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

#### 选项 1: Railway（推荐，国外服务）

1. 访问 [https://railway.app](https://railway.app)
2. 使用 GitHub 登录
3. 点击 "New Project" → "Deploy from GitHub repo"
4. 选择包含所有代码的仓库（与前端和后台管理使用同一个仓库）
5. 在项目设置中，设置 **Root Directory** 为 `admin API`
6. 配置环境变量（见下方）
7. Railway 会自动检测 Node.js 项目并部署

**重要**: 由于使用单一仓库，Railway 需要知道后端代码在哪个子目录，所以必须设置 Root Directory 为 `admin API`。

**⚠️ 注意**: Railway 是国外服务，在中国大陆访问可能较慢或不稳定。

#### 选项 1A: 阿里云 Serverless 应用引擎 SAE（推荐，国内服务）

**优势**:
- ✅ 国内服务，访问速度快
- ✅ 支持 Docker 容器，可以安装 FFmpeg 等系统依赖
- ✅ 按量付费，成本可控
- ✅ 支持 Git 代码部署

**部署步骤**:

1. **注册阿里云账号**
   - 访问 [https://www.aliyun.com](https://www.aliyun.com)
   - 注册并完成实名认证

2. **开通 SAE 服务**
   - 进入阿里云控制台
   - 搜索 "Serverless 应用引擎 SAE"
   - 开通服务（首次使用有免费额度）

3. **创建应用**
   - 点击 "创建应用"
   - 选择 "镜像部署" 或 "代码部署"
   - **应用名称**: `video-app-backend`
   - **技术栈**: Node.js
   - **运行环境**: Node.js 18

4. **配置代码仓库**
   - 选择 "代码仓库部署"
   - 连接 GitHub/GitLab 仓库
   - **代码目录**: `admin API`
   - **构建命令**: `npm install`
   - **启动命令**: `node server.js`

5. **配置环境变量**
   - 在应用配置中添加所有环境变量（见下方环境变量配置部分）

6. **配置 FFmpeg**
   - 在 Dockerfile 中添加 FFmpeg 安装命令：
   ```dockerfile
   FROM node:18
   RUN apt-get update && apt-get install -y ffmpeg
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   CMD ["node", "server.js"]
   ```

**文档**: https://help.aliyun.com/product/97792.html

#### 选项 1B: 腾讯云云开发 CloudBase（推荐，国内服务）

**优势**:
- ✅ 国内服务，访问速度快
- ✅ 支持 Node.js 云函数
- ✅ 与腾讯云其他服务集成方便
- ✅ 有免费额度

**部署步骤**:

#### 详细配置步骤

**步骤 1: 注册腾讯云账号**
1. 访问 [https://cloud.tencent.com](https://cloud.tencent.com)
2. 点击 "免费注册"
3. 完成注册并完成实名认证（必需）

**步骤 2: 开通云开发服务**
1. 登录腾讯云控制台
2. 在顶部搜索框输入 "云开发 CloudBase"
3. 点击进入云开发控制台
4. 点击 "新建环境"
5. 填写环境信息：
   - **环境名称**: `video-app-env`（自定义）
   - **环境类型**: 选择 "云托管"（CloudBase Run）
   - **地域**: 选择离你最近的地域（如：广州、上海）
6. 点击 "立即开通"

**步骤 3: 创建云托管服务**
1. 在云开发控制台中，点击左侧菜单 "云托管"
2. 点击 "新建服务"
3. 填写服务信息：
   - **服务名称**: `video-app-backend`（只能包含数字、小写字母和 `-`，不能以 `-` 开头或结尾）
   - **服务描述**: `视频应用后端 API 服务`（可选）

**步骤 4: 配置 Git 仓库连接**
1. 在服务配置页面，找到 "Git 仓库" 部分
2. 点击 "授权 GitHub"（如果还没有授权）
   - 会跳转到 GitHub 授权页面
   - 点击 "Authorize" 授权
   - 授权成功后返回配置页面
3. 选择仓库：
   - **仓库**: 选择 `elenatang100192-gif/Learning`
   - **分支**: 选择 `main`
4. **启用自动部署**: 打开开关（推荐）
   - 这样每次推送到 `main` 分支时，会自动触发部署

**步骤 5: 配置服务端口**
1. 展开 "服务端口设置" 部分
2. 配置端口映射：
   - **访问端口**: `80`（CloudBase 对外暴露的端口，固定为 80）
   - **服务端口**: `3001`（你的 Node.js 应用监听的端口，与 `server.js` 中的 `PORT` 一致）
   - ⚠️ **重要**: 服务端口必须与你的应用监听端口一致（`server.js` 中默认是 3001）

**步骤 6: 配置构建设置**
1. 展开 "构建设置" 部分
2. **目标目录**: 输入 `admin API`
   - 这是代码仓库中后端代码所在的目录
   - CloudBase 会在这个目录下查找 Dockerfile
3. **Dockerfile 文件**: 选择 "有"
4. **Dockerfile 名称**: 输入 `Dockerfile`
   - 确保 `admin API` 目录下有 `Dockerfile` 文件（见下方创建 Dockerfile）

**步骤 7: 创建 Dockerfile**
在 `admin API` 目录下创建 `Dockerfile` 文件（如果还没有）：

```dockerfile
# 使用 Node.js 18 官方镜像作为基础镜像
FROM node:18

# 设置工作目录
WORKDIR /app

# 安装系统依赖（包括 FFmpeg）
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装 Node.js 依赖
RUN npm install --production

# 复制应用代码
COPY . .

# 暴露端口（CloudBase 会自动映射，这里设置为 3001）
EXPOSE 3001

# 启动应用
CMD ["node", "server.js"]
```

**步骤 8: 配置环境变量**
1. 展开 "环境变量设置" 部分
2. 点击 "添加环境变量"
3. 逐个添加以下环境变量（从 `SENSITIVE_INFO.md` 获取实际值）

**📧 邮件服务配置（详细步骤请参考 `EMAIL_CONFIGURATION_GUIDE.md`）**：

**LeanCloud 配置**:
```
LEANCLOUD_APP_ID=RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz
LEANCLOUD_APP_KEY=1w0cQLBZIaJ32tjaU7RkDu3n
LEANCLOUD_MASTER_KEY=Ub2GDZGGNo0NuUOvDRheK04Y
LEANCLOUD_SERVER_URL=https://rdecdltb.lc-cn-n1-shared.com
```

**API Keys 配置**:
```
DEEPSEEK_API_KEY=sk-c3a8c2ddc6dc49c4b6f43b3394147ead
DASHSCOPE_API_KEY=sk-7d830956ecb642349f40833295dfd04c
ARK_API_KEY=866a3f1e-a011-4f07-a5a8-01cd771f8552
DOUBAO_MODEL_ID=doubao-seedance-1-5-pro-251215
DOUBAO_TTS_APP_ID=7616870473
DOUBAO_TTS_ACCESS_KEY=q8Fx7NRJOVxrl6486XjBKaTL4gqVwqXm
DOUBAO_TTS_SECRET_KEY=d9ryy2RnuxT5wGmmA4EteU24fVRjcYSb
DOUBAO_TTS_RESOURCE_ID=seed-tts-1.0
```

**阿里云 OSS 配置**（需要替换为你的实际值）:
```
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=你的AccessKey ID
OSS_ACCESS_KEY_SECRET=你的AccessKey Secret
OSS_BUCKET=knowledge-video-app
```

**腾讯云 TTS 配置**（需要替换为你的实际值）:
```
TENCENT_SECRET_ID=你的Secret ID
TENCENT_SECRET_KEY=你的Secret Key
```

**服务器配置**（必需的环境变量）:
```
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-app.netlify.app
ADMIN_URL=https://your-admin-app.netlify.app
```

**⚠️ 重要提示**:
- ✅ **是的，这些都需要配置在环境变量中**（在 CloudBase 控制台的环境变量设置中添加）
- 对于包含密钥的环境变量，建议在 CloudBase 控制台中将它们标记为 "敏感信息"（如果支持）

**各环境变量说明**:

1. **`PORT=3001`**
   - **用途**: 指定后端服务监听的端口号
   - **代码使用**: `server.js` 中 `const PORT = process.env.PORT || 3001;`
   - **必须与 CloudBase 的"服务端口"配置一致**（步骤 5 中配置的 3001）
   - ⚠️ **重要**: 如果修改了端口，需要同时修改 CloudBase 的服务端口配置

2. **`NODE_ENV=production`**
   - **用途**: 标识当前为生产环境
   - **代码使用**: 用于 CORS 配置，允许所有 `.netlify.app` 域名的请求（如果设置了）
   - **建议**: 始终设置为 `production`，确保生产环境的安全配置生效

3. **`FRONTEND_URL=https://your-frontend-app.netlify.app`**
   - **用途**: 前端应用的访问地址，用于 CORS 配置
   - **代码使用**: `server.js` 中添加到允许的源列表
   - **需要替换为**: 
     - 如果使用 Netlify：你的 Netlify 前端地址（如：`https://your-frontend-app.netlify.app`）
     - 如果使用腾讯云静态网站托管：你的 CloudBase 前端地址（如：`https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-frontend`）

4. **`ADMIN_URL=https://your-admin-app.netlify.app`**
   - **用途**: 后台管理界面的访问地址，用于 CORS 配置
   - **代码使用**: `server.js` 中添加到允许的源列表
   - **需要替换为**: 
     - 如果使用 Netlify：你的 Netlify 后台管理地址（如：`https://your-admin-app.netlify.app`）
     - 如果使用腾讯云静态网站托管：你的 CloudBase 后台管理地址（如：`https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-admin`）

**配置示例**（根据你的实际部署地址）:

如果使用腾讯云静态网站托管：
```
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-frontend
ADMIN_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-admin
```

如果使用 Netlify：
```
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-app.netlify.app
ADMIN_URL=https://your-admin-app.netlify.app
```

**步骤 9: 配置更多设置（可选）**
1. 展开 "更多配置" 部分
2. **实例规格**: 选择适合的规格（建议：0.25核 0.5GB，免费额度内）
3. **最小实例数**: `1`（保持至少 1 个实例运行）
4. **最大实例数**: `2`（根据流量自动扩容）

**步骤 10: 部署服务**
1. 检查所有配置是否正确
2. 点击 "提交" 或 "创建服务"
3. CloudBase 会自动：
   - 从 GitHub 拉取代码
   - 在 `admin API` 目录下构建 Docker 镜像
   - 安装依赖并启动服务
4. 等待部署完成（通常需要 3-5 分钟）

**步骤 11: 获取服务地址**
1. 部署完成后，在服务列表中点击你的服务
2. 在服务详情页面，找到 "访问地址"
3. 复制访问地址，格式类似：`https://your-service-id.region.app.tcloudbase.com` 或 `https://video-app-backend-xxx.sh.run.tcloudbase.com`
4. 这个地址就是你的后端 API 地址，用于配置前端的 `VITE_API_BASE_URL`

**⚠️ 重要提示**：
- 后端 API 的所有路由都在 `/api` 前缀下
- 正确的 API 访问路径格式：`https://your-service-id.region.app.tcloudbase.com/api/...`
- 例如：
  - 健康检查：`https://your-service-id.region.app.tcloudbase.com/api/health`
  - 视频列表：`https://your-service-id.region.app.tcloudbase.com/api/videos`
  - 书籍列表：`https://your-service-id.region.app.tcloudbase.com/api/books`

**步骤 12: 更新前端和后台管理界面的环境变量**

在 CloudBase 静态网站托管中更新前端应用和后台管理界面的环境变量：

**前端应用环境变量**：
```
VITE_LEANCLOUD_APP_ID=RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz
VITE_LEANCLOUD_APP_KEY=1w0cQLBZIaJ32tjaU7RkDu3n
VITE_LEANCLOUD_SERVER_URL=https://rdecdltb.lc-cn-n1-shared.com
VITE_API_BASE_URL=https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api
```

**后台管理界面环境变量**：
```
VITE_LEANCLOUD_APP_ID=RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz
VITE_LEANCLOUD_APP_KEY=1w0cQLBZIaJ32tjaU7RkDu3n
VITE_LEANCLOUD_SERVER_URL=https://rdecdltb.lc-cn-n1-shared.com
VITE_API_BASE_URL=https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api
```

**⚠️ 重要提示**: 
- `VITE_API_BASE_URL` 必须以 `/api` 结尾
- 如果服务地址是 `https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com`，则 `VITE_API_BASE_URL` 应该是 `https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api`
- 确保后端服务已正确配置 CORS，允许来自 CloudBase 静态网站托管域名的请求（已自动配置）

**文档**: https://cloud.tencent.com/document/product/876

#### 选项 1C: 阿里云 ECS（弹性计算服务，国内服务）

**优势**:
- ✅ 完全控制服务器，可以安装任何依赖
- ✅ 国内访问速度快
- ✅ 适合长期运行的服务

**部署步骤**:

1. **购买 ECS 实例**
   - 访问 [https://ecs.console.aliyun.com](https://ecs.console.aliyun.com)
   - 选择配置（建议：2核4G，Ubuntu 20.04）
   - 购买并启动实例

2. **连接服务器**
   ```bash
   ssh root@your-server-ip
   ```

3. **安装 Node.js 和 FFmpeg**
   ```bash
   # 安装 Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt-get install -y nodejs
   
   # 安装 FFmpeg
   apt-get update
   apt-get install -y ffmpeg
   ```

4. **部署代码**
   ```bash
   # 克隆仓库
   git clone https://github.com/elenatang100192-gif/Learning.git
   cd Learning/admin\ API
   
   # 安装依赖
   npm install
   
   # 配置环境变量（创建 .env 文件）
   nano .env
   # 粘贴所有环境变量
   
   # 使用 PM2 管理进程
   npm install -g pm2
   pm2 start server.js --name video-app-backend
   pm2 save
   pm2 startup
   ```

5. **配置防火墙**
   - 在阿里云控制台开放端口 3001（或你配置的端口）

**文档**: https://help.aliyun.com/product/25365.html

#### 选项 1D: 腾讯云轻量应用服务器（国内服务）

**优势**:
- ✅ 价格便宜，适合小型项目
- ✅ 国内访问速度快
- ✅ 预装常用软件

**部署步骤**:

与阿里云 ECS 类似，购买轻量应用服务器后按照相同步骤部署。

**文档**: https://cloud.tencent.com/document/product/1207

#

## 配置环境变量

### 后端环境变量

在后端托管服务（Railway/Render/Heroku/阿里云 SAE/腾讯云 CloudBase/阿里云 ECS）中配置以下环境变量：

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

#### 邮件服务配置（必需，用于发送 OTP 验证码）

```
# 方式1: 使用 Gmail（推荐）
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false

# 方式2: 使用 QQ 邮箱
EMAIL_USER=your-email@qq.com
EMAIL_PASS=your-authorization-code
EMAIL_HOST=smtp.qq.com
EMAIL_PORT=587
EMAIL_SECURE=false

# 方式3: 使用自定义 SMTP 服务器
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-password
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false

# 或者使用别名（兼容性）
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_HOST=smtp.example.com
SMTP_PORT=587
```

**⚠️ 重要提示**:
- **Gmail**: 需要使用"应用专用密码"而不是普通密码。获取方式：Google 账号 → 安全性 → 两步验证 → 应用专用密码
- **QQ 邮箱**: 需要在 QQ 邮箱设置中开启 SMTP 服务并获取授权码
- **其他邮箱**: 请参考邮箱服务商的 SMTP 配置文档
- 如果不配置邮件服务，生产环境将无法发送 OTP 验证码
- **邮件发送**: 系统会根据后台管理用户列表中的邮箱地址发送 OTP 验证码，不限制邮件后缀

#### 服务器配置

```
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-frontend
ADMIN_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-admin
```

**注意**: `FRONTEND_URL` 和 `ADMIN_URL` 用于 CORS 配置，确保前端和后台管理可以访问后端 API。如果不设置，后端会自动允许所有 `.netlify.app` 和 `.tcloudbaseapp.com` 域名的请求。

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

1. 访问前端应用的 URL（如：`https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-frontend/`）
2. 检查：
   - ✅ 页面正常加载
   - ✅ 可以登录/注册
   - ✅ 可以浏览视频
   - ✅ 可以发布视频

### 2. 验证后台管理界面

1. 访问后台管理的 URL（如：`https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-admin/`）
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

