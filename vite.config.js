import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      'macbook-air-de-yosvany.local',
      'MacBook-Air-de-Yosvany.local'
    ]
  }
})
