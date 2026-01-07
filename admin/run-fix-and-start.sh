#!/bin/bash
# 修复权限并启动后台管理界面

cd "$(dirname "$0")"

echo "=========================================="
echo "🔧 修复权限并启动后台管理界面"
echo "=========================================="
echo ""
echo "步骤 1: 修复权限（需要输入管理员密码）"
echo ""

# 修复权限
sudo chown -R $(whoami) node_modules/.vite-temp 2>/dev/null || {
    sudo mkdir -p node_modules/.vite-temp
    sudo chown -R $(whoami) node_modules/.vite-temp
    chmod -R 755 node_modules/.vite-temp
}

if [ -w "node_modules/.vite-temp" ]; then
    echo "✅ 权限修复完成！"
    echo ""
    echo "步骤 2: 启动开发服务器..."
    echo ""
    npm run dev
else
    echo "❌ 权限修复失败"
    echo "请手动运行: sudo chown -R \$(whoami) node_modules/.vite-temp"
    exit 1
fi
