#!/bin/bash
# 前端开发服务器启动脚本
# 解决权限问题

cd "$(dirname "$0")"

# 设置临时目录到用户可写的位置
export TMPDIR=/tmp
export TEMP=/tmp
export TMP=/tmp

# 创建可写的临时目录用于 Vite
VITE_TEMP_DIR="/tmp/vite-temp-$(whoami)"
mkdir -p "$VITE_TEMP_DIR"
chmod 755 "$VITE_TEMP_DIR"

# 尝试修复 node_modules/.vite-temp 权限（如果可能）
if [ -d "node_modules/.vite-temp" ]; then
    # 如果目录存在但不可写，尝试创建符号链接
    if [ ! -w "node_modules/.vite-temp" ]; then
        rm -rf "node_modules/.vite-temp" 2>/dev/null || true
        mkdir -p "node_modules/.vite-temp"
        chmod 755 "node_modules/.vite-temp" 2>/dev/null || true
    fi
fi

# 启动开发服务器
npm run dev





















