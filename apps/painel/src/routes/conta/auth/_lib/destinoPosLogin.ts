// =============================================================================
// destinoPosLogin — para onde a pessoa vai depois de entrar (item 57 do painel
// de decisões · reconciliado com a RN-411/416).
//
// O item 57 pediu roteamento POR PAPEL: `platform_admin` aterrissa em
// `/plataforma`, organizador na Visão Geral, e "conta sem papel nenhum recebe o
// aviso ainda na tela de entrar, sem passar da porta".
//
// O "sem papel nenhum" precisou de uma leitura mais fina, senão o item 57
// barraria na porta exatamente quem a RN-411 manda entrar: a conta que acabou
// de se cadastrar TAMBÉM chega aqui sem tenant, e ela tem de aterrissar logada
// para encontrar o overlay do convite (RN-416). O discriminante é o doc
// `profissionais/{uid}`:
//
//   - tem doc  → é organizador em onboarding. ENTRA (home + overlay).
//   - não tem  → é conta órfã (atleta do app, sobra de teste, conta criada
//                fora do fluxo). Fica na porta com o aviso, e a sessão cai.
//
// `state.from` continua vencendo quando existe: ele é o deep-link que o
// `RequireSessao` guardou antes de mandar a pessoa para cá (FIX-AUTHGUARD).
// Ignorá-lo transformaria todo link salvo do painel num atalho para a home.
// O default por papel vale para a entrada SEM origem — que é a do menu, a do
// bookmark de `/entrar` e a do cadastro.
// =============================================================================

import type { Role } from '@leela/core';

/** O que se sabe da conta logo depois do login (claims + doc do perfil). */
export interface SessaoPosLogin {
  role: Role | null;
  tenantId: string | null;
  /** `profissionais/{uid}` existe? Discriminante do organizador em onboarding. */
  temPerfilProfissional: boolean;
}

export type DestinoPosLogin =
  | { tipo: 'rota'; destino: string }
  | { tipo: 'barrar'; aviso: string };

/** Aviso da conta que não pertence ao painel. Não enumera nem culpa ninguém. */
export const AVISO_CONTA_SEM_ACESSO =
  'Esta conta não tem acesso ao painel do organizador. ' +
  'Se você deveria ter acesso, fale com o time Leela.';

/** Casa do super-admin: ele não opera eventos, opera a plataforma. */
export const ROTA_PLATAFORMA = '/plataforma';

/** Visão Geral do organizador. */
export const ROTA_VISAO_GERAL = '/';

/**
 * Decide o pós-login. Puro de propósito: a decisão é regra de negócio e tem de
 * ser provável sem navegador, sem Firebase e sem render.
 *
 * @param sessao claims já resolvidas (com refresh forçado) + existência do doc
 * @param from   caminho interno já sanitizado, ou null quando não houve origem
 * @pure
 */
export function destinoPosLogin(
  sessao: SessaoPosLogin,
  from: string | null
): DestinoPosLogin {
  // Conta órfã: nem tenant, nem papel de plataforma, nem doc de profissional.
  // Deixar entrar produziria um painel vazio sem explicação — o overlay do
  // convite é para quem se cadastrou como organizador, não para toda conta do
  // ecossistema que descobrir a URL do painel.
  if (
    sessao.role !== 'platform_admin' &&
    sessao.tenantId === null &&
    !sessao.temPerfilProfissional
  ) {
    return { tipo: 'barrar', aviso: AVISO_CONTA_SEM_ACESSO };
  }

  // Deep-link guardado pelo RequireSessao vence o default por papel. Uma rota
  // que a conta não alcança continua barrada pelo lado de lá (Rules + o
  // ContaTravadaGate) — este passo é navegação, não autorização.
  if (from !== null && from.length > 0) {
    return { tipo: 'rota', destino: from };
  }

  // Papel acumulado (admin + organizador na MESMA conta) resolve aqui, e
  // resolve por precedência: a conta vai para `/plataforma` e pronto. É a
  // decisão do dono de 03/08 — ACESSO ÚNICO, sem seletor de papel; a UX de
  // visualização multi-papel é item futuro, de outra lane.
  // NÃO transforme este `if` num seletor nem numa tela de escolha.
  if (sessao.role === 'platform_admin') {
    return { tipo: 'rota', destino: ROTA_PLATAFORMA };
  }

  // Organizador com tenant e organizador ainda travado caem no MESMO lugar: a
  // home. A diferença entre os dois é o overlay, e quem decide isso é o
  // ContaTravadaGate lendo a claim — não esta função.
  return { tipo: 'rota', destino: ROTA_VISAO_GERAL };
}
