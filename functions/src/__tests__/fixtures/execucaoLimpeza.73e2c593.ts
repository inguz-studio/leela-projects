// =============================================================================
// CONGELADO — o laço de execução e a digital do commit `73e2c593`, que a
// review fria (`leela-rev2-fria-20260806.md`) BLOQUEOU com R1, R2 e R3.
//
// Extraído verbatim de `git show 73e2c593:functions/scripts/limpeza-prod-leela-hub.ts`
// (linhas 336-352 e 473-494), com o I/O trocado por efeitos injetados para
// caber num teste. A LÓGICA é a mesma, linha a linha:
//
//   digitalDoPlanoAntiga  = sha256(JSON.stringify(operacoes))   ← sem canonicalizar
//   chaveDaOpAntiga       = `${tipo}:${caminho}`                ← sem índice
//   executarPlanoAntigo   = o laço, com `feitas.has(chave)`
//
// NÃO EDITE. Um fixture que acompanha o código deixa de ser regressão: se
// algum dia o antigo passar a asserção, a asserção parou de medir o defeito.
// =============================================================================

import * as crypto from 'crypto';
import type { Operacao } from '../../limpeza/planoLimpeza';

/** R1 — `JSON.stringify` serializa na ordem de INSERÇÃO. */
export function digitalDoPlanoAntiga(operacoes: readonly Operacao[]): string {
  return crypto.createHash('sha256').update(JSON.stringify(operacoes)).digest('hex');
}

/** R3 — sem índice: `editar:perfis/castelo` casa as duas edições do perfil. */
export const chaveDaOpAntiga = (op: Operacao): string => `${op.tipo}:${op.caminho}`;

export interface EfeitosAntigos {
  readonly apagar: (caminho: string) => Promise<void>;
  readonly editar: (caminho: string, mudancas: Readonly<Record<string, unknown>>) => Promise<void>;
  readonly registrarFeita: (chave: string) => void;
}

/** O laço do commit congelado. Sem índice na chave, sem contagem de puladas. */
export async function executarPlanoAntigo(
  operacoes: readonly Operacao[],
  feitas: ReadonlySet<string>,
  efeitos: EfeitosAntigos
): Promise<number> {
  let n = 0;
  for (const op of operacoes) {
    const chave = chaveDaOpAntiga(op);
    if (feitas.has(chave)) continue;
    if (op.tipo === 'apagar') await efeitos.apagar(op.caminho);
    else await efeitos.editar(op.caminho, op.mudancas);
    efeitos.registrarFeita(chave);
    n += 1;
  }
  return n;
}
