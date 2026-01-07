import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5175, // 后台管理界面使用5175端口
  },
  cacheDir: process.env.VITE_CACHE_DIR || '/tmp/vite-cache-admin', // 使用临时目录避免权限问题
  optimizeDeps: {
    force: true, // 强制重新构建依赖，解决 "Outdated Optimize Dep" 错误
  },
})
