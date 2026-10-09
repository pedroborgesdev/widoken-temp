import { defineConfig } from '@playwright/test'

/**
 * Browser-preview end-to-end tests. They run the Vite preview server (the same
 * one used by `npm run dev:web`) and exercise the in-memory desktop mock, so no
 * real credential is ever read or written.
 */
export default defineConfig({
  testDir: './tests/e2e-preview',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5199',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --config vite.web.config.ts --port 5199 --strictPort',
    url: 'http://127.0.0.1:5199/dashboard.html',
    reuseExistingServer: true,
    timeout: 120_000
  }
})
