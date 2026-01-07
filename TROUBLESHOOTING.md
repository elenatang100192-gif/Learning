# 🔧 故障排查指南

## 问题：后台管理页面无法连接到后端 API

### 错误信息
```
net::ERR_FAILED
❌ 网络请求失败: https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api/users
TypeError: Failed to fetch
```

### 排查步骤

#### 1. 检查后端服务是否运行

**方法 1: 访问健康检查端点**

在浏览器中访问：
```
https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api/health
```

**预期结果**:
- ✅ 成功：返回 `{"status":"OK","timestamp":"...","uptime":...}`
- ❌ 失败：无法访问或返回错误

**如果无法访问**:
- 后端服务可能没有运行
- 需要检查 CloudBase Run 服务状态
- 查看 CloudBase Run 的日志，检查是否有错误

**方法 2: 访问根路径**

在浏览器中访问：
```
https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/
```

**预期结果**:
- ✅ 成功：返回 API 信息 JSON
- ❌ 失败：无法访问或返回错误

#### 2. 检查 CloudBase Run 服务状态

1. 登录腾讯云 CloudBase 控制台
2. 进入 **云开发** → **云托管** → **服务管理**
3. 找到你的后端服务（`video-app-backend`）
4. 检查服务状态：
   - ✅ **运行中**：服务正常
   - ❌ **已停止**：需要启动服务
   - ❌ **异常**：查看日志排查问题

#### 3. 检查 CloudBase Run 日志

1. 在服务详情页面，点击 **日志** 标签
2. 查看最近的日志，检查是否有错误信息
3. 常见错误：
   - 端口配置错误
   - 环境变量缺失
   - 依赖安装失败
   - 应用启动失败

#### 4. 检查环境变量配置

在 CloudBase Run 服务配置中，确保以下环境变量已正确配置：

**必需的环境变量**:
```
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-frontend
ADMIN_URL=https://video-app-env-8gpoewzu84d85ace-1319956699.tcloudbaseapp.com/Video-admin
```

**LeanCloud 配置**:
```
LEANCLOUD_APP_ID=RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz
LEANCLOUD_APP_KEY=1w0cQLBZIaJ32tjaU7RkDu3n
LEANCLOUD_MASTER_KEY=Ub2GDZGGNo0NuUOvDRheK04Y
LEANCLOUD_SERVER_URL=https://rdecdltb.lc-cn-n1-shared.com
```

**⚠️ 重要**: 
- `FRONTEND_URL` 和 `ADMIN_URL` 必须包含完整的 URL（包括协议 `https://`）
- 不要包含末尾的斜杠 `/`
- 确保所有环境变量都已正确设置

#### 5. 检查 CORS 配置

后端代码已自动支持 CloudBase 域名，但需要确保：

1. **环境变量已设置**: `FRONTEND_URL` 和 `ADMIN_URL` 必须正确配置
2. **NODE_ENV=production**: 确保设置为 `production`
3. **服务已重启**: 修改环境变量后需要重启服务

#### 6. 检查端口配置

1. 在 CloudBase Run 服务配置中，检查 **服务端口**
2. 确保端口设置为 `3001`
3. 确保环境变量 `PORT=3001` 与配置的端口一致

#### 7. 检查网络连接

**在浏览器控制台测试**:

打开浏览器开发者工具（F12），在 Console 中运行：

```javascript
// 测试健康检查端点
fetch('https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api/health')
  .then(res => res.json())
  .then(data => console.log('✅ 后端服务正常:', data))
  .catch(err => console.error('❌ 后端服务异常:', err));

// 测试用户列表端点
fetch('https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api/users?page=1&limit=20')
  .then(res => res.json())
  .then(data => console.log('✅ API 请求成功:', data))
  .catch(err => console.error('❌ API 请求失败:', err));
```

**预期结果**:
- ✅ 成功：返回数据
- ❌ 失败：检查错误信息

#### 8. 检查 SSL/HTTPS 证书

如果访问后端 URL 时出现 SSL 证书错误：
1. 检查 CloudBase Run 服务的 SSL 配置
2. 确保使用 HTTPS 协议
3. 如果使用自定义域名，确保 SSL 证书已正确配置

### 常见问题解决方案

#### 问题 1: 后端服务无法访问

**解决方案**:
1. 检查 CloudBase Run 服务是否已启动
2. 检查服务端口配置是否正确
3. 查看服务日志，排查启动错误
4. 确保 Dockerfile 配置正确

#### 问题 2: CORS 错误

**解决方案**:
1. 确保环境变量 `FRONTEND_URL` 和 `ADMIN_URL` 已正确配置
2. 确保 `NODE_ENV=production`
3. 重启后端服务
4. 检查浏览器控制台的 CORS 错误信息

#### 问题 3: 环境变量未生效

**解决方案**:
1. 在 CloudBase Run 控制台检查环境变量配置
2. 确保环境变量名称正确（区分大小写）
3. 确保环境变量值正确（不要有多余的空格）
4. 重启服务使环境变量生效

#### 问题 4: 端口配置错误

**解决方案**:
1. 确保 CloudBase Run 服务端口设置为 `3001`
2. 确保环境变量 `PORT=3001`
3. 检查 Dockerfile 中的 `EXPOSE 3001`
4. 重启服务

### 联系支持

如果以上步骤都无法解决问题，请提供以下信息：

1. **后端服务状态**: CloudBase Run 服务是否运行中
2. **服务日志**: 最近的错误日志
3. **环境变量配置**: 已配置的环境变量列表（隐藏敏感信息）
4. **浏览器控制台错误**: 完整的错误信息
5. **网络测试结果**: 健康检查端点的访问结果

---

**最后更新**: 2026-01-07

