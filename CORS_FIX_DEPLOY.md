# 🚨 CORS错误修复 - 紧急部署指南

## ❌ 当前问题

生产环境报错：
```
Access to fetch at 'https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api/books/content/.../generate-video' 
from origin 'https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## ✅ 解决方案

代码中已经有正确的CORS配置，但生产环境可能没有部署最新版本。需要重新部署最新代码。

---

## 🚀 快速部署步骤

### 步骤1: 准备部署包

部署包已准备好：
- **文件位置**: `admin API/backend-deploy-YYYYMMDD-HHMMSS.zip`
- **包含内容**: 最新的server.js（包含CORS配置）

### 步骤2: 登录腾讯云控制台

1. 访问：https://console.cloud.tencent.com/tcb
2. 登录您的账号

### 步骤3: 找到云托管服务

1. 左侧菜单 → **"云托管"** 或 **"CloudBase Run"**
2. 选择环境：`video-app-backend-215072-7-1319956699`
3. 找到服务：`video-app-backend`

### 步骤4: 部署新版本

1. 点击服务名称进入详情页
2. 点击 **"版本管理"** → **"部署新版本"**
3. 选择 **"本地上传"** 或 **"ZIP包上传"**
4. 上传文件：`admin API/backend-deploy-YYYYMMDD-HHMMSS.zip`
5. 等待上传完成

### 步骤5: 配置参数

确保以下配置正确：

#### 基础配置
- **启动命令**: `node server.js`
- **监听端口**: `3001`
- **运行环境**: `Node.js 16`

#### 环境变量（重要！）
```
NODE_ENV=production
ADMIN_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-admin
FRONTEND_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-frontend
```

### 步骤6: 开始部署

1. 检查所有配置无误
2. 点击 **"开始部署"**
3. 等待3-5分钟完成

### 步骤7: 验证部署

部署完成后，检查：

1. **服务状态**
   - 应该显示 **"运行中"**
   - 实例数量 > 0

2. **查看日志**
   - 应该看到：`✅ CORS: Allowing CloudBase origin: https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com`

3. **测试API**
   - 访问：`https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api/health`
   - 应该返回正常响应

---

## 🔍 CORS配置说明

最新代码中的CORS配置包括：

1. **硬编码前端域名**（第50行）
   ```javascript
   'https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com'
   ```

2. **允许所有CloudBase域名**（第75行）
   ```javascript
   if (origin && origin.includes('.tcloudbaseapp.com')) {
     callback(null, true);
     return;
   }
   ```

3. **允许所有CloudBase Run域名**（第82行）
   ```javascript
   if (origin && origin.includes('.sh.run.tcloudbase.com')) {
     callback(null, true);
     return;
   }
   ```

---

## ⚠️ 如果部署后仍有问题

### 检查1: 确认代码版本
查看部署日志，确认是否包含CORS配置：
```bash
# 应该看到这些日志
🌐 CORS: Checking origin: https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com
✅ CORS: Allowing CloudBase origin: https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com
```

### 检查2: 确认环境变量
确保环境变量 `NODE_ENV=production` 已设置

### 检查3: 重启服务
如果部署后仍有问题，尝试重启服务：
1. 在服务详情页点击 **"重启"**
2. 等待服务重启完成

### 检查4: 查看详细日志
在控制台查看服务日志，查找CORS相关的错误信息

---

## 📋 部署检查清单

部署前：
- [ ] 已准备好最新的部署包
- [ ] 已登录腾讯云控制台
- [ ] 已找到正确的环境和服务

部署时：
- [ ] 已上传部署包
- [ ] 已配置环境变量（特别是NODE_ENV=production）
- [ ] 已设置启动命令和端口
- [ ] 已点击开始部署

部署后：
- [ ] 服务状态为"运行中"
- [ ] 查看日志确认CORS配置生效
- [ ] 测试API可以正常访问
- [ ] 前端可以正常调用API

---

## 🆘 需要帮助？

如果部署后仍有CORS错误，请提供：
1. 部署日志截图
2. 服务日志截图（特别是CORS相关的日志）
3. 错误信息详情
4. 环境变量配置截图

---

## ✨ 本次更新内容

- ✅ 修复CORS配置，确保允许前端域名
- ✅ 优化字幕同步和样式
- ✅ 修复isEnglish未定义错误
- ✅ 更新deepseek prompt

部署完成后，CORS错误应该会解决！

