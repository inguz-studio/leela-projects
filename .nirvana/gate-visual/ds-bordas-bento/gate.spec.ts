/**
 * Gate visual DS-BORDAS-E-BENTO — V2708-07 / V2708-02
 * Rodada 2026-08-27
 *
 * Telas verificadas:
 *   1. Login (AuthCard + Card do DS — sem borda decorativa)
 *   2. Recuperar senha (AuthCard)
 *   3. Cadastrar (AuthCard — inclui formulário com Card)
 *   4. Kits do evento (seções agora em Card do DS — V2708-02)
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.join(
  '/Users/vitorpiagge/dev/LEELA/.claude/worktrees/agent-a49ddb0e10886cb54/.nirvana/gate-visual/ds-bordas-bento',
);

test.use({ viewport: { width: 1440, height: 900 } });

test('01 — login: Card do DS sem borda decorativa (V2708-07)', async ({ page }) => {
  await page.goto('/conta/entrar', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login-card-sem-borda.png') });
  await expect(page.locator('body')).toBeVisible();
});

test('02 — recuperar senha: Card sem borda (V2708-07)', async ({ page }) => {
  await page.goto('/conta/recuperar-senha', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-recuperar-senha-sem-borda.png') });
  await expect(page.locator('body')).toBeVisible();
});

test('03 — cadastrar: AuthCard (Card do DS) sem borda (V2708-07)', async ({ page }) => {
  await page.goto('/conta/cadastrar', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-cadastrar-sem-borda.png') });
  await expect(page.locator('body')).toBeVisible();
});

test('04 — kits: seções em Card do DS (V2708-02)', async ({ page }) => {
  // Navega com auto-login pelo preview (castelo = marina@demo-leela.dev)
  // Usa 'load' em vez de 'networkidle': Firestore websocket impede networkidle
  await page.goto('/eventos/meia-floripa-2026/kits?preview=castelo', { waitUntil: 'load' });
  // Aguarda autenticação Firebase + carregamento de dados
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-kits-em-card.png'), fullPage: true });
  await expect(page.locator('body')).toBeVisible();
});
