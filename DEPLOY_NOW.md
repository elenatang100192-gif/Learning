# 🚀 立即部署后端API到生产环境

## 📦 部署包已准备

部署包位置：`/Users/et/Desktop/Learning/backend-deploy-20260112-224237.zip`

## 🎯 部署步骤（通过腾讯云控制台）

### 方法1：通过云托管控制台部署（推荐）

1. **登录腾讯云控制台**
   - 访问：https://console.cloud.tencent.com/tcb
   - 或直接访问云托管：https://console.cloud.tencent.com/tcb/run

2. **找到您的云托管服务**
   - 环境ID：`video-app-env-8gpoewzu84d85ace`
   - 服务名称：`video-app-backend`

3. **创建新版本**
   - 点击服务名称进入服务详情
   - 点击"版本管理"或"部署新版本"
   - 选择"本地上传"或"ZIP包上传"
   - 上传文件：`backend-deploy-20260112-224237.zip`

4. **配置环境变量**（如果还没有配置）
   ```
   NODE_ENV=production
   ADMIN_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-admin
   FRONTEND_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-frontend
   ```

5. **配置启动命令**
   ```
   npm install --production && node server.js
   ```

6. **配置端口**
   - 容器端口：`3001`

7. **部署并等待完成**
   - 点击"部署"或"创建版本"
   - 等待构建和部署完成（约3-5分钟）

8. **分配流量**
   - 部署完成后，将新版本的流量分配设置为100%
   - 或直接设置为默认版本

9. **验证部署**
   - 访问健康检查：https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api/health
   - 或通过控制台查看服务状态和日志
   - 应该返回：`{"status":"OK","timestamp":"...","uptime":...}`

---

## 🔍 本次修复内容

### 1. CORS配置修复
- ✅ 正确处理CloudBase域名（移除路径部分）
- ✅ 添加对CloudBase Run域名的支持
- ✅ 添加显式OPTIONS预检请求处理
- ✅ 增强allowedHeaders，包含Content-Length

### 2. 文件大小限制提升
- ✅ multer文件大小限制：100MB → 500MB
- ✅ express body parser限制：200MB → 500MB
- ✅ 上传超时时间：5分钟 → 10分钟

### 3. 英文视频发布验证修复
- ✅ 允许title或titleEn至少一个存在即可
- ✅ 优化保存逻辑，确保数据一致性

---

## 📋 部署后验证清单

- [ ] 服务状态显示"运行中"
- [ ] 健康检查接口返回正常
- [ ] CORS错误已解决（尝试上传视频）
- [ ] 413错误已解决（如果文件小于500MB）
- [ ] 英文视频可以正常发布
- [ ] 查看日志确认没有启动错误

---

## 🆘 如果遇到问题

### 问题1：找不到环境或服务
- 确认环境ID是否正确：`video-app-backend-215072-7-1319956699`
- 检查是否有访问权限
- 联系腾讯云技术支持

### 问题2：部署失败
- 查看部署日志，找到具体错误信息
- 确认环境变量配置正确
- 确认启动命令正确：`node server.js`
- 确认端口配置：`3001`

### 问题3：CORS仍然报错
- 检查环境变量`ADMIN_URL`和`FRONTEND_URL`是否正确
- 查看后端日志中的CORS相关信息
- 确认请求的Origin头是否正确

---

## 📞 需要帮助？

如果以上步骤都无法解决问题，请提供：
1. 腾讯云控制台截图（服务配置页面）
2. 部署日志（最近50行）
3. 后端服务日志（最近50行）
4. 错误信息截图

---

## 🎉 部署完成后

部署成功后，以下问题应该已解决：
1. ✅ CORS错误（视频上传时的跨域问题）
2. ✅ 413错误（文件大小限制问题，如果文件小于500MB）
3. ✅ 英文视频发布时的验证错误

现在可以正常使用视频上传和发布功能了！

