import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/katex/')) return 'katex';
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => `/wafaaamro${path}`,
      },
      '/media': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => `/wafaaamro/api/uploads${path.replace(/^\/media/, '')}`,
      },
    },
  },
});
