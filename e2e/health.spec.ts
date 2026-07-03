import { test, expect } from '@playwright/test';

/**
 * Smoke e2e: verify /health endpoints for both apps.
 * LEELA-S000-1-T2 — playwright install chromium (only)
 */

test('painel /health renders ok', async ({ page }) => {
  await page.goto('http://localhost:5173/health');
  await expect(page.getByTestId('health-status')).toBeVisible();
  await expect(page.getByTestId('health-status')).toHaveText('ok');
});

test('landing /health returns { status: ok }', async ({ request }) => {
  const response = await request.get('http://localhost:3000/health');
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { status: string };
  expect(body.status).toBe('ok');
});
