# 前端环境变量配置说明

## 问题描述
生产环境中前端调用后端API失败，错误信息：
```
无法连接到后端服务器 (https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api)
```

## 原因
前端代码默认使用 `http://localhost:3001/api`，在生产环境需要改为实际的后端URL。

## 解决方案

### 1. 代码自动检测（已实现）✅

代码已更新为根据环境自动选择API地址：

```typescript
// admin/src/app/services/leancloud.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.MODE === 'production' 
    ? 'https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api'
    : 'http://localhost:3001/api');
```

### 2. 环境变量配置（可选）

如果需要覆盖默认URL，可以设置环境变量：

#### 开发环境 (`.env.development`)
```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

#### 生产环境 (`.env.production`)
```bash
VITE_API_BASE_URL=https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api
```

**注意**: `.env` 文件不会提交到Git，需要在部署时配置。

---

## 部署后台管理界面

### 方法1：腾讯云CloudBase部署

1. **进入腾讯云控制台**
   - 访问：https://console.cloud.tencent.com/tcb
   - 找到静态网站托管

2. **上传构建产物**
   
   先在本地构建：
   ```bash
   cd /Users/et/Desktop/Learning/admin
   npm install
   npm run build
   ```
   
   构建产物在 `admin/dist` 目录

3. **配置环境变量**（在CloudBase控制台）
   ```
   VITE_API_BASE_URL=https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api
   ```

4. **上传dist目录**到静态网站托管

---

### 方法2：Netlify部署

1. **连接Git仓库**
   - 登录Netlify
   - 导入Git仓库：https://github.com/elenatang100192-gif/Learning

2. **配置构建设置**
   ```
   Base directory: admin
   Build command: npm run build
   Publish directory: admin/dist
   ```

3. **设置环境变量**
   在Netlify控制台 → Site settings → Environment variables
   ```
   VITE_API_BASE_URL=https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api
   ```

4. **部署**
   点击"Deploy site"

---

## 验证配置

### 方法1：检查浏览器Console

部署后访问后台管理页面，打开开发者工具Console，运行：

```javascript
// 检查API配置
console.log('API Base URL:', 
  import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.MODE === 'production' 
    ? 'https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api'
    : 'http://localhost:3001/api')
);
```

### 方法2：测试API连接

```javascript
fetch('https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend connected:', d))
  .catch(e => console.error('❌ Backend connection failed:', e));
```

---

## 重新部署前端

### 如果使用CloudBase：

1. **本地构建**
   ```bash
   cd /Users/et/Desktop/Learning/admin
   npm run build
   ```

2. **上传到CloudBase**
   - 登录控制台
   - 静态网站托管
   - 上传 `dist` 目录

### 如果使用Netlify：

1. **触发重新部署**
   - 方式A：在Netlify控制台点击"Trigger deploy"
   - 方式B：推送代码到Git会自动部署

---

## Git提交记录

✅ **提交**: `ad6acda` - "fix: 修复生产环境后端API连接问题"
✅ **已推送到远程仓库**

---

## 注意事项

1. **环境模式检测**
   - Vite在构建时会自动设置 `import.meta.env.MODE`
   - 开发环境：`MODE = 'development'`
   - 生产构建：`MODE = 'production'`

2. **CORS配置**
   - 后端已配置允许前端域名
   - 确保后端服务正在运行

3. **SSL证书**
   - 生产环境使用HTTPS
   - 确保后端URL使用HTTPS（已配置）

---

## 当前配置

| 环境 | 前端URL | 后端API URL |
|------|---------|-------------|
| 开发 | http://localhost:5175 | http://localhost:3001/api |
| 生产 | https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-admin | https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api |

---

## 下一步

1. **重新构建前端**
   ```bash
   cd admin
   npm run build
   ```

2. **重新部署到生产环境**

3. **测试视频生成功能**

问题应该就解决了！🚀

