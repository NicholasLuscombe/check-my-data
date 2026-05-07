import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    // Pin to IPv4 loopback. Vite on macOS otherwise binds 'localhost' to
    // ::1 only on dual-stack systems; HTTP/1.1 keep-alive over IPv6 then
    // produces a connection-refused / timeout cascade against IPv4
    // clients (S129 surfaced this; S130 hardens project-wide).
    host: '127.0.0.1',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
  },
});
