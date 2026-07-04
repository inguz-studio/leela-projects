// =============================================================================
// Wiring da porta `criarEvento` para runtime.
//
// A implementação concreta é o wrapper `packages/api-client/src/eventos/
// mutations.ts` → `criarEvento` (lote E03-L2 · Fable, EM CONSTRUÇÃO). Enquanto
// não existe, o default rejeita com mensagem instrutiva (a UI mostra Toast de
// erro). Assim que L2 publicar `mutations.ts`, trocar este default por:
//
//   import { criarEvento } from '@leela/api-client';
//   export const criarEventoPadrao: CriarEventoFn = criarEvento;
//
// (mudança de 1 linha; nenhuma outra tela muda — a porta isola o acoplamento.)
// =============================================================================

import type { CriarEventoFn } from './contracts';

/** Default até o L2 publicar o wrapper. Rejeita de forma explícita. */
export const criarEventoPadrao: CriarEventoFn = () =>
  Promise.reject(
    new Error(
      'criarEvento indisponível: a Function do lote E03-L2 ainda não foi publicada.',
    ),
  );
