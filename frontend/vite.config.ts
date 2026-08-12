import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendUrl = process.env.SOVA_BACKEND_URL ?? 'http://localhost:3001';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: backendUrl,
                changeOrigin: true,
            }
        }
    }
});
