# DeploymentNotFound 错误解决方案

## 🔴 错误信息

```
Error: OpenAI DALL-E API失败: 404 DeploymentNotFound
{"error":{"code":"DeploymentNotFound","message":"The API deployment for this resource does not exist..."}}
```

## 📋 问题原因

**DeploymentNotFound** 错误表示在您的 Azure AI Foundry 资源中找不到指定的部署名称 `dall-e-3`。

可能的原因：
1. **部署名称不正确** - 实际部署名称可能不是 `dall-e-3`
2. **部署不存在** - 该资源中可能还没有创建图像生成模型的部署
3. **部署名称拼写错误** - 部署名称可能有大小写或拼写差异

## 🔧 解决步骤

### 步骤 1: 查找现有的部署

1. **登录 Azure 门户**
   - 访问 https://portal.azure.com
   - 使用您的 Azure 账户登录

2. **打开 Azure AI Foundry 资源**
   - 在搜索栏中输入资源名称：`agr-dev-openai`
   - 点击打开该资源

3. **查看模型部署**
   - 在左侧菜单中，点击 **"模型部署"** 或 **"Deployments"**
   - 查看已部署的模型列表

4. **查找图像生成模型**
   - 查找以下类型的部署：
     - `dall-e-3` 或 `dall-e-2`
     - `gpt-image-1`、`gpt-image-1.5`、`gpt-image-1-mini`
   - **记录实际的部署名称**（区分大小写）

### 步骤 2: 更新部署名称

如果找到了部署，编辑 `admin API/.env` 文件：

```bash
# 将部署名称更新为实际名称
OPENAI_DEPLOYMENT_NAME=实际的部署名称
```

**示例**：
```bash
# 如果实际部署名称是 gpt-image-1
OPENAI_DEPLOYMENT_NAME=gpt-image-1

# 或者如果实际部署名称是 dall-e-3（但大小写不同）
OPENAI_DEPLOYMENT_NAME=DALL-E-3
```

### 步骤 3: 创建新部署（如果没有部署）

如果资源中没有图像生成模型的部署，需要创建一个：

1. **在 Azure 门户中创建部署**
   - 在资源页面，点击 **"模型部署"** 或 **"Deployments"**
   - 点击 **"+ 创建"** 或 **"+ Create"**

2. **选择模型**
   - 选择 **DALL-E 3** 或 **GPT-image-1 系列**模型
   - 注意：GPT-image-1 系列可能需要申请访问权限

3. **配置部署**
   - **部署名称**：输入一个名称（例如：`dall-e-3`、`gpt-image-1`）
   - **模型版本**：选择可用的版本
   - **其他设置**：根据需要配置

4. **记录部署名称**
   - 创建完成后，记录实际的部署名称
   - 更新 `.env` 文件中的 `OPENAI_DEPLOYMENT_NAME`

### 步骤 4: 重启服务器

配置更改后，重启服务器：

```bash
cd "admin API"
# 停止当前服务器（Ctrl+C）
npm run dev
```

## 🔍 常见部署名称

根据 Azure AI Foundry 文档，常见的图像生成模型部署名称：

- `dall-e-3` - DALL-E 3 模型
- `dall-e-2` - DALL-E 2 模型（较旧）
- `gpt-image-1` - GPT-image-1 模型
- `gpt-image-1.5` - GPT-image-1.5 模型
- `gpt-image-1-mini` - GPT-image-1-mini 模型

**注意**：部署名称区分大小写，必须与 Azure 门户中显示的名称完全一致。

## 📝 当前配置检查

检查当前配置：

```bash
cd "admin API"
cat .env | grep OPENAI
```

应该看到：

```bash
OPENAI_API_KEY=cfbf57ca067949419e00faba7441f21f
OPENAI_ENDPOINT=https://agr-dev-openai.openai.azure.com
OPENAI_DEPLOYMENT_NAME=dall-e-3  # ⚠️ 需要更新为实际部署名称
OPENAI_API_VERSION=2024-02-01
```

## ✅ 验证步骤

1. **确认部署存在**
   - 在 Azure 门户中确认图像生成模型已部署
   - 记录实际的部署名称

2. **更新配置**
   - 更新 `.env` 文件中的 `OPENAI_DEPLOYMENT_NAME`
   - 确保部署名称与 Azure 门户中显示的名称完全一致

3. **重启服务器**
   - 停止并重新启动服务器
   - 检查启动日志确认配置正确

4. **测试功能**
   - 在后台管理界面尝试生成博客封面图
   - 如果仍然报错，检查服务器日志获取详细错误信息

## 🆘 如果仍然无法解决

1. **检查资源权限**
   - 确认您的账户有权限访问该资源
   - 确认 API key 有效且有权限访问部署

2. **尝试不同的 API 版本**
   - 如果部署存在但仍报错，尝试不同的 API 版本：
     ```bash
     OPENAI_API_VERSION=2024-02-15-preview
     # 或
     OPENAI_API_VERSION=2024-06-01
     ```

3. **联系 Azure 支持**
   - 如果确认配置正确但仍无法访问，可能需要联系 Azure 支持

## 📞 需要帮助？

如果按照以上步骤仍无法解决，请提供：
1. Azure 门户中显示的部署名称列表
2. 服务器日志中的完整错误信息
3. `.env` 文件中的配置（隐藏敏感信息）

## 📚 参考文档

- [Azure AI Foundry DALL-E 文档](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/dall-e?view=foundry-classic)
- [创建资源并部署模型](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/create-resource?view=foundry-classic)

