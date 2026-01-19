# 视频生成使用指南

## 概述

本指南说明如何使用 `Videocreate.mov`（话筒视频模板）结合博客封面图和音频生成中英文视频。

## 文件位置

- **话筒视频文件**: `admin API/routes/Videocreate.mov` ✅（已就位）
- **备用位置**: `admin API/Videocreate.mov`

## 视频生成流程

### 前置条件

1. **书籍已上传**：确保书籍已上传到系统
2. **内容已提取**：确保已从书籍中提取内容（ExtractedContent）

### 步骤1：生成博客封面图

**API端点**: `POST /api/books/:bookId/generate-blog-cover`

**说明**: 为书籍生成博客封面图，将作为视频的背景图。

**示例请求**:
```bash
curl -X POST http://localhost:3001/api/books/{bookId}/generate-blog-cover
```

**响应**:
```json
{
  "success": true,
  "data": {
    "blogCoverUrl": "https://..."
  }
}
```

### 步骤2：生成中文音频

**API端点**: `POST /api/books/content/:contentId/generate-audio`

**请求体**:
```json
{
  "text": "中文内容文本",
  "language": "zh"
}
```

**说明**: 使用腾讯云TTS生成中文音频。

**示例请求**:
```bash
curl -X POST http://localhost:3001/api/books/content/{contentId}/generate-audio \
  -H "Content-Type: application/json" \
  -d '{
    "text": "这是中文内容...",
    "language": "zh"
  }'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "audioUrl": "https://..."
  }
}
```

### 步骤3：生成英文音频

**API端点**: `POST /api/books/content/:contentId/generate-audio`

**请求体**:
```json
{
  "text": "English content text",
  "language": "en"
}
```

**说明**: 使用腾讯云TTS生成英文音频。

**示例请求**:
```bash
curl -X POST http://localhost:3001/api/books/content/{contentId}/generate-audio \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is English content...",
    "language": "en"
  }'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "audioUrlEn": "https://..."
  }
}
```

### 步骤4：生成中文视频

**API端点**: `POST /api/books/content/:contentId/generate-video`

**请求体**:
```json
{
  "audioUrl": "https://...",  // 中文音频URL（可选，如果不提供则从content对象获取）
  "language": "zh"
}
```

**说明**: 
- 使用博客封面图作为背景
- 使用 `Videocreate.mov` 作为话筒视频（数字人）
- 将话筒视频叠加到背景图中间
- 合并中文音频
- 生成最终的中文视频（720x1280，9:16比例）

**示例请求**:
```bash
curl -X POST http://localhost:3001/api/books/content/{contentId}/generate-video \
  -H "Content-Type: application/json" \
  -d '{
    "language": "zh"
  }'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "videoUrl": "https://...",
    "contentId": "...",
    "language": "zh"
  }
}
```

### 步骤5：生成英文视频

**方式1：一键生成（推荐）**

**API端点**: `POST /api/books/content/:contentId/generate-english-video`

**说明**: 
- 自动翻译中文内容为英文（如果还没有翻译）
- 生成英文音频
- 使用博客封面图作为背景
- 使用 `Videocreate.mov` 作为话筒视频
- 生成最终的英文视频

**示例请求**:
```bash
curl -X POST http://localhost:3001/api/books/content/{contentId}/generate-english-video
```

**响应**:
```json
{
  "success": true,
  "data": {
    "videoUrlEn": "https://...",
    "contentId": "..."
  }
}
```

**方式2：分步生成**

如果已经生成了英文音频，可以直接使用 `generate-video` API：

```bash
curl -X POST http://localhost:3001/api/books/content/{contentId}/generate-video \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en"
  }'
```

## 视频生成原理

### 视频合成流程

1. **下载资源**:
   - 下载博客封面图
   - 下载音频文件（中文或英文）
   - 读取话筒视频文件（`Videocreate.mov`）

2. **视频处理**:
   - 将博客封面图转换为视频（静态图片，匹配音频时长）
   - 缩放话筒视频到合适大小（200x200）
   - 将话筒视频叠加到背景图中间
   - 合并音频轨道

3. **输出参数**:
   - 分辨率: 720x1280 (9:16竖屏)
   - 帧率: 30fps
   - 视频编码: H.264
   - 音频编码: AAC

### FFmpeg命令示例

```bash
ffmpeg \
  -loop 1 -t {audioDuration} -i {coverImagePath} \
  -stream_loop -1 -i {micVideoPath} \
  -i {audioPath} \
  -filter_complex "
    [0:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black[bg];
    [1:v]scale=200:200:force_original_aspect_ratio=decrease,pad=200:200:(ow-iw)/2:(oh-ih)/2:color=0x00000000[mic];
    [bg][mic]overlay=(W-w)/2:(H-h)/2[out]
  " \
  -map "[out]" -map 2:a \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 128k \
  -r 30 -pix_fmt yuv420p \
  {outputPath}
```

## 注意事项

1. **话筒视频文件**: 确保 `Videocreate.mov` 文件存在于 `admin API/routes/` 目录下
2. **博客封面图**: 必须先生成博客封面图，否则视频生成会失败
3. **音频文件**: 必须先生成对应语言的音频文件
4. **超时设置**: 视频生成可能需要较长时间（5-15分钟），请确保API超时时间足够长
5. **文件大小**: 生成的视频文件可能较大，确保有足够的存储空间

## 错误处理

### 常见错误

1. **话筒视频文件不存在**
   ```
   Error: 话筒视频文件不存在: /path/to/Videocreate.mov
   ```
   **解决方案**: 确保文件在正确位置

2. **博客封面图未生成**
   ```
   Error: 请先生成博客封面图
   ```
   **解决方案**: 先调用 `generate-blog-cover` API

3. **音频文件未生成**
   ```
   Error: 缺少中文音频URL，请先生成中文音频
   ```
   **解决方案**: 先调用 `generate-audio` API

4. **FFmpeg错误**
   ```
   Error: 视频合并失败
   ```
   **解决方案**: 检查FFmpeg是否正确安装，或重试

## 完整示例脚本

```bash
#!/bin/bash

# 配置
BOOK_ID="your-book-id"
CONTENT_ID="your-content-id"
API_BASE="http://localhost:3001/api"

# 步骤1: 生成博客封面图
echo "📸 步骤1: 生成博客封面图..."
curl -X POST "${API_BASE}/books/${BOOK_ID}/generate-blog-cover"

# 步骤2: 生成中文音频
echo "🎤 步骤2: 生成中文音频..."
curl -X POST "${API_BASE}/books/content/${CONTENT_ID}/generate-audio" \
  -H "Content-Type: application/json" \
  -d '{"text": "中文内容...", "language": "zh"}'

# 步骤3: 生成英文音频
echo "🎤 步骤3: 生成英文音频..."
curl -X POST "${API_BASE}/books/content/${CONTENT_ID}/generate-audio" \
  -H "Content-Type: application/json" \
  -d '{"text": "English content...", "language": "en"}'

# 步骤4: 生成中文视频
echo "🎬 步骤4: 生成中文视频..."
curl -X POST "${API_BASE}/books/content/${CONTENT_ID}/generate-video" \
  -H "Content-Type: application/json" \
  -d '{"language": "zh"}'

# 步骤5: 生成英文视频（一键生成）
echo "🎬 步骤5: 生成英文视频..."
curl -X POST "${API_BASE}/books/content/${CONTENT_ID}/generate-english-video"

echo "✅ 所有视频生成完成！"
```

## 相关文件

- `admin API/routes/books.js` - 视频生成API实现
- `admin API/routes/Videocreate.mov` - 话筒视频模板文件
- `admin/src/app/services/leancloud.ts` - 前端API调用封装

