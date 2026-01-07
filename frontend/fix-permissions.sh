#!/bin/bash
# 修复 node_modules 权限的脚本
# 需要管理员权限运行

cd "$(dirname "$0")"

echo "正在修复 node_modules 权限..."
sudo chown -R $(whoami) node_modules/.vite-temp 2>/dev/null || {
    echo "创建 node_modules/.vite-temp 目录..."
    sudo mkdir -p node_modules/.vite-temp
    sudo chown -R $(whoami) node_modules/.vite-temp
    chmod -R 755 node_modules/.vite-temp
}

echo "✅ 权限修复完成！"
