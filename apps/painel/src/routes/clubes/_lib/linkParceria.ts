// =============================================================================
// linkParceria — o link master da parceria de assessoria, DERIVADO (S1215-T1 ·
// RN-429 · E18).
//
// Antes desta RN, o link exibido e copiado era `parceria.linkMaster`, campo de
// texto espelhado do programa. O que ele guarda hoje, vindo do seed, é
// `beh.ro/mfl26?c=frc`: o domínio dos mocks Be Hero — o mesmo que a RN-423
// acabou de expulsar do e-mail da compra — mais uma chave `c` que nenhum
// arquivo do repositório lê. Entregar aquilo para uma assessoria é entregar um
// link que não aplica cupom, não atribui conversão e leva quem clicar para o
// site de outra empresa.
//
// Agora o link é derivado do gerador único: base pública do ambiente + slug do
// evento (`eventoId` É o slug — E03) + `refCodigo` + o cupom do clube.
//
// `null` quando não dá para derivar — parceria antiga sem `refCodigo`, ou
// ambiente sem base configurada. A superfície mostra que não há link, e NÃO cai
// de volta no campo legado: o fallback traria `beh.ro` de volta pela porta dos
// fundos, que é exatamente o que esta RN veio fechar.
// =============================================================================

import type { ParceriaEventoAfiliado } from '@leela/core';
import { linkPromocional } from '../../../lib/linkPublico';

export function linkDaParceria(p: ParceriaEventoAfiliado): string | null {
  const ref = p.refCodigo;
  if (typeof ref !== 'string' || ref.length === 0) return null;
  return linkPromocional(p.eventoId, ref, p.cupom);
}
