import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  base: '/opengov-privacy-app/', // GH Pages: repo name; on your server use '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})