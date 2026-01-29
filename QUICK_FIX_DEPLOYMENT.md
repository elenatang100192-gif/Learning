# 快速修复部署名称问题

## 🚀 快速步骤

### 1. 检查 Azure 门户中的部署

访问：https://portal.azure.com → 搜索 `agr-dev-openai` → 点击 "模型部署"

### 2. 查找图像生成模型部署

查找以下任一部署：
- `gpt-image-1.5`
- `gpt-image-1`
- `gpt-image-1-mini`
- `dall-e-3`
- `dall-e-2`

### 3. 更新配置

编辑 `admin API/.env` 文件，将 `OPENAI_DEPLOYMENT_NAME` 更新为实际部署名称：

```bash
OPENAI_DEPLOYMENT_NAME=实际的部署名称
```

### 4. 如果没有部署，创建新部署

在 Azure 门户中：
1. 点击 "+ 创建"
2. 选择 GPT-image-1.5 或 DALL-E 3
3. 输入部署名称（例如：`gpt-image-1.5`）
4. 创建并等待完成

### 5. 重启服务器

```bash
cd "admin API"
npm run dev
```

## ⚠️ 重要提示

- 部署名称**区分大小写**
- 必须与 Azure 门户中显示的**完全一致**
- 如果刚创建部署，请等待几分钟后再使用
