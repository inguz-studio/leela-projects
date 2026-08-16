import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Testes da landing (unit + RTL) — bootstrap no lote LANDING-SECFIX (W2-F-01 e
// W2-F-05 exigem prova executável). Espelha o setup do painel/DS: jsdom +
// globals off (imports explícitos de `vitest`).
//
// -----------------------------------------------------------------------------
// POR QUE NÃO EXISTE MAIS ALIAS DE `@leela/design-system` AQUI (S1260).
//
// O alias apontava para `packages/design-system/src/index.ts` com a intenção de
// "não depender de dist build para rodar teste". O efeito medido foi outro: o
// barril do DS puxa ~296 módulos de fonte, e o vite-node avalia módulo a módulo,
// por RPC, DENTRO de cada arquivo de teste. Medição desta lane, nesta máquina:
//
//   import('@/app/_ds/ds')  →  35s a 62s   POR ARQUIVO DE TESTE
//
// E o custo é de AVALIAÇÃO, não de transform: um segundo arquivo no mesmo run,
// com todo o transform já quente (9s no run inteiro), pagou 46s de novo. Como o
// teto de um caso é 20s (5s no default), o PRIMEIRO caso de todo arquivo que
// encosta no DS estourava por IMPORT, nunca por comportamento — e o `act()` que
// ficava pendente contaminava os casos seguintes do arquivo. Daí o retrato que a
// review antagonista mediu: `definir-senha-s1223` reprovando 13 de 13 sozinho,
// "spy" não chamado em massa (o efeito não chega a rodar) e a INSTABILIDADE
// entre execuções — 35s e 62s são o mesmo import, e o que decide o lado do teto
// é a contenção de CPU dos 3 workers, não o código.
//
// O painel, que é a referência desta suíte, NUNCA teve esse alias: resolve o DS
// pelo `exports` do pacote, ou seja, pelo dist bundlado — poucos módulos, import
// barato. A landing era a única fora do padrão, e já resolvia `@leela/core` e
// `@leela/api-client` por dist do mesmo jeito. Voltar ao padrão da casa é o
// conserto; o frescor do dist é responsabilidade do `^build` do turbo (turbo.json
// declara `test.dependsOn: ["^build"]`) e do gate de frescor, não do alias.
// -----------------------------------------------------------------------------
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    css: false,
    // O aquecimento do barril do DS. O porquê inteiro está em `test/setup.ts`.
    setupFiles: ['./test/setup.ts'],
    // Tetos dimensionados como no painel (que já viveu esta mesma dor em
    // LEELA-DEBT-T3 · SUITE-STAB). O teto do CASO mede comportamento; o teto do
    // HOOK cobre o aquecimento do DS, que é import e não teste. 55 dos 65
    // arquivos rodavam no default de 5s e não tinham folga nenhuma.
    testTimeout: 20_000,
    hookTimeout: 60_000,
    server: {
      deps: {
        // ---------------------------------------------------------------------
        // A SEGUNDA METADE DO CONSERTO DA S1260 — e a menos óbvia.
        //
        // Tirar o alias do SRC não bastou: o import continuou custando ~12s a
        // 18s POR ARQUIVO. O motivo é a resolução do pnpm. `@leela/*` é link de
        // workspace, e o Vite resolve link para o caminho REAL
        // (`packages/design-system/dist/index.mjs`) — que não contém
        // `/node_modules/`. A regra default de externalização do Vitest é
        // exatamente essa substring, então os três pacotes da casa caíam no
        // lado INLINE e o dist bundlado voltava a ser mastigado pelo vite-node,
        // módulo a módulo, em todo arquivo de teste.
        //
        // Declarando-os externos, quem carrega é o Node, direto do bundle. É o
        // mesmo caminho que o painel já pega de graça.
        // ---------------------------------------------------------------------
        external: [/[\\/]packages[\\/](design-system|core|api-client)[\\/]dist[\\/]/],
      },
    },
  },
});
