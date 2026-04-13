import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig({
  plugins: [
    react(),

  ],
  optimizeDeps: {
    include: ['@daily-co/daily-js', '@daily-co/daily-react'],
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
