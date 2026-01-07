#!/bin/bash
# 前端启动脚本 - 解决权限问题

cd "$(dirname "$0")"

# 设置临时目录
export TMPDIR=/tmp
export TEMP=/tmp
export TMP=/tmp

# 创建用户可写的临时目录
VITE_TEMP_DIR="/tmp/vite-temp-$(whoami)"
mkdir -p "$VITE_TEMP_DIR"
chmod 755 "$VITE_TEMP_DIR"

# 尝试修复 node_modules/.vite-temp 权限
if [ -d "node_modules/.vite-temp" ]; then
    # 如果目录存在但不可写，尝试删除并创建符号链接
    if [ ! -w "node_modules/.vite-temp" ]; then
        # 尝试删除（可能需要sudo）
        rm -rf "node_modules/.vite-temp" 2>/dev/null || {
            echo "⚠️  无法删除 node_modules/.vite-temp，尝试创建符号链接..."
            # 如果删除失败，尝试创建符号链接（需要先删除）
            # 由于权限问题，我们使用一个变通方法
        }
    fi
fi

# 如果 node_modules/.vite-temp 不存在或不可写，创建符号链接
if [ ! -d "node_modules/.vite-temp" ] || [ ! -w "node_modules/.vite-temp" ]; then
    # 尝试创建符号链接
    ln -sfn "$VITE_TEMP_DIR" "node_modules/.vite-temp" 2>/dev/null || {
        echo "⚠️  无法创建符号链接，尝试使用环境变量..."
    }
fi

# 启动开发服务器
echo "🚀 启动前端开发服务器..."
npm run dev


