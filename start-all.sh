#!/bin/bash
# 同时启动前端、后台管理和后端API

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  启动所有服务（前端、后台管理、后端API）${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查并创建日志目录
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

# 函数：清理函数（当脚本退出时）
cleanup() {
    echo ""
    echo -e "${YELLOW}正在停止所有服务...${NC}"
    kill $FRONTEND_PID $ADMIN_PID $API_PID 2>/dev/null
    wait $FRONTEND_PID $ADMIN_PID $API_PID 2>/dev/null
    echo -e "${GREEN}所有服务已停止${NC}"
    exit 0
}

# 捕获退出信号
trap cleanup SIGINT SIGTERM

# 1. 启动后端API
echo -e "${GREEN}[1/3] 启动后端API服务器...${NC}"
cd "$SCRIPT_DIR/admin API"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}后端API: 正在安装依赖...${NC}"
    npm install
fi
node server.js > "$LOG_DIR/api.log" 2>&1 &
API_PID=$!
echo -e "${GREEN}后端API已启动 (PID: $API_PID, 端口: 3001)${NC}"
echo -e "${BLUE}日志文件: $LOG_DIR/api.log${NC}"
sleep 2

# 2. 启动前端
echo ""
echo -e "${GREEN}[2/3] 启动前端开发服务器...${NC}"
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}前端: 正在安装依赖...${NC}"
    npm install
fi
npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}前端已启动 (PID: $FRONTEND_PID, 端口: 5173/5174)${NC}"
echo -e "${BLUE}日志文件: $LOG_DIR/frontend.log${NC}"
sleep 2

# 3. 启动后台管理
echo ""
echo -e "${GREEN}[3/3] 启动后台管理界面...${NC}"
cd "$SCRIPT_DIR/admin"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}后台管理: 正在安装依赖...${NC}"
    npm install
fi
npm run dev > "$LOG_DIR/admin.log" 2>&1 &
ADMIN_PID=$!
echo -e "${GREEN}后台管理已启动 (PID: $ADMIN_PID, 端口: 5175/5176)${NC}"
echo -e "${BLUE}日志文件: $LOG_DIR/admin.log${NC}"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ 所有服务已启动！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}服务地址：${NC}"
echo -e "  后端API:  http://localhost:3001"
echo -e "  前端:     http://localhost:5173 或 http://localhost:5174"
echo -e "  后台管理: http://localhost:5175 或 http://localhost:5176"
echo ""
echo -e "${YELLOW}日志文件：${NC}"
echo -e "  后端API:  $LOG_DIR/api.log"
echo -e "  前端:     $LOG_DIR/frontend.log"
echo -e "  后台管理: $LOG_DIR/admin.log"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止所有服务${NC}"
echo ""

# 等待所有进程
wait

