import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Testes do painel (RTL + unit). Espelha o setup do design-system:
// jsdom + jest-dom + globals. Não roda Emulator aqui — telas testam
// comportamento com dados mockados (api-client) e helpers puros.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    // -------------------------------------------------------------------------
    // Tetos de tempo dimensionados pela suíte REAL (LEELA-DEBT-T3 · SUITE-STAB).
    //
    // Sete arquivos (EventoForm, CadastrarPage, RedefinirSenhaPage,
    // NovoClubePage, ItemKitModal, MarcasPage, ContaPage) estouravam o teto de
    // 5s do vitest sob carga e passavam verdes isolados — o retrato de um teto
    // apertado, não de um defeito. Medido nesta máquina com a suíte ociosa, os
    // casos mais pesados desses arquivos gastam 2,9s e 2,1s: já 58% e 42% do
    // teto antigo ANTES de disputar CPU com os outros 179 arquivos. Qualquer
    // contenção normal (a suíte roda em processos paralelos, e a máquina de
    // desenvolvimento ainda segura o preview) empurra os 2,9s por cima de 5s.
    //
    // 20s dá ~7x de folga sobre o pior caso conhecido. É folga para ESPERA, não
    // licença para teste lento: teste travado de verdade não passa a esperar
    // 20s calado, porque o teto de espera do RTL (5s, em src/test/setup.ts) cai
    // antes e falha dizendo QUAL elemento não apareceu.
    //
    // A outra metade do conserto não é teto nenhum: o `EventoForm` gastava 17,4s
    // porque o user-event esperava um relógio congelado andar sozinho. Isso foi
    // resolvido na causa (src/test/usuario.ts) e o arquivo caiu para 4,0s.
    // -------------------------------------------------------------------------
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
