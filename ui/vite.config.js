import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// keine __dirname-Magie nötig; alias mit Root-Pfad
export default defineConfig({
  base: '/opengov-privacy-app/',   // bei GH Pages = Repo-Name; sonst '/'
  plugins: [react()],               // ← WICHTIG: mit Klammern aufrufen!
  resolve: {
    alias: {
      '@': '/src'                   // alias für "@/..." → "ui/src"
    }
  }
})
