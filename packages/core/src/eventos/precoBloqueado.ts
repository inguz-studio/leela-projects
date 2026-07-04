// =============================================================================
// packages/core/src/eventos/precoBloqueado.ts
//
// RN-200 — após a 1ª venda, edição de preço do evento/kit é bloqueada
// (LEELA-S201-T3 · E03).
//
// Fonte da verdade de "há venda": agregado ∑ `qtdInscritos` do evento,
// mantido por Cloud Function (S207-T2) — o cliente nunca o escreve.
//
// Enforcement em três camadas (defesa em profundidade):
//   1. UI (S206-T1): campo de preço desabilitado + aviso quando
//      `precoBloqueado(evento)` — usa MSG_PRECO_BLOQUEADO;
//   2. Security Rules: update de `kits/{kitId}.preco` negado quando o
//      evento pai tem `qtdInscritos > 0` (firestore.rules);
//   3. Functions: `guardPreco.assertPrecoEditavel` para qualquer Function
//      futura que altere preço (S206/E04).
// =============================================================================

import { temVenda, type Evento } from './evento';

/** Aviso canônico exibido pela UI quando o preço está travado (RN-200). */
export const MSG_PRECO_BLOQUEADO =
  'Preço bloqueado após a primeira venda (RN-200).';

/**
 * Preço do evento/kits está bloqueado para edição? (RN-200)
 * Deriva do agregado ∑ `qtdInscritos` — há venda ⇒ preço travado.
 * @pure
 */
export function precoBloqueado(evento: Pick<Evento, 'qtdInscritos'>): boolean {
  return temVenda(evento);
}

/**
 * A mudança de preço proposta é permitida? (RN-200)
 * Manter o MESMO preço é sempre permitido (updates de outros campos não
 * podem ser bloqueados pela trava de preço); mudar exige evento sem venda.
 * @pure
 */
export function podeAlterarPreco(
  evento: Pick<Evento, 'qtdInscritos'>,
  precoAtual: number,
  novoPreco: number
): boolean {
  if (novoPreco === precoAtual) return true;
  return !precoBloqueado(evento);
}
