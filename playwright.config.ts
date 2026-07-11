import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright smoke e2e config — LEELA-S000-1-T2
 * Only chromium is installed. webServer starts both apps for local runs.
 * In CI, apps must be started separately before running playwright.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: 'list',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Alvo mobile real do gate visual (RESP-M1-T0) — fecha a promessa do
    // handoff §3.5 (desktop 1440×900 + mobile 390×844) nunca implementada.
    // 390×844 = viewport CSS de referência do lote responsivo; viewport
    // explícito evita o clamp do host HiDPI que mascarava os defeitos M1–M7.
    {
      name: 'mobile-390',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: false,
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @leela/painel dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @leela/landing dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});
