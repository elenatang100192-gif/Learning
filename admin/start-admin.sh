#!/bin/bash
# 后台管理界面启动脚本

cd "$(dirname "$0")"

# 设置临时目录
export TMPDIR=/tmp
export TEMP=/tmp
export TMP=/tmp

# 创建用户可写的临时目录
VITE_TEMP_DIR="/tmp/vite-temp-admin-$(whoami)"
mkdir -p "$VITE_TEMP_DIR"
chmod 755 "$VITE_TEMP_DIR"

echo "🚀 启动后台管理界面开发服务器..."
echo "📋 如果遇到权限问题，请运行: sudo chown -R \$(whoami) node_modules/.vite-temp"

npm run dev






