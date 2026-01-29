# 如何查找正确的部署名称

## 🔴 当前错误

```
DeploymentNotFound: The API deployment for this resource does not exist
部署名称: gpt-image-1.5
```

## 📋 问题说明

Azure 资源 `agr-dev-openai` 中没有名为 `gpt-image-1.5` 的部署。您需要：

1. **查找现有的部署名称**，或
2. **创建新的部署**

## 🔍 方法 1: 查找现有部署名称

### 步骤 1: 登录 Azure 门户

1. 访问 https://portal.azure.com
2. 使用您的 Azure 账户登录

### 步骤 2: 打开 Azure AI Foundry 资源

1. 在顶部搜索栏中输入：`agr-dev-openai`
2. 点击打开该资源

### 步骤 3: 查看模型部署

1. 在左侧菜单中，找到并点击 **"模型部署"** 或 **"Deployments"**
2. 查看已部署的模型列表

### 步骤 4: 查找图像生成模型

查找以下类型的部署：

**GPT-image-1 系列**：
- `gpt-image-1`
- `gpt-image-1.5`
- `gpt-image-1-mini`
- `gpt-image-1.5-preview`
- 或其他变体

**DALL-E 系列**：
- `dall-e-3`
- `dall-e-2`
- `dall-e-3-preview`
- 或其他变体

### 步骤 5: 记录部署名称

**重要**：
- 部署名称**区分大小写**
- 必须与 Azure 门户中显示的**完全一致**
- 可能包含版本号或后缀（如 `-preview`、`-v1` 等）

## 🆕 方法 2: 创建新部署

如果资源中没有图像生成模型的部署，需要创建一个：

### 步骤 1: 创建部署

1. 在 Azure 门户的资源页面，点击 **"模型部署"** 或 **"Deployments"**
2. 点击 **"+ 创建"** 或 **"+ Create"** 按钮

### 步骤 2: 选择模型

选择以下模型之一：

**推荐选项**：
- **GPT-image-1.5**（如果可用）
  - 更好的性能和成本效益
  - 支持高级功能（如面部保持）
  
- **GPT-image-1**（如果可用）
  - 高质量图像生成
  
- **DALL-E 3**（如果可用）
  - 经典选择，稳定可靠

**注意**：
- GPT-image-1 系列可能需要申请访问权限
- 某些模型可能在某些区域不可用

### 步骤 3: 配置部署

1. **部署名称**：
   - 输入一个名称，例如：`gpt-image-1.5`
   - 或者使用您喜欢的名称（如：`image-gen`、`dalle-3` 等）
   - **记录这个名称**，稍后需要在 `.env` 文件中使用

2. **模型版本**：
   - 如果提示选择版本，选择可用的版本
   - 例如：`2025-12-16` 或其他可用版本

3. **其他设置**：
   - 根据需要配置其他选项
   - 通常默认设置即可

### 步骤 4: 创建并等待

1. 点击 **"创建"** 或 **"Create"**
2. 等待部署完成（通常需要几分钟）
3. 部署完成后，记录实际的部署名称

## 🔧 更新配置

找到或创建部署后，更新 `.env` 文件：

```bash
# 编辑 admin API/.env 文件
OPENAI_DEPLOYMENT_NAME=实际的部署名称
```

**示例**：
```bash
# 如果部署名称是 gpt-image-1
OPENAI_DEPLOYMENT_NAME=gpt-image-1

# 如果部署名称是 dall-e-3
OPENAI_DEPLOYMENT_NAME=dall-e-3

# 如果部署名称包含版本号
OPENAI_DEPLOYMENT_NAME=gpt-image-1.5-preview
```

## 🔄 重启服务器

配置更改后，重启服务器：

```bash
cd "admin API"
# 停止当前服务器（Ctrl+C）
npm run dev
```

## ✅ 验证配置

服务器启动后，检查日志：

```
✅ OpenAI DALL-E API 配置已加载 (Azure AI Foundry)，端点: https://agr-dev-openai.openai.azure.com/openai/deployments/[部署名称]/images/generations?api-version=2025-04-01-preview
```

如果看到这个日志，说明配置正确。

## 🆘 常见问题

### Q: 部署名称应该是什么格式？

A: 部署名称可以是任何字符串，但通常遵循以下格式：
- `gpt-image-1.5`
- `dall-e-3`
- `image-generation`
- `my-image-model`

**重要**：必须与 Azure 门户中显示的完全一致。

### Q: 如何知道部署是否已创建？

A: 在 Azure 门户的 "模型部署" 页面中，您应该能看到：
- 部署名称
- 模型类型
- 状态（应该是 "已部署" 或 "Deployed"）

### Q: 部署创建后多久可以使用？

A: 通常需要几分钟。如果创建后立即使用，可能会看到 "请等待 5 分钟" 的错误消息。

### Q: 可以同时有多个部署吗？

A: 可以。您可以为不同的模型创建多个部署，每个部署有唯一的名称。

## 📞 需要帮助？

如果按照以上步骤仍无法解决，请提供：

1. **Azure 门户截图**：
   - "模型部署" 页面的截图
   - 显示所有已部署的模型

2. **部署列表**：
   - 列出所有可见的部署名称

3. **错误信息**：
   - 完整的错误日志

这样我可以帮您确定正确的部署名称。

