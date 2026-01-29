# OpenAI DALL-E 404 错误故障排除指南

## 🔴 错误信息

```
Error: OpenAI DALL-E API失败: 404 Resource Not Found
```

## 📋 问题原因

404 错误表示 Azure AI Foundry 找不到指定的资源。可能的原因：

1. **部署名称不正确** - `dall-e-3` 可能不是您资源中的实际部署名称
2. **API 版本不匹配** - 当前使用的 API 版本可能不被支持
3. **端点格式错误** - 端点 URL 格式可能不正确
4. **资源未部署** - DALL-E 模型可能未在该资源中部署

## 🔧 解决步骤

### 步骤 1: 确认部署名称

1. 登录 [Azure 门户](https://portal.azure.com)
2. 搜索并打开您的 Azure AI Foundry 资源 (`agr-dev-openai`)
3. 在左侧菜单中，点击 **"模型部署"** 或 **"Deployments"**
4. 查找已部署的图像生成模型，记录实际的部署名称
   - 可能的名称：`dall-e-3`、`dall-e-2`、`gpt-4-vision` 等
   - **重要**: 部署名称可能不是 `dall-e-3`，请使用实际名称

### 步骤 2: 更新 .env 文件

编辑 `admin API/.env` 文件，更新部署名称：

```bash
# 如果实际部署名称不是 dall-e-3，请修改为实际名称
OPENAI_DEPLOYMENT_NAME=your-actual-deployment-name
```

### 步骤 3: 尝试不同的 API 版本

如果仍然报错，尝试不同的 API 版本。编辑 `.env` 文件：

```bash
# 选项 1: 使用预览版本（当前）
OPENAI_API_VERSION=2024-02-15-preview

# 选项 2: 尝试最新版本
OPENAI_API_VERSION=2024-06-01

# 选项 3: 尝试 v1
OPENAI_API_VERSION=v1
```

### 步骤 4: 验证端点格式

确认端点格式正确：

```bash
# 正确格式
OPENAI_ENDPOINT=https://agr-dev-openai.openai.azure.com

# 错误格式（不要包含路径）
OPENAI_ENDPOINT=https://agr-dev-openai.openai.azure.com/openai/deployments/dall-e-3  # ❌ 错误
```

### 步骤 5: 重启服务器

配置更改后，重启服务器：

```bash
cd "admin API"
# 停止当前服务器（Ctrl+C）
npm run dev
```

## 🔍 诊断信息

服务器启动后，检查日志中的配置信息：

```
✅ OpenAI DALL-E API 配置已加载 (Azure AI Foundry)，端点: https://agr-dev-openai.openai.azure.com/openai/deployments/[部署名称]/images/generations?api-version=[版本]
```

如果出现 404 错误，日志会显示详细的诊断信息：

```
🔍 404 错误诊断:
   1. 检查部署名称是否正确: [当前部署名称]
   2. 检查端点是否正确: [当前端点]
   3. 检查 API 版本是否正确: [当前版本]
   4. 完整 URL: [完整 URL]
```

## 📝 当前配置

检查当前配置：

```bash
cd "admin API"
cat .env | grep OPENAI
```

应该看到：

```bash
OPENAI_API_KEY=cfbf57ca067949419e00faba7441f21f
OPENAI_ENDPOINT=https://agr-dev-openai.openai.azure.com
OPENAI_DEPLOYMENT_NAME=dall-e-3  # ⚠️ 可能需要修改为实际部署名称
OPENAI_API_VERSION=2024-02-15-preview  # ⚠️ 可能需要尝试其他版本
```

## ✅ 验证步骤

1. **确认部署存在**：
   - 在 Azure 门户中确认图像生成模型已部署
   - 记录实际的部署名称

2. **更新配置**：
   - 更新 `.env` 文件中的 `OPENAI_DEPLOYMENT_NAME`
   - 如果需要，尝试不同的 `OPENAI_API_VERSION`

3. **重启服务器**：
   - 停止并重新启动服务器
   - 检查启动日志确认配置正确

4. **测试功能**：
   - 在后台管理界面尝试生成博客封面图
   - 如果仍然报错，检查服务器日志获取详细错误信息

## 🆘 如果仍然无法解决

1. **检查 Azure 资源状态**：
   - 确认资源处于活动状态
   - 确认 API key 有效且有权限访问该资源

2. **联系 Azure 支持**：
   - 如果确认配置正确但仍无法访问，可能需要联系 Azure 支持

3. **使用标准 OpenAI API**：
   - 如果您的 API key 支持标准 OpenAI API，可以尝试使用标准端点
   - 修改代码使用标准 OpenAI API（需要修改认证方式）

## 📞 需要帮助？

如果按照以上步骤仍无法解决，请提供：
1. Azure 门户中显示的部署名称
2. 服务器日志中的完整错误信息
3. `.env` 文件中的配置（隐藏敏感信息）

