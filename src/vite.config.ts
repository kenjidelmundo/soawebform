import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:7172',
        changeOrigin: true,
        secure: false, // ✅ allow dev https cert
      },
    },
  },
});