# 前端启动说明

## ⚠️ 权限问题

由于 `node_modules` 目录的所有者是 root，需要先修复权限。

## 快速启动步骤

### 1. 修复权限（需要管理员密码）
```bash
cd /Users/et/Desktop/Learning/frontend
sudo chown -R $(whoami) node_modules/.vite-temp
```

### 2. 启动前端服务器
```bash
npm run dev
```

## 当前状态

- ✅ 后端服务器已启动：http://localhost:3001
- ⚠️ 前端服务器需要修复权限后才能启动

## 服务地址

启动成功后，前端将在以下地址运行：
- http://localhost:5173 (或 Vite 自动分配的端口)


