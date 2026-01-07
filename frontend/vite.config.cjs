const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const tailwindcss = require('@tailwindcss/vite');

// https://vitejs.dev/config/
module.exports = defineConfig({
  cacheDir: '/tmp/vite-cache', // 使用临时目录避免权限问题
  plugins: [
    react(),
    tailwindcss(), // Tailwind CSS v4 插件
  ],
  server: {
    host: '0.0.0.0', // 允许外部访问
    // 移除固定端口，让vite自动选择可用端口
    // 强制禁用缓存
    fs: {
      strict: true,
    },
    // HMR配置 - 使用自动端口
    hmr: process.env.NODE_ENV === 'production' ? false : {
      // 不指定固定端口，让vite自动处理
      host: 'localhost',
    },
    // 允许跨域
    cors: true,
    // 开发服务器选项
    open: false, // 不自动打开浏览器
  },
  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: true,
    // 开发时禁用缓存
    minify: false,
    rollupOptions: {
      output: {
        // 添加时间戳确保每次构建文件名不同
        entryFileNames: 'assets/[name]-[hash]-[Date.now()].js',
        chunkFileNames: 'assets/[name]-[hash]-[Date.now()].js',
        assetFileNames: 'assets/[name]-[hash]-[Date.now()].[ext]'
      }
    }
  },
  // 确保每次重启都重新构建
  optimizeDeps: {
    force: true,
  },
});

