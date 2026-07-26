import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// На GitHub Pages сайт отдаётся из подпапки /hehe/, локально — из корня.
// Workflow сборки выставляет BASE_PATH, поэтому dev-сервер не трогаем.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: { port: 5173 },
})
