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
 * O papel pode FLIPAR o modo cupom-only do evento? (RN-303 · S1804). É
 * OWNER-only: abrir/fechar o evento a vendas sem cupom é controle de venda do
 * dono — a Rule `vendaSomentePorCupomProtegida` nega staff (mesma postura de
 * politicaVendas/S305). Só o `organizador` (dono do evento) passa. @pure
 */
export function podeFlipCupomOnly(papel: PapelEvento | null): boolean {
  return papel === 'organizador';
}
