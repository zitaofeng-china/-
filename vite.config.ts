import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite supports WASM imports out of the box. If you add a .wasm file,
// you can import it with `?url` or `?init` depending on your loader.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // 优化构建
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom']
        }
      }
    }
  }
})

