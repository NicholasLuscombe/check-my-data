import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
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
    // `exclude` REPLACES vitest's defaults rather than merging with them, so
    // the spread is load-bearing — a bare exclude drops '**/node_modules/**'
    // and collects the dependency tree. '.claude' is not covered by the
    // default '**/.{idea,git,cache,output,temp}/**', so a worktree the harness
    // creates inside the repo is collected as a second full copy of the suite
    // (P241; S403 measured 16 files becoming 48 across two worktrees, and the
    // arm-B wiring check reading 'Test Files 3 passed (3)' as a result).
    exclude: [...configDefaults.exclude, '**/.claude/worktrees/**'],
  },
});
