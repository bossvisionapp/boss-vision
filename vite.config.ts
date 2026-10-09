import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GH_PAGES=1 — сборка для GitHub Pages (сайт живёт в подпапке /boss-vision/); на Vercel — корень
export default defineConfig({
  base: process.env.GH_PAGES ? '/boss-vision/' : '/',
  plugins: [react(), tailwindcss()],
})
