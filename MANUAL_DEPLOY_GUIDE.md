# 📦 手动部署到腾讯云托管指南

## ✅ 当前状态
- ✅ 代码已推送到Git: `https://github.com/elenatang100192-gif/Learning.git`
- ✅ 最新提交: `73c2203` - 优化字幕同步和样式
- ✅ 部署包已准备: `backend-deploy-YYYYMMDD-HHMMSS.zip`

---

## 🚀 部署步骤

### 步骤1: 登录腾讯云控制台

1. 访问：https://console.cloud.tencent.com/tcb
2. 使用您的账号登录

---

### 步骤2: 找到云托管服务

1. 在左侧菜单找到 **"云托管"** 或 **"CloudBase Run"**
2. 选择环境：`video-app-backend-215072-7-1319956699` 或 `video-app-env-8gpoewzu84d85ace`
3. 找到服务：`video-app-backend`

---

### 步骤3: 上传新版本

1. 点击服务名称进入服务详情页
2. 点击 **"版本管理"** 或 **"部署新版本"** 按钮
3. 选择 **"本地上传"** 或 **"ZIP包上传"**
4. 上传部署包：`admin API/backend-deploy-YYYYMMDD-HHMMSS.zip`
5. 等待上传完成（约1-2分钟）

---

### 步骤4: 配置部署参数

在部署配置页面，确保以下设置：

#### 基础配置
- **服务名称**: `video-app-backend`
- **运行环境**: `Node.js 16`
- **启动命令**: `node server.js`
- **监听端口**: `3001`

#### 环境变量
添加以下环境变量：

```
NODE_ENV=production
ADMIN_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-admin
FRONTEND_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-frontend
```

#### 资源配置（可选）
- **CPU**: 0.5核（默认）
- **内存**: 1GB（默认）
- **最小实例数**: 0
- **最大实例数**: 50

---

### 步骤5: 开始部署

1. 检查所有配置无误
2. 点击 **"开始部署"** 或 **"确认部署"**
3. 等待构建和部署完成（约3-5分钟）

---

### 步骤6: 验证部署

#### 方法1: 查看部署日志
在控制台查看部署日志，应该看到：
```
🚀 Video App Backend API Server running on port 3001
✅ LeanCloud connected
```

#### 方法2: 测试API
访问健康检查接口：
```
https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api/health
```

#### 方法3: 查看服务状态
- 服务状态应显示为 **"运行中"**
- 实例数量应大于0

---

## 🔍 常见问题

### 问题1: 部署失败
**解决方案**:
- 检查部署日志中的错误信息
- 确认环境变量配置正确
- 确认端口号设置为3001
- 确认启动命令为 `node server.js`

### 问题2: 服务无法启动
**解决方案**:
- 查看服务日志
- 检查环境变量是否正确
- 确认代码文件完整上传

### 问题3: API无法访问
**解决方案**:
- 检查服务状态是否为"运行中"
- 检查端口配置是否为3001
- 检查CORS配置是否正确

---

## 📋 部署检查清单

部署前确认：
- [ ] 已登录腾讯云控制台
- [ ] 已找到正确的环境和服务
- [ ] 已准备好部署包（ZIP文件）
- [ ] 知道服务名称和端口号

部署时确认：
- [ ] 已上传部署包
- [ ] 已配置环境变量
- [ ] 已设置启动命令和端口
- [ ] 已点击开始部署

部署后确认：
- [ ] 服务状态为"运行中"
- [ ] 部署日志无错误
- [ ] API可以正常访问
- [ ] 前端可以正常调用API

---

## 🎯 快速部署命令（如果使用CLI）

如果CLI可以正常工作，可以使用：

```bash
cd "/Users/et/Desktop/Learning/admin API"
tcb run deploy \
  -e video-app-env-8gpoewzu84d85ace \
  -s video-app-backend \
  --path ./ \
  --containerPort 3001 \
  --envParams "NODE_ENV=production&ADMIN_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-admin&FRONTEND_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-frontend"
```

---

## 📞 需要帮助？

如果遇到问题，请提供：
1. 部署日志截图
2. 服务状态截图
3. 错误信息详情
4. 环境ID和服务名称

---

## ✨ 本次更新内容

- ✅ 修复 `isEnglish` 未定义错误
- ✅ 更新 deepseek 拆解书籍的 prompt
- ✅ 优化字幕同步（提前0.7秒）
- ✅ 移除标点符号分段限制
- ✅ 调整字幕样式（字体8号，位置更靠上）
- ✅ 添加字幕左右边距和自动换行

部署完成后，新功能将立即生效！

