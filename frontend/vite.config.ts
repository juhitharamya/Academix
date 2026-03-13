import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..');
  const env = loadEnv(mode, repoRoot, '');

  const portFromEnv = Number.parseInt(process.env.PORT || '', 10);
  const basePort = Number.isFinite(portFromEnv) ? portFromEnv : 3001;
  const apiPortFromEnv = Number.parseInt(process.env.API_PORT || '', 10);
  const apiPort = Number.isFinite(apiPortFromEnv) ? apiPortFromEnv : 3002;
  const hmrPortFromEnv = Number.parseInt(process.env.HMR_PORT || '', 10);
  const hmrPort = Number.isFinite(hmrPortFromEnv) ? hmrPortFromEnv : basePort + 1000;

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: basePort,
      strictPort: true,
      // Set an HMR port derived from PORT to avoid collisions when multiple dev servers run.
      // You can override with HMR_PORT or disable with DISABLE_HMR=true.
      hmr: process.env.DISABLE_HMR === 'true' ? false : {port: hmrPort, clientPort: hmrPort},
      proxy: {
        // Use IPv4 loopback to avoid Windows resolving localhost to ::1 (IPv6) while backend listens on IPv4.
        '/api': `http://127.0.0.1:${apiPort}`,
        '/swagger': `http://127.0.0.1:${apiPort}`,
        '/api-docs.json': `http://127.0.0.1:${apiPort}`,
      },
    },
  };
});
