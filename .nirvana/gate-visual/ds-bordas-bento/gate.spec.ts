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

// As fotos caem ao lado deste spec (onde as de 27/08 já estão versionadas),
// em qualquer pasta em que o repo esteja clonado. Sem caminho absoluto.
const SCREENSHOT_DIR = __dirname;

test.use({ viewport: { width: 1440, height: 900 } });

// Rotas reais do painel: apps/painel/src/App.tsx (AuthLayout, sem prefixo /conta).
// Cada tela é provada pelo caminho exato da URL (pathname, não sufixo: `/conta/entrar`
// termina em `/entrar`) e pelo título (<h1> do AuthCard) ANTES da foto: se a rota
// redirecionar ou não existir (ex.: cair no login), o teste FALHA em vez de gravar
// a foto errada por cima da prova.

test('01 — login: Card do DS sem borda decorativa (V2708-07)', async ({ page }) => {
  await page.goto('/entrar', { waitUntil: 'networkidle' });
  expect(new URL(page.url()).pathname).toBe('/entrar');
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar', exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login-card-sem-borda.png') });
});

test('02 — recuperar senha: Card sem borda (V2708-07)', async ({ page }) => {
  await page.goto('/recuperar-senha', { waitUntil: 'networkidle' });
  expect(new URL(page.url()).pathname).toBe('/recuperar-senha');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Recuperar senha', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-recuperar-senha-sem-borda.png') });
});

test('03 — cadastrar: AuthCard (Card do DS) sem borda (V2708-07)', async ({ page }) => {
  await page.goto('/cadastrar', { waitUntil: 'networkidle' });
  expect(new URL(page.url()).pathname).toBe('/cadastrar');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Criar conta de organizador', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-cadastrar-sem-borda.png') });
});

test('04 — kits: seções em Card do DS (V2708-02)', async ({ page }) => {
  // Navega com auto-login pelo preview (castelo = marina@demo-leela.dev)
  // Usa 'load' em vez de 'networkidle': Firestore websocket impede networkidle
  await page.goto('/eventos/meia-floripa-2026/kits?preview=castelo', { waitUntil: 'load' });
  // Aguarda autenticação Firebase + carregamento de dados
  await page.waitForTimeout(5000);
  // Só a tela de kits tem estes dois <h2> (os dois Cards bento do V2708-02);
  // o login não tem. A view só os monta depois do carregamento (antes é skeleton).
  expect(new URL(page.url()).pathname).toBe('/eventos/meia-floripa-2026/kits');
  await expect(page.getByRole('heading', { level: 2, name: 'Kits', exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole('heading', { level: 2, name: 'Catálogo de itens', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-kits-em-card.png'), fullPage: true });
});
