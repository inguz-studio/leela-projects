// =============================================================================
// Gate de papel das telas de Configurações (LEELA-S304-T2/T3 · E04-L5).
//
// FONTE ÚNICA: a matriz `podeAcessar` de `@leela/core` (a MESMA que as Rules
// espelham e que E07-web usa para o 403). A UI aqui só ESCONDE/DESABILITA o que
// o papel não pode — a autoridade real é a Rule (defesa em profundidade). Puro
// e testável célula a célula.
// =============================================================================

import { papelNoEvento, podeAcessar, type PapelEvento } from '@leela/core';

/**
 * Papel do usuário NESTE evento. O dono (`organizadorId`) é sempre
 * `organizador` mesmo sem doc de equipe — a titularidade do evento não depende
 * de membership. Os demais entram pelo custom claim `eventos[eventoId]`
 * (mantido só pela Function `setClaimsEquipe`). `null` = sem papel. @pure
 */
export function papelDoUsuarioNoEvento(
  evento: { id: string; organizadorId: string },
  uid: string | null,
  claims: { eventos?: Record<string, unknown> } | null | undefined
): PapelEvento | null {
  if (uid !== null && evento.organizadorId === uid) return 'organizador';
  return papelNoEvento(claims, evento.id);
}

/** O papel pode ver/editar as Configurações gerais? (área `configuracoes`). @pure */
export function podeEditarConfiguracoes(papel: PapelEvento | null): boolean {
  return papel !== null && podeAcessar(papel, 'configuracoes');
}

/** O papel pode gerir a Equipe? (área `equipe` — só organizador/administrador). @pure */
export function podeGerirEquipe(papel: PapelEvento | null): boolean {
  return papel !== null && podeAcessar(papel, 'equipe');
}

/**
 * O papel pode ver/editar a Página de vendas? (área `pagina_vendas`). @pure
 *
 * V2708-11: a página de vendas passou a morar no terciário de Configurações, e
 * a célula da matriz que a governa NÃO é a de `configuracoes` — é a dela. As
 * duas colunas são idênticas hoje nos quatro papéis (organizador T/T,
 * administrador T/T, operador F/F, financeiro F/F), então o aninhamento não
 * mudou quem entra; ainda assim a aba e a rota consultam a célula PRÓPRIA, para
 * que o dia em que a matriz divergir não seja o dia em que a autorização vazou
 * em silêncio. O aceite `E04-L4: financeiro edita página → NEGA` está afirmado
 * em teste, não confiado a este comentário.
 */
export function podeEditarPaginaVendas(papel: PapelEvento | null): boolean {
  return papel !== null && podeAcessar(papel, 'pagina_vendas');
}

/**
 * O papel pode FLIPAR o modo cupom-only do evento? (RN-303 · S1804). É
 * OWNER-only: abrir/fechar o evento a vendas sem cupom é controle de venda do
 * dono — a Rule `vendaSomentePorCupomProtegida` nega staff (mesma postura de
 * politicaVendas/S305). Só o `organizador` (dono do evento) passa. @pure
 */
export function podeFlipCupomOnly(papel: PapelEvento | null): boolean {
  return papel === 'organizador';
}
