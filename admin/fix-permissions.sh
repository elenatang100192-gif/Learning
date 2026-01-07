#!/bin/bash
# 修复权限脚本 - 需要在终端中手动运行并输入密码

cd "$(dirname "$0")"

echo "🔧 正在修复文件权限..."
echo "⚠️  需要输入管理员密码"

# 修复源文件权限
echo "修复 src 目录权限..."
sudo chown -R $(whoami) src/ 2>/dev/null || echo "警告: 无法修复 src 目录权限"

# 修复 node_modules/.vite-temp 权限
echo "修复 node_modules/.vite-temp 权限..."
sudo chown -R $(whoami) node_modules/.vite-temp 2>/dev/null || {
    echo "创建 node_modules/.vite-temp 目录..."
    sudo mkdir -p node_modules/.vite-temp
    sudo chown -R $(whoami) node_modules/.vite-temp
    chmod -R 755 node_modules/.vite-temp
}

if [ -w "src" ] && [ -w "node_modules/.vite-temp" ]; then
    echo "✅ 权限修复完成！"
    echo "🚀 现在可以运行: npm run dev"
else
    echo "❌ 权限修复失败，请手动检查"
fi






