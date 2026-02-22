import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // ensures assets are linked relatively for GitHub Pages
  server: {
    watch: {
      usePolling: true,
    },
    host: true, // needed for the Docker container port mapping to work
    strictPort: true,
    port: 3000, 
  }
})
