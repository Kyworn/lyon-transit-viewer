import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Keep REACT_APP_ prefix so existing .env files work unchanged.
export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'REACT_APP_'],
  server: {
    port: 3001,
    strictPort: false,
  },
  build: {
    outDir: 'build',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  },
});
