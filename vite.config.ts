import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      /*
       * DAU HIEU PHIEN BAN, dong vao luc build.
       *
       * Nhieu lan sua giao dien roi khong biet app dang chay ban nao: Vercel
       * chua build xong, build hong, hay trinh duyet con giu ban cu. Dan ma
       * commit vao man hinh thi doi chieu duoc trong mot giay, khong phai doan.
       *
       * Tren Vercel lay tu VERCEL_GIT_COMMIT_SHA; chay tai may thi ghi 'local'.
       */
      __BUILD_ID__: JSON.stringify(
        (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || 'local',
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Cho phep truy cap qua domain cua GitHub Codespaces (*.app.github.dev)
      // va cac moi truong dev tu xa khac. Chi anh huong may chu dev.
      allowedHosts: true,
    },
  };
});
