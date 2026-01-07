import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  cacheDir: process.env.VITE_CACHE_DIR || '/tmp/vite-cache-frontend', // 使用临时目录避免权限问题
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    force: true, // 强制重新构建依赖，解决 "Outdated Optimize Dep" 错误
  },
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: 5173, // 前端应用使用5173端口
    fs: {
      strict: true,
    },
    hmr: process.env.NODE_ENV === 'production' ? false : {
      host: 'localhost',
    },
    cors: true,
    open: false, // 不自动打开浏览器
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: false,
  },
})

