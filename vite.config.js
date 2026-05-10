import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime — always loaded first
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // Router
          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) {
            return 'vendor-router';
          }
          // Map libraries (heavy, only needed on map/region pages)
          if (
            id.includes('node_modules/leaflet') ||
            id.includes('node_modules/react-leaflet') ||
            id.includes('node_modules/@react-leaflet')
          ) {
            return 'vendor-maps';
          }
          // Charts (only needed on statistics pages)
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-')) {
            return 'vendor-charts';
          }
          // GIS / geometry (only needed on admin create-region page)
          if (id.includes('node_modules/@turf') || id.includes('node_modules/turf')) {
            return 'vendor-turf';
          }
          // Markdown renderer (only needed inside ChatBot when opened)
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark') || id.includes('node_modules/rehype') || id.includes('node_modules/unified') || id.includes('node_modules/micromark') || id.includes('node_modules/mdast') || id.includes('node_modules/hast') || id.includes('node_modules/vfile')) {
            return 'vendor-markdown';
          }
          // Icons (split by icon set to avoid loading all 10MB+)
          if (id.includes('node_modules/react-icons')) {
            return 'vendor-icons';
          }
          // Other node_modules go into a general vendor chunk
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        }
      }
    }
  }
})
