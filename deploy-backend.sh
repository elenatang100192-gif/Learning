#!/bin/bash
# 部署后端API到腾讯云CloudBase

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 开始部署后端API到腾讯云CloudBase..."
echo ""

# 检查CloudBase CLI是否已安装
if ! command -v tcb &> /dev/null; then
    echo "❌ CloudBase CLI未安装，正在安装..."
    npm install -g @cloudbase/cli
fi

# 检查是否已登录
echo "🔐 检查登录状态..."
if ! tcb env:list &> /dev/null; then
    echo "⚠️  未登录CloudBase，请先登录..."
    echo "📋 正在打开登录页面..."
    tcb login
    echo ""
fi

# 确认环境ID
ENV_ID="video-app-backend-215072-7-1319956699"
echo "🌐 环境ID: $ENV_ID"
echo ""

# 进入后端目录
cd "admin API"

echo "📦 准备部署文件..."
echo ""

# 使用Framework方式部署（推荐）
echo "🚀 使用CloudBase Framework部署..."
tcb framework:deploy

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 部署信息："
echo "   - 环境ID: $ENV_ID"
echo "   - 服务名称: video-app-backend"
echo "   - 端口: 3001"
echo ""
echo "🔗 服务地址: https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com"
echo ""
echo "💡 提示：如果部署失败，请检查："
echo "   1. 是否已登录CloudBase (tcb login)"
echo "   2. 是否有部署权限"
echo "   3. 查看部署日志获取详细错误信息"

