# 使用 Node.js 18 官方镜像作为基础镜像
FROM node:18

# 设置工作目录
WORKDIR /app

# 安装系统依赖（包括 FFmpeg）
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装 Node.js 依赖
RUN npm install --production

# 复制应用代码
COPY . .

# 暴露端口（CloudBase 会自动映射，这里设置为 3001）
EXPOSE 3001

# 启动应用
CMD ["node", "server.js"]

