// =============================================================================
// Wiring da porta `criarEvento` para runtime.
//
// A implementação concreta é o wrapper `packages/api-client/src/eventos/
// mutations.ts` → `criarEvento(functions, input)` (lote E03-L2 · Fable,
// PUBLICADO). O wrapper recebe a instância de `Functions` como 1º argumento;
// aqui a injetamos com `getLeelaFunctions()` para expor a assinatura fina
// `CriarEventoFn` (`(input) => Promise<CriarEventoResult>`) que o form consome.
//
// A porta continua isolando o acoplamento: nenhuma tela conhece o Firebase —
// só o contrato `CriarEventoFn`. Em teste injeta-se um mock desta porta.
// =============================================================================

import { criarEvento, getLeelaFunctions } from '@leela/api-client';
import type { CriarEventoFn } from './contracts';

/** Porta real: adapta `criarEvento(functions, input)` para `CriarEventoFn`. */
export const criarEventoPadrao: CriarEventoFn = (input) =>
  criarEvento(getLeelaFunctions(), input);
