#!/bin/bash

# 视频生成脚本
# 使用 Videocreate.mov 话筒视频生成中英文视频

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置
API_BASE="${API_BASE:-http://localhost:3001/api}"

# 检查参数
if [ $# -lt 2 ]; then
    echo -e "${RED}❌ 用法: $0 <BOOK_ID> <CONTENT_ID>${NC}"
    echo ""
    echo "示例:"
    echo "  $0 abc123 def456"
    exit 1
fi

BOOK_ID=$1
CONTENT_ID=$2

echo -e "${GREEN}🚀 开始生成视频流程...${NC}"
echo "📚 书籍ID: $BOOK_ID"
echo "📄 内容ID: $CONTENT_ID"
echo "🌐 API地址: $API_BASE"
echo ""

# 检查话筒视频文件
MIC_VIDEO_PATH="admin API/routes/Videocreate.mov"
if [ ! -f "$MIC_VIDEO_PATH" ]; then
    echo -e "${RED}❌ 错误: 话筒视频文件不存在: $MIC_VIDEO_PATH${NC}"
    echo "请确保 Videocreate.mov 文件在正确位置"
    exit 1
fi
echo -e "${GREEN}✅ 话筒视频文件检查通过: $MIC_VIDEO_PATH${NC}"
echo ""

# 步骤1: 生成博客封面图
echo -e "${YELLOW}📸 步骤1/5: 生成博客封面图...${NC}"
RESPONSE=$(curl -s -X POST "${API_BASE}/books/${BOOK_ID}/generate-blog-cover")
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ 博客封面图生成成功${NC}"
else
    echo -e "${RED}❌ 博客封面图生成失败${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi
echo ""

# 步骤2: 生成中文音频
echo -e "${YELLOW}🎤 步骤2/5: 生成中文音频...${NC}"
echo -e "${YELLOW}⚠️  提示: 请确保已从内容中提取了中文文本${NC}"
RESPONSE=$(curl -s -X POST "${API_BASE}/books/content/${CONTENT_ID}/generate-audio" \
  -H "Content-Type: application/json" \
  -d '{"language": "zh"}')
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ 中文音频生成成功${NC}"
else
    echo -e "${RED}❌ 中文音频生成失败${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi
echo ""

# 步骤3: 生成英文音频
echo -e "${YELLOW}🎤 步骤3/5: 生成英文音频...${NC}"
echo -e "${YELLOW}⚠️  提示: 如果内容未翻译，将自动翻译${NC}"
RESPONSE=$(curl -s -X POST "${API_BASE}/books/content/${CONTENT_ID}/generate-audio" \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}')
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ 英文音频生成成功${NC}"
else
    echo -e "${RED}❌ 英文音频生成失败${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi
echo ""

# 步骤4: 生成中文视频
echo -e "${YELLOW}🎬 步骤4/5: 生成中文视频（使用博客封面图 + 话筒视频 + 中文音频）...${NC}"
echo -e "${YELLOW}⏳ 这可能需要5-15分钟，请耐心等待...${NC}"
RESPONSE=$(curl -s -X POST "${API_BASE}/books/content/${CONTENT_ID}/generate-video" \
  -H "Content-Type: application/json" \
  -d '{"language": "zh"}')
if echo "$RESPONSE" | grep -q '"success":true'; then
    VIDEO_URL=$(echo "$RESPONSE" | jq -r '.data.videoUrl' 2>/dev/null)
    echo -e "${GREEN}✅ 中文视频生成成功${NC}"
    echo -e "${GREEN}📹 视频URL: $VIDEO_URL${NC}"
else
    echo -e "${RED}❌ 中文视频生成失败${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi
echo ""

# 步骤5: 生成英文视频（一键生成）
echo -e "${YELLOW}🎬 步骤5/5: 生成英文视频（一键生成：翻译 + 英文音频 + 合并视频）...${NC}"
echo -e "${YELLOW}⏳ 这可能需要5-15分钟，请耐心等待...${NC}"
RESPONSE=$(curl -s -X POST "${API_BASE}/books/content/${CONTENT_ID}/generate-english-video")
if echo "$RESPONSE" | grep -q '"success":true'; then
    VIDEO_URL_EN=$(echo "$RESPONSE" | jq -r '.data.videoUrlEn' 2>/dev/null)
    echo -e "${GREEN}✅ 英文视频生成成功${NC}"
    echo -e "${GREEN}📹 视频URL: $VIDEO_URL_EN${NC}"
else
    echo -e "${RED}❌ 英文视频生成失败${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi
echo ""

echo -e "${GREEN}🎉 所有视频生成完成！${NC}"
echo ""
echo "📊 生成结果:"
echo "  📹 中文视频: $VIDEO_URL"
echo "  📹 英文视频: $VIDEO_URL_EN"

