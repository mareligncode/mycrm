import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget =
    env.VITE_BACKEND_URL ||
    env.VITE_API_BASE_URL ||
    env.VITE_API_URL ||
    env.BACKEND_URL ||
    'http://localhost:3000';

  // Strip trailing '/api' or '/' so proxy forwards /api correctly to backend host
  const targetHost = backendTarget.replace(/\/api\/?$/, '').replace(/\/+$/, '') || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: targetHost,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
