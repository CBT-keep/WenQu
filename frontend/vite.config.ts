import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// 后端统一前缀 /api/v1（见 doc/04 §1.1），开发期由 Vite 代理到 :8080
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // E 盘（虚拟盘/网络盘）上原生文件事件不触发，改文件后 dev server 会继续发旧模块，
    // 表现为"明明改了却没生效、要重启才认"。改用轮询保稳。
    watch: {
      usePolling: true,
      interval: 400,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
