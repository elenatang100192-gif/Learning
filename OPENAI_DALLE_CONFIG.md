# OpenAI DALL-E 图像生成配置指南

## 📋 概述

本项目已将所有文生图功能从豆包（Doubao）替换为 OpenAI DALL-E 3（通过 Azure AI Foundry）。

## 🔑 API 配置

### 必需的环境变量

1. **OPENAI_API_KEY** (必需)
   - 默认值: `cfbf57ca067949419e00faba7441f21f`
   - 说明: Azure AI Foundry 的 API Key

2. **OPENAI_ENDPOINT** (必需)
   - 格式: `https://your-resource.openai.azure.com`
   - 说明: Azure AI Foundry 的资源端点地址
   - 示例: `https://my-resource.openai.azure.com`

3. **OPENAI_DEPLOYMENT_NAME** (可选)
   - 默认值: `dall-e-3`
   - 说明: DALL-E 模型的部署名称

4. **OPENAI_API_VERSION** (可选)
   - 默认值: `2024-02-01`
   - 说明: API 版本号（根据 Azure AI Foundry 文档，DALL-E 3 推荐使用 `2024-02-01`）
   - 参考: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/dall-e?view=foundry-classic

### 环境变量配置示例

在 `.env` 文件中添加以下配置：

```bash
# OpenAI DALL-E 配置 (Azure AI Foundry)
OPENAI_API_KEY=cfbf57ca067949419e00faba7441f21f
OPENAI_ENDPOINT=https://your-resource.openai.azure.com
OPENAI_DEPLOYMENT_NAME=dall-e-3
OPENAI_API_VERSION=2024-02-01
```

## 🔗 API 端点格式

完整的 API 端点格式为：
```
https://[OPENAI_ENDPOINT]/openai/deployments/[OPENAI_DEPLOYMENT_NAME]/images/generations?api-version=[OPENAI_API_VERSION]
```

示例：
```
https://my-resource.openai.azure.com/openai/deployments/dall-e-3/images/generations?api-version=2024-02-01
```

## 📚 相关文档

- Azure AI Foundry OpenAI API 参考: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/reference-preview-latest?view=foundry-classic#create-transcription
- DALL-E 3 文档: https://platform.openai.com/docs/guides/images

## 🎨 API 请求格式

### 请求头
```json
{
  "Content-Type": "application/json",
  "api-key": "your-api-key"
}
```

### 请求体
```json
{
  "prompt": "A minimalist book cover design...",
  "n": 1,
  "size": "1024x1024",
  "quality": "standard",
  "style": "vivid",
  "response_format": "url"
}
```

**注意**：
- DALL-E 3 的 `n` 参数必须为 1（只能生成一张图片）
- Azure AI Foundry 的请求 body 中**不需要** `model` 参数（模型已在 URL 路径中指定）
- 参考文档: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/dall-e?view=foundry-classic

### 参数说明

- **prompt** (必需): 图像生成的提示词
- **n** (可选): 生成图片数量，默认为 1
- **size** (可选): 图片尺寸
  - `1024x1024` (默认)
  - `1792x1024`
  - `1024x1792`
- **quality** (可选): 图片质量
  - `standard` (默认，生成速度较快)
  - `hd` (高质量，细节更精细)
- **style** (可选): 图片风格（DALL-E 3 特有）
  - `vivid` (默认，超真实和电影风格)
  - `natural` (自然风格，更接近旧模型的默认风格)
- **response_format** (可选): 响应格式
  - `url` (默认，返回图片 URL)
  - `b64_json` (返回 base64 编码的图片)

### 响应格式

```json
{
  "data": [
    {
      "url": "https://..."
    }
  ]
}
```

## ⚠️ 注意事项

1. **端点配置**: 必须正确配置 `OPENAI_ENDPOINT` 和 `OPENAI_DEPLOYMENT_NAME`，否则图像生成功能将无法使用。

2. **API Key 安全**: 
   - 不要将 API Key 提交到版本控制系统
   - 使用环境变量管理敏感信息
   - 定期轮换 API Key

3. **请求限制**: 
   - 注意 Azure AI Foundry 的 API 调用频率限制
   - 建议实现请求重试和错误处理机制

4. **成本控制**: 
   - DALL-E 3 按图片生成次数计费
   - 建议监控 API 使用量

## 🔄 迁移说明

### 从豆包迁移到 OpenAI DALL-E

1. **API 端点变更**
   - 旧: `https://ark.cn-beijing.volces.com/api/v3/images/generations`
   - 新: `https://[endpoint]/openai/deployments/[deployment]/images/generations?api-version=[version]`

2. **认证方式变更**
   - 旧: `Authorization: Bearer [token]`
   - 新: `api-key: [key]`

3. **请求参数变更**
   - 移除了 `model` 参数（已在 URL 中指定）
   - 移除了 `sequential_image_generation`、`watermark` 等豆包特有参数
   - 使用标准的 DALL-E 3 参数格式

4. **响应格式**
   - 响应格式保持一致: `{ data: [{ url: "..." }] }`

## 🧪 测试

配置完成后，可以通过以下方式测试：

1. 启动服务器
2. 调用图像生成 API
3. 检查控制台日志，确认 API 调用成功
4. 验证生成的图片 URL 可访问

## 📞 支持

如有问题，请参考：
- Azure AI Foundry 官方文档
- 项目 README.md
- PROJECT_SETUP_GUIDE.md

