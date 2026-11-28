import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const BACKEND_ROUTES = [
  '/health',
  '/categories',
  '/scenarios',
  '/transactions',
  '/pending',
  '/labels',
  '/summary',
  '/aging',
  '/reset',
  '/advice',
  '/vouchers',
  '/profile',
  '/auth',
];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      BACKEND_ROUTES.map((route) => [
        route,
        {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      ]),
    ),
  },
});
