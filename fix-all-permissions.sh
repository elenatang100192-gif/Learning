#!/bin/bash

# 修复所有文件的权限，将 root 拥有的文件改为当前用户

echo "🔧 开始修复文件权限..."

# 获取当前用户名
CURRENT_USER=$(whoami)

# 修复整个 Learning 目录的权限
echo "📁 修复 /Users/et/Desktop/Learning 目录权限..."
sudo chown -R "$CURRENT_USER:staff" "/Users/et/Desktop/Learning"

# 确保文件有正确的读写权限
echo "🔐 设置文件权限..."
find "/Users/et/Desktop/Learning" -type f -exec chmod 644 {} \;
find "/Users/et/Desktop/Learning" -type d -exec chmod 755 {} \;

# 确保脚本文件有执行权限
find "/Users/et/Desktop/Learning" -name "*.sh" -exec chmod 755 {} \;

echo "✅ 权限修复完成！"
echo "📋 当前用户: $CURRENT_USER"
