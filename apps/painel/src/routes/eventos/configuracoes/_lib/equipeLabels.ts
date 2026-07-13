// =============================================================================
// Rótulos e derivações de equipe (S304-T3 · E04-L5). Copy de UI dos papéis e
// das áreas + a lista de "o que o membro perde" na remoção (§2.15) — derivada
// da matriz `podeAcessar` de @leela/core (fonte única). Puro/testável.
// =============================================================================

import { AREAS_EVENTO, podeAcessar, type AreaEvento, type PapelEvento } from '@leela/core';

/** Nome humano de cada papel (RN-320). */
export const LABEL_PAPEL: Record<PapelEvento, string> = {
  organizador: 'Organizador',
  administrador: 'Administrador',
  operador: 'Operador',
  financeiro: 'Financeiro',
};

/** Descrição curta do que cada papel faz — apoio no Select/convite. */
export const DESCRICAO_PAPEL: Record<PapelEvento, string> = {
  organizador: 'Dono do evento: controle total, financeiro e equipe.',
  administrador: 'Gestão completa, sem financeiro nem exclusão do evento.',
  operador: 'Balcão de entrega (kit, chip, check-in) e leitura de inscritos.',
  financeiro: 'Leitura do financeiro e exportações. Sem operação nem edição.',
};

/** Nome humano de cada área (as 7 da matriz). */
export const LABEL_AREA: Record<AreaEvento, string> = {
  pagina_vendas: 'Página de vendas',
  comunicacao: 'Comunicação',
  financeiro: 'Financeiro',
  entrega: 'Entrega',
  inscritos: 'Inscritos',
  configuracoes: 'Configurações',
  equipe: 'Equipe',
};

/** Áreas que um papel acessa, na ordem canônica das áreas. @pure */
export function areasDoPapel(papel: PapelEvento): AreaEvento[] {
  return AREAS_EVENTO.filter((a) => podeAcessar(papel, a));
}

/**
 * Preview "o que o membro perde" ao ser removido (§2.15) — cada área que o
 * papel dele acessava vira uma linha. @pure
 */
export function perdeAoRemover(papel: PapelEvento): string[] {
  return areasDoPapel(papel).map((a) => `Acesso a ${LABEL_AREA[a]}`);
}
