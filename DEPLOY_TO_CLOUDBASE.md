# 🚀 立即部署到腾讯云CloudBase

## 当前状态
- ❌ 生产环境代码是旧版本，不支持CORS
- ✅ Git仓库代码是最新的（提交：`98dd9bd`）
- 🎯 需要：将最新代码部署到生产环境

---

## 🎯 方案1：通过腾讯云控制台部署（最简单）⭐⭐⭐

### 步骤1：准备部署包

在本地终端执行：

```bash
# 1. 进入后端目录
cd "/Users/et/Desktop/Learning/admin API"

# 2. 安装依赖（如果需要）
npm install --production

# 3. 创建部署包（排除不需要的文件）
zip -r backend-deploy.zip . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x "*.log" \
  -x ".env" \
  -x "debug-fetch.js"

# 部署包位置：/Users/et/Desktop/Learning/admin API/backend-deploy.zip
```

### 步骤2：上传到腾讯云

1. **登录腾讯云控制台**
   - 访问：https://console.cloud.tencent.com/tcb

2. **找到您的环境**
   - 环境ID：`video-app-backend-215072-7-1319956699`

3. **进入云托管**
   - 左侧菜单 → "云托管" 或 "CloudBase Run"
   - 找到您的后端服务

4. **上传新版本**
   - 点击"版本管理"或"部署新版本"
   - 选择"本地代码"或"ZIP包"
   - 上传 `backend-deploy.zip`
   - 等待构建和部署（约3-5分钟）

5. **配置环境变量**
   在部署过程中或部署后，添加环境变量：
   ```
   NODE_ENV=production
   ADMIN_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-admin
   FRONTEND_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-frontend
   ```

6. **重启服务**
   - 部署完成后，点击"重启"确保新代码生效

---

## 🎯 方案2：使用CloudBase CLI部署

### 安装和配置

```bash
# 1. 安装CloudBase CLI（如果还没安装）
npm install -g @cloudbase/cli

# 2. 登录
tcb login

# 3. 查看环境列表
tcb env:list
```

### 部署命令

```bash
# 进入后端目录
cd "/Users/et/Desktop/Learning/admin API"

# 设置环境ID
export TCB_ENVID="video-app-backend-215072-7-1319956699"

# 部署函数（根据您的服务名称调整）
tcb fn deploy \
  --name video-app-backend \
  --path ./ \
  --runtime Nodejs16

# 或者部署为云托管服务
tcb run deploy \
  --name video-app-backend \
  --path ./
```

---

## 🎯 方案3：关联Git仓库自动部署（推荐长期使用）⭐

### 配置步骤

1. **在腾讯云控制台**
   - 进入您的云托管服务
   - 找到"持续集成"或"Git部署"选项

2. **关联Git仓库**
   - 仓库地址：`https://github.com/elenatang100192-gif/Learning.git`
   - Token：使用您的GitHub Personal Access Token（从deploy-info文件获取）
   - 分支：`main`
   - 代码路径：`/admin API`

3. **配置构建**
   - 安装命令：`npm install`
   - 启动命令：`node server.js`
   - 端口：`3001`

4. **设置自动部署**
   - 启用"代码提交时自动部署"
   - 以后每次 `git push` 都会自动部署

---

## 🔍 验证部署是否成功

### 方法1：查看后端日志

在腾讯云控制台查看服务日志，应该看到：

```
🚀 Video App Backend API Server running on port 3001
🌐 CORS: Checking origin: https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com
✅ CORS: Allowing CloudBase origin: https://...
```

### 方法2：测试CORS

```bash
curl -I -X OPTIONS \
  https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api/books/upload \
  -H "Origin: https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com" \
  -H "Access-Control-Request-Method: POST"
```

**期望结果**：
```
HTTP/1.1 204 No Content
access-control-allow-origin: https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com
access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
access-control-allow-credentials: true
```

### 方法3：前端测试

1. 访问：https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-admin
2. 尝试上传书籍
3. 应该不再出现CORS错误

---

## 📋 检查清单

部署前确认：
- [ ] 本地代码是最新的（Git提交：`98dd9bd`）
- [ ] 已创建部署包 `backend-deploy.zip`
- [ ] 知道腾讯云环境ID
- [ ] 有腾讯云控制台访问权限

部署后确认：
- [ ] 服务状态显示"运行中"
- [ ] 环境变量已配置
- [ ] 查看日志没有启动错误
- [ ] CORS测试通过
- [ ] 前端上传功能正常

---

## 🆘 如果还是不行

### 临时解决方案：直接修改生产环境文件

如果有SSH或文件管理器访问权限：

1. 找到生产环境的 `server.js` 文件
2. 找到第58-63行附近
3. 确认是否有这段代码：

```javascript
// 允许所有 CloudBase 静态网站托管域名
if (origin && origin.includes('.tcloudbaseapp.com')) {
  console.log(`✅ CORS: Allowing CloudBase origin: ${origin}`);
  callback(null, true);
  return;
}
```

4. 如果没有，手动添加
5. 重启服务

---

## 📞 需要帮助？

如果以上方法都不行，请提供：
1. 腾讯云控制台截图（云托管服务配置页面）
2. 后端服务日志（最近50行）
3. 是否有CLI或控制台访问权限
4. 当前部署方式（手动/CLI/Git自动）

---

## 🎯 推荐执行顺序

1. **立即执行**：方案1 - 手动上传ZIP包（15分钟）
2. **长期使用**：方案3 - 配置Git自动部署（30分钟）
3. **备选方案**：方案2 - CLI部署（需要安装CLI）

