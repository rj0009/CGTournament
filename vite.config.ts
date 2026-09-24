import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // The app runs Vite in Express middleware mode without a WebSocket server.
      // Disable the injected HMR client so the preview does not repeatedly attempt
      // to connect to a WebSocket endpoint that the server cannot upgrade.
      hmr: false,
      // Keep file watching available for regular Vite rebuilds and reloads.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
