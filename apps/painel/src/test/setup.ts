import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// =============================================================================
// Teto de espera do RTL (LEELA-DEBT-T3 · SUITE-STAB).
//
// `findBy*` e `waitFor` desistem em 1s por padrão. Numa suíte de 180 arquivos
// em processos paralelos, 1s é o tempo que uma tela pesada leva só para o
// segundo ciclo de render — daí telas que passam isoladas e falham sob carga
// com "Unable to find element", que soa como bug de DOM e é fila de CPU.
//
// 5s absorve a contenção e continua MUITO abaixo do teto do teste (20s, em
// vitest.config.ts). A ordem entre os dois é deliberada: quando algo realmente
// não aparece, quem falha primeiro é o RTL, e ele diz QUAL elemento faltou. Se
// o teto do teste caísse antes, a mensagem seria só "test timed out" e a
// depuração começaria do zero.
// =============================================================================
configure({ asyncUtilTimeout: 5_000 });

// Polyfills para jsdom — cmdk (Command) e @radix-ui (Popover) que o Combobox e o
// Calendar do DS usam dependem de APIs de layout/ponteiro que o jsdom não
// implementa. Sem eles, montar/abrir Combobox/Calendar em teste lança
// (ResizeObserver/scrollIntoView/pointer capture). Réplica do setup do DS
// (packages/design-system/src/test/setup.ts) — pendência 2 do R9-A. (S-R9-01.)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

if (typeof Element !== 'undefined') {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView(): void {};
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = function hasPointerCapture(): boolean {
      return false;
    };
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function setPointerCapture(): void {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = function releasePointerCapture(): void {};
  }
}
