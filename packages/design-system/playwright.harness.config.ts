import { defineConfig, devices } from '@playwright/test';

/**
 * Config de Playwright PRÓPRIO do design-system, para medição de layout real
 * (jsdom não tem motor de layout — ver custo-na-dobra.test.ts). Isolado do
 * `playwright.config.ts` da raiz (que sobe painel:5173 + landing:3000) para
 * nunca competir por porta com quem estiver rodando esses apps — o webServer
 * abaixo é o showroom do DS numa porta PRÓPRIA (5401), servido só para este
 * teste, dentro do worktree da lane.
 */
export default defineConfig({
  testDir: './e2e-harness',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:5401',
  },
  webServer: {
    command: 'pnpm exec vite --config showcase/vite.config.ts --port 5401 --strictPort',
    url: 'http://localhost:5401/harness-bottomnav.html',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
