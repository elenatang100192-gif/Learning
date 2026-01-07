# 后台管理界面启动说明

## ⚠️ 权限问题

由于 `node_modules` 目录的所有者是 root，需要先修复权限。

## 快速启动步骤

### 1. 修复权限（需要管理员密码）
```bash
cd /Users/et/Desktop/Learning/admin
sudo chown -R $(whoami) node_modules/.vite-temp
```

### 2. 启动后台管理界面
```bash
npm run dev
```

或者使用启动脚本：
```bash
./start-admin.sh
```

## 服务地址

启动成功后，后台管理界面将在以下地址运行：
- http://localhost:5175

## 当前状态

- ✅ 后端服务器：http://localhost:3001
- ⚠️ 后台管理界面：需要修复权限后启动



















