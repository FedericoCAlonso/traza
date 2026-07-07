import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Permite que funcione en subdirectorios como GitHub Pages
  plugins: [react()],
})
