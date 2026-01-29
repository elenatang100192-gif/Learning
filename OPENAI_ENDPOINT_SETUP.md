# OpenAI 端点配置指南

## ⚠️ 当前问题

您遇到了以下错误：
```
Error: OpenAI 端点未配置，请设置 OPENAI_ENDPOINT 和 OPENAI_DEPLOYMENT_NAME 环境变量
```

## 🔧 解决方案

### 方法 1: 配置 Azure AI Foundry 端点（推荐）

如果您使用的是 Azure AI Foundry，需要找到您的资源端点：

#### 步骤 1: 登录 Azure 门户
1. 访问 https://portal.azure.com
2. 登录您的 Azure 账户

#### 步骤 2: 找到 Azure AI Foundry 资源
1. 在搜索栏中输入 "Azure AI Foundry"
2. 选择您的 Azure AI Foundry 资源

#### 步骤 3: 获取端点
1. 在资源页面，点击左侧菜单的 **"概览"** 或 **"Overview"**
2. 找到 **"端点"** 或 **"Endpoint"** 字段
3. 复制端点 URL（格式类似：`https://your-resource.openai.azure.com`）

#### 步骤 4: 更新 .env 文件
编辑 `admin API/.env` 文件，将 `OPENAI_ENDPOINT` 替换为您的实际端点：

```bash
OPENAI_ENDPOINT=https://your-actual-resource.openai.azure.com
```

**重要**: 将 `your-actual-resource` 替换为您从 Azure 门户复制的实际资源名称。

### 方法 2: 使用标准 OpenAI API（如果 API key 支持）

如果您的 API key 是标准的 OpenAI API key（不是 Azure 的），代码会自动尝试使用标准 OpenAI API。

**注意**: 根据您提供的 API key 格式（`cfbf57ca067949419e00faba7441f21f`），这看起来像是 Azure AI Foundry 的 API key，所以**强烈建议使用方法 1**。

## 📝 当前配置

当前 `admin API/.env` 文件中的配置：

```bash
OPENAI_API_KEY=cfbf57ca067949419e00faba7441f21f
OPENAI_ENDPOINT=https://your-resource.openai.azure.com  # ⚠️ 需要替换为实际端点
OPENAI_DEPLOYMENT_NAME=dall-e-3
OPENAI_API_VERSION=preview
```

## ✅ 配置完成后

1. **重启服务器**：配置更改后需要重启服务器才能生效
   ```bash
   # 停止当前服务器（Ctrl+C 或 kill 进程）
   # 然后重新启动
   cd admin\ API
   npm run dev
   ```

2. **验证配置**：服务器启动时，您应该看到：
   ```
   ✅ OpenAI DALL-E API 配置已加载 (Azure AI Foundry)，端点: https://...
   ```

3. **测试功能**：在后台管理界面尝试生成博客封面图，应该可以正常工作。

## 🔍 如何验证端点是否正确

如果端点配置正确，服务器启动时会显示：
```
✅ OpenAI DALL-E API 配置已加载 (Azure AI Foundry)，端点: https://your-resource.openai.azure.com/openai/deployments/dall-e-3/images/generations?api-version=preview
```

如果端点未配置或配置错误，会显示：
```
❌ OpenAI 端点未正确配置！
   请在 .env 文件中设置正确的 OPENAI_ENDPOINT
```

## 📞 需要帮助？

如果仍然遇到问题：
1. 检查 `.env` 文件中的端点是否正确
2. 确认端点格式为：`https://your-resource.openai.azure.com`（不包含路径）
3. 确认 API key 是否正确
4. 重启服务器使配置生效

