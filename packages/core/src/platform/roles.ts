// =============================================================================
// packages/core/src/platform/roles.ts
//
// Papéis de plataforma e guards puros de autorização (ADR-009, RN-401).
//
// Regra: o cliente NUNCA é fonte de verdade de papel.
// Claims vêm do token Firebase (setCustomUserClaims via Admin SDK / Function).
// Guards puros aqui são reutilizados por UI e por testes de Rules.
// =============================================================================

import type { PapelEvento } from '../eventos/equipe';

/**
 * Papéis de plataforma via Firebase custom claims (ADR-009, RN-401).
 *
 *   platform_admin — dono da plataforma (cross-tenant, visão macro)
 *   tenant_owner   — produtor/promotor owner do seu tenant
 *   tenant_staff   — membro da equipe do tenant (papel abaixo do owner)
 *   promoter       — afiliado/promotor (cross-evento, dentro do tenant)
 *   athlete        — atleta (identidade global, sem tenantId)
 */
export type Role =
  | 'platform_admin'
  | 'tenant_owner'
  | 'tenant_staff'
  | 'promoter'
  | 'athlete';

/**
 * Custom claims presentes no token Firebase ID após setTenantClaims().
 * Lidos pelas Security Rules e pela lógica de autorização dos apps.
 *
 * `tenantId` é omitido para `athlete` e `platform_admin` (cross-tenant).
 */
export interface AuthClaims {
  role: Role;
  /** Ausente para athlete e platform_admin */
  tenantId?: string;
  /**
   * Papel anterior quando a superfície ADMIN rebaixou o usuário a `athlete`
   * (gravado/limpo SOMENTE por mergeTenantClaims — functions setTenantClaims).
   * Desambigua demoção DELIBERADA do estado byte-idêntico produzido pela
   * corrida do trigger onCreateUser (review Onda1 L2 #12): a exceção
   * athlete+doc do provisionTenant só re-eleva quando este marcador está
   * AUSENTE. Promoção a qualquer papel não-athlete remove o marcador.
   */
  demotedFromRole?: Role;
  /**
   * Papéis POR EVENTO (RN-320 · E04-L4): mapa `eventoId → papel`, mantido
   * EXCLUSIVAMENTE pela Function `setClaimsEquipe` via merge preservador —
   * nunca sobrescreve `role`/`tenantId` nem papéis de outros eventos.
   * Ausente quando o usuário não integra equipe de evento algum.
   */
  eventos?: Record<string, PapelEvento>;
  /**
   * CAPACIDADE de administração da plataforma, ORTOGONAL ao papel (RN-401 · lane PAPEL-DUPLO).
   *
   * `role` é valor único: virar `tenant_owner` apagava o `platform_admin` e
   * com ele o acesso ao painel master. Papel e capacidade são eixos
   * diferentes — o papel diz o que a conta É (identidade operacional, um só),
   * a capacidade diz o que a conta TAMBÉM PODE FAZER. Por serem eixos
   * distintos não precisam ser reconciliados: nenhuma combinação é inválida.
   *
   * Só existe no crachá quando LIGADA — `true` é o único valor gravado, e
   * revogar APAGA a chave (nunca grava `false`). Um único valor mantém a
   * leitura idêntica em TypeScript e nas Rules e evita a terceira
   * possibilidade (`false`) que sempre vira o bug de comparação frouxa.
   *
   * Gravada e apagada EXCLUSIVAMENTE pela Function `setPlatformAdminCapability`,
   * cujo caller precisa carregar o papel LEGADO `platform_admin` — a
   * capacidade NÃO concede o direito de concedê-la (ver `canSetClaims` e
   * `isLegacyPlatformAdminRole`). Custom claim não é documento: nenhum SDK de
   * cliente escreve aqui, em nenhuma circunstância.
   */
  platformAdmin?: true;
}

/**
 * Por qual PORTA uma escrita de gestão entrou (decisão 43-b · T4). Vive no
 * core porque atravessa as três camadas: a Function carimba, o api-client
 * transporta e a tela mostra de quem foi a mão.
 *
 *   organizador — owner/staff escrevendo no PRÓPRIO tenant;
 *   plataforma  — `platform_admin` agindo cross-tenant sobre tenant alheio.
 *
 * Confundir as duas apaga a única prova de quem mandou mexer na inscrição (ou
 * no dinheiro) de outra empresa.
 */
export type TrilhaOperacao = 'organizador' | 'plataforma';

// ---------------------------------------------------------------------------
// Guards puros — sem efeitos colaterais, seguros para testes
// ---------------------------------------------------------------------------

/**
 * Papel LEGADO `platform_admin` — a perna antiga, isolada (RN-401 · lane PAPEL-DUPLO).
 *
 * Existe para que a AUTORIDADE DE CONCESSÃO possa exigir estritamente o papel,
 * sem passar por `isPlatformAdmin` (que hoje é mais largo). Todo guard que
 * GRAVA custom claim usa esta função, nunca `isPlatformAdmin` — é o que
 * mantém a invariante "a capacidade não fabrica outra capacidade".
 */
export function isLegacyPlatformAdminRole(claims: AuthClaims): boolean {
  return claims.role === 'platform_admin';
}

/**
 * A conta carrega a CAPACIDADE de administração de plataforma (RN-401 · lane PAPEL-DUPLO) —
 * a perna nova, isolada. Só `true` conta: ausente, `false`, `'true'` ou
 * qualquer outro valor é negação.
 */
export function hasPlatformAdminCapability(claims: AuthClaims): boolean {
  return claims.platformAdmin === true;
}

/**
 * Verifica se os claims autorizam AÇÃO de platform_admin — acesso cross-tenant
 * a dados e operações de plataforma (RN-400).
 *
 * PONTO ÚNICO DE DECISÃO (RN-401 · lane PAPEL-DUPLO). Aceita as DUAS pernas:
 *   - `role === 'platform_admin'` — contas legadas, sem migração nenhuma;
 *   - `platformAdmin === true`    — a capacidade que coexiste com o papel
 *                                   operacional (o dono virou `tenant_owner`
 *                                   e `role`, sendo valor único, apagou o
 *                                   acesso ao painel master).
 *
 * Autoriza AÇÃO de plataforma e também, via `canSetClaims`, a NOMEAÇÃO de
 * outros administradores. O que nunca autoriza é a conta agir sobre si mesma
 * na superfície de concessão — essa trava é do lado da Function.
 */
export function isPlatformAdmin(claims: AuthClaims): boolean {
  return isLegacyPlatformAdminRole(claims) || hasPlatformAdminCapability(claims);
}

/**
 * Verifica se o usuário pertence ao tenant especificado.
 * Retorna true também para platform_admin (acesso cross-tenant).
 *
 * Uso: autorização de leitura de dados tenant-scoped (RN-400).
 */
export function belongsToTenant(claims: AuthClaims, tenantId: string): boolean {
  if (isPlatformAdmin(claims)) return true;
  return claims.tenantId === tenantId;
}

/**
 * Verifica se o usuário é owner ou staff de um tenant específico.
 * NÃO inclui platform_admin (use belongsToTenant para isso).
 */
export function isTenantMember(claims: AuthClaims, tenantId: string): boolean {
  return (
    (claims.role === 'tenant_owner' || claims.role === 'tenant_staff') &&
    claims.tenantId === tenantId
  );
}

/**
 * Autoridade para CONCEDER ou REVOGAR a capacidade de plataforma em OUTRA
 * conta (RN-401 · lane PAPEL-DUPLO). Guarda `setPlatformAdminCapability`.
 *
 * As duas pernas concedem: o papel legado E a capacidade. Um sistema de
 * administração que não consegue nomear o próximo administrador está
 * incompleto — se só a perna legada concedesse, apagar a última conta legada
 * deixaria o produto sem NENHUM caminho de nomeação, e trocar quem administra
 * a plataforma viraria procedimento de incidente com credencial de serviço.
 *
 * ⚠️ Esta função responde "pode conceder?", NÃO "pode conceder a quem?". A
 * proibição de ALVO == CALLER vive na Function e é indispensável: sem ela,
 * `canSetClaims` sozinha permitiria autoconcessão a qualquer portador.
 * As duas juntas é que fecham as invariantes:
 *   1. quem não tem nem papel nem capacidade não concede a ninguém;
 *   2. ninguém concede a si mesmo, por caminho nenhum;
 *   3. `tenant_owner` puro não escala.
 *
 * Efeito colateral assumido: dois portadores PODEM se conceder mutuamente. A
 * proibição de auto-alvo é, portanto, trava contra ENGANO mais que contra
 * malícia — a defesa contra conluio é a TRILHA DE AUDITORIA (quem concedeu,
 * para quem, quando), gravada pela Function em `auditoriaAcessos`.
 *
 * ⛔ NÃO cobre escrita de PAPEL. `setTenantClaims` (papel + tenantId) tem
 * guard próprio, que segue exigindo o papel legado `platform_admin`. A
 * capacidade nomeia o próximo administrador; ela não redistribui papéis de
 * tenant.
 */
export function canSetClaims(callerClaims: AuthClaims): boolean {
  return isPlatformAdmin(callerClaims);
}

// ---------------------------------------------------------------------------
// Contrato do alternador de painéis (lane PAPEL-DUPLO · T5)
//
// A tela é de OUTRA lane. O que mora aqui é a única pergunta que ela precisa
// fazer e a única resposta que ela pode confiar. Regras do contrato:
//
//   1. A resposta sai do CRACHÁ EM CACHE. `getClaims()` (api-client) devolve
//      as claims do ID token já em memória — zero chamada de rede. Só passe
//      `getClaims(true)` logo depois de uma concessão/revogação, quando o
//      token em cache é sabidamente velho.
//   2. Os DESTINOS não são redefinidos aqui de propósito. As rotas já têm
//      dono: `ROTA_PLATAFORMA` ('/plataforma') e `ROTA_VISAO_GERAL` ('/') em
//      `apps/painel/src/routes/conta/auth/_lib/destinoPosLogin.ts`. Duplicá-las
//      no core criaria a segunda verdade que um dia diverge — a lane de
//      interface IMPORTA de lá.
//   3. `destinoPosLogin` decide a porta de ENTRADA por precedência (admin cai
//      em `/plataforma`). O alternador é NAVEGAÇÃO depois de dentro; ele não
//      substitui aquela decisão nem vira um seletor no login.
//   4. Botão não é crachá. Esconder o item de menu é cosmética; quem nega é
//      Rules + os guards das Functions. Nunca use `PaineisDaConta` como
//      autorização de escrita.
// ---------------------------------------------------------------------------

/** Painéis que a conta alcança — a resposta que o alternador consome. */
export interface PaineisDaConta {
  /** Painel Master (superfície de plataforma, cross-tenant). */
  master: boolean;
  /** Painel Organizador (superfície do próprio tenant). */
  organizador: boolean;
  /** Tenant do lado organizador; `null` quando não há esse lado. */
  tenantId: string | null;
  /** Os dois lados existem → o alternador deve aparecer. */
  podeAlternar: boolean;
}

/**
 * Quais painéis esta conta alcança, resolvido só com o crachá.
 *
 * Combinações possíveis (as quatro que a suíte cobre):
 *   platform_admin legado          → master, sem organizador (não tem tenantId);
 *   tenant_owner puro              → organizador, sem master;
 *   tenant_owner + capacidade      → OS DOIS (o caso do dono, e o único em que
 *                                    `podeAlternar` é true);
 *   athlete/promoter/sem nada      → nenhum dos dois.
 *
 * @pure
 */
export function paineisDaConta(claims: AuthClaims | null | undefined): PaineisDaConta {
  if (!claims) {
    return { master: false, organizador: false, tenantId: null, podeAlternar: false };
  }
  const tenantId =
    typeof claims.tenantId === 'string' && claims.tenantId.length > 0
      ? claims.tenantId
      : null;
  const master = isPlatformAdmin(claims);
  const organizador =
    tenantId !== null && (claims.role === 'tenant_owner' || claims.role === 'tenant_staff');
  return { master, organizador, tenantId, podeAlternar: master && organizador };
}
