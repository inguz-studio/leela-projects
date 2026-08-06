// =============================================================================
// functions/src/platform/setPlatformAdminCapability.ts
//
// Concessão e revogação da CAPACIDADE de administração de plataforma
// (`platformAdmin: true` no custom claim) — lane PAPEL-DUPLO, ADR-009/RN-401.
//
// -----------------------------------------------------------------------------
// Por que esta Function existe separada de `setTenantClaims`
// -----------------------------------------------------------------------------
// `setTenantClaims` escreve o PAPEL, que é valor único: setar `tenant_owner`
// apaga `platform_admin`. Foi exatamente isso que fechou o painel master para o
// dono. A capacidade é outro EIXO — coexiste com o papel — e por isso tem
// superfície própria, com input próprio (`conceder: boolean`) e autorização
// própria. Enfiá-la no input do `setTenantClaims` obrigaria todo caller de
// papel a ter opinião sobre capacidade, e a primeira chamada que omitisse o
// campo apagaria a capacidade sem querer.
//
// -----------------------------------------------------------------------------
// Quem pode nomear — e o que continua fechado
// -----------------------------------------------------------------------------
// AUTORIDADE (`canSetClaims`): o papel LEGADO `platform_admin` OU a própria
// capacidade. Quem administra a plataforma pode nomear o próximo — um sistema
// de administração que não consegue nomear sucessor está incompleto, e a
// alternativa (manter uma conta legada viva para sempre, ou recorrer a
// credencial de serviço) é dívida sem prazo, não solução.
//
// As invariantes que sustentam isso, e o que fecha cada uma:
//
//   (1) QUEM NÃO É ADMINISTRADOR NÃO NOMEIA. `canSetClaims` recusa `athlete`,
//       `promoter`, `tenant_staff` e `tenant_owner` puro. Sem papel legado e
//       sem capacidade, não há caminho — nem para terceiro, nem para si.
//
//   (2) NINGUÉM CONCEDE A SI MESMO, por caminho nenhum. `alvo === caller` é
//       `permission-denied` ANTES de qualquer escrita. É a trava que impede
//       `canSetClaims` de virar autoconcessão na mão de um portador.
//
//   (3) `tenant_owner` NÃO ESCALA. Ser dono do próprio tenant não dá nem a
//       capacidade nem o direito de nomear: os dois vêm de uma concessão
//       explícita, feita por outra conta, registrada na trilha.
//
//   (4) CLIENT SDK NÃO ESCREVE CLAIM — impossível por construção, não por
//       regra. Custom claim não é documento do Firestore: mora no Firebase
//       Auth e o ÚNICO caminho de escrita é `setCustomUserClaims`, que só
//       existe no Admin SDK (credencial de serviço, server-side). Nenhum SDK
//       de cliente — web, iOS, Android, REST do Identity Toolkit — expõe
//       escrita de custom claim. Não há Rule a escrever aqui porque as Rules
//       nem governam esta superfície.
//
// ⚠️ EFEITO COLATERAL ASSUMIDO, registrado em vez de escondido: com dois
// portadores, A pode conceder a B e B a A. A proibição de auto-alvo é,
// portanto, trava contra ENGANO mais do que contra conluio. A defesa contra
// conluio não é proibir a operação — é a TRILHA: toda concessão e toda
// revogação, inclusive as NEGADAS, viram doc em `auditoriaAcessos` com quem
// concedeu, para quem, o quê e quando. Trilha que o auditado não lê nem apaga
// (a coleção é deny-by-default nas Rules, de propósito).
//
// Caminho INDIRETO também fechado: nenhuma Function deriva a capacidade de
// conteúdo controlado pelo usuário. `onCreateUser` grava `role` default,
// `resgatarConviteOrganizador`/`provisionTenant` gravam `tenant_owner` a partir
// de um convite — nenhum deles lê `platformAdmin` de doc nenhum, e todos
// escrevem por merge preservador (a capacidade sobrevive intacta, e também não
// nasce de lá).
//
// -----------------------------------------------------------------------------
// O piso: a revogação nunca zera os administradores
// -----------------------------------------------------------------------------
// Não por contagem, por CONSTRUÇÃO — e por isso não há varredura de usuários
// aqui. Toda revogação bem-sucedida tem um caller que (i) é administrador,
// porque passou em `canSetClaims`, e (ii) não é o alvo, porque `alvo ===
// caller` é recusado. Logo o caller SOBREVIVE a toda revogação que ele mesmo
// faz: o piso é 1. Com exatamente um administrador restante, ninguém pode
// revogá-lo — só ele teria autoridade, e sobre si mesmo a operação não existe.
//
// ⚠️ O piso vale contra REVOGAÇÃO, não contra EXCLUSÃO DE CONTA. Apagar a
// última conta administradora zera o sistema, e isso acontece fora desta
// Function. Guarda operacional: antes de apagar uma conta de administração,
// nomeie o sucessor por aqui. Se mesmo assim zerar, o único caminho de volta é
// o break-glass no fim deste arquivo.
//
// -----------------------------------------------------------------------------
// Revogação e o prazo do crachá em cache
// -----------------------------------------------------------------------------
// Revogar (`conceder: false`) APAGA a chave e revoga os refresh tokens. Mas
// `setCustomUserClaims` + `revokeRefreshTokens` NÃO invalidam o ID token já
// emitido: ele vale até expirar, no máximo 1 HORA. Nessa janela o revogado
// ainda passa nas Rules (Rules não consultam revogação de refresh token) e nas
// callables (`https.onCall` v1 verifica o ID token sem `checkRevoked`).
//
// Precisa ser IMEDIATO? A única porta que fecha na hora é desabilitar a conta:
//   admin.auth().updateUser(uid, { disabled: true })
// conta desabilitada tem o token rejeitado no ato pelo backend do Auth, em
// Rules e em callables. Documentado no handoff da lane como runbook; não é
// feito aqui porque desabilitar derruba TODO o acesso da pessoa, não só a
// capacidade — é decisão de incidente, não de rotina.
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { canSetClaims, type AuthClaims } from '@leela/core';
import { registrarAcessoAuditado } from '../shared/auditoriaAcessos';

/** Chave da capacidade no custom claim. Não é claim reservada do Firebase. */
export const CLAIM_CAPACIDADE_PLATAFORMA = 'platformAdmin';

/**
 * Família da trilha (`auditoriaAcessos.tipo`) — é por ela que a consulta
 * "quem virou administrador da plataforma, e por ordem de quem" filtra.
 */
export const TIPO_AUDITORIA_CAPACIDADE = 'capacidade_plataforma';

interface SetPlatformAdminCapabilityInput {
  /** UID do usuário Firebase Auth que recebe (ou perde) a capacidade. */
  uid: string;
  /** `true` liga a capacidade; `false` desliga (apaga a chave). */
  conceder: boolean;
}

interface SetPlatformAdminCapabilityOutput {
  success: true;
  uid: string;
  /** Estado da capacidade DEPOIS da escrita. */
  platformAdmin: boolean;
}

/**
 * Merge que grava ou apaga SÓ a capacidade (mesma disciplina do
 * `mergeTenantClaims`): claims não relacionadas — `role`, `tenantId`,
 * `demotedFromRole`, `eventos` — atravessam intactas. Trocar isto por um
 * replace do objeto apagaria o vínculo de tenant do dono no mesmo ato que lhe
 * devolve o painel master.
 *
 * Nunca grava `false`: revogar REMOVE a chave. Um único valor possível
 * (`true`) mantém TypeScript e Rules lendo a mesma coisa e elimina a terceira
 * possibilidade que vira bug de comparação.
 *
 * Puro e exportado para teste unitário direto.
 */
export function mergePlatformAdminCapability(
  current: object | null | undefined,
  conceder: boolean
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(current ?? {}) };
  if (conceder) {
    merged[CLAIM_CAPACIDADE_PLATAFORMA] = true;
  } else {
    delete merged[CLAIM_CAPACIDADE_PLATAFORMA];
  }
  return merged;
}

/**
 * `setPlatformAdminCapability` — liga/desliga a capacidade de administração de
 * plataforma numa conta, PRESERVANDO o papel operacional dela.
 *
 * Autorização: papel legado `platform_admin` OU a própria capacidade (via
 * `canSetClaims`). Alvo: qualquer conta EXCETO o próprio caller.
 *
 * Toda tentativa — concedida, revogada ou NEGADA — vira registro em
 * `auditoriaAcessos`, gravado ANTES do `throw`: um abort não pode apagar o
 * rastro da tentativa.
 *
 * Depois da escrita o sujeito precisa de um token novo. `revokeRefreshTokens`
 * força isso no próximo refresh, mas o ID token em cache dele ainda vale até
 * expirar (≤ 1h) — na prática: SAIR E ENTRAR de novo, ou
 * `user.getIdTokenResult(true)`.
 */
export const setPlatformAdminCapability = https.onCall(
  async (data: unknown, context) => {
    // ── 1. Caller autenticado ─────────────────────────────────────────────
    // Sem `auth` não há a quem atribuir a tentativa: nada a registrar.
    if (!context.auth) {
      throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
    }

    const callerClaims = context.auth.token as unknown as AuthClaims;
    const callerUid = context.auth.uid;
    const db = admin.firestore();

    /** Trilha: sem PII, só uids, papel e desfecho. Nunca dentro de transação. */
    const trilha = (registro: Record<string, string>) =>
      registrarAcessoAuditado(
        db,
        TIPO_AUDITORIA_CAPACIDADE,
        { callerUid, callerRole: String(callerClaims?.role ?? 'desconhecido'), ...registro },
        'capacidade_plataforma'
      );

    // ── 2. AUTORIDADE — as duas pernas nomeiam (invariante 1) ─────────────
    // `canSetClaims` aceita o papel legado E a capacidade: quem administra a
    // plataforma pode nomear o próximo. O que sustenta a segurança NÃO é
    // estreitar isto — é o passo 4 (alvo ≠ caller) somado à trilha.
    if (!canSetClaims(callerClaims)) {
      await trilha({ targetUid: String((data as { uid?: unknown })?.uid ?? '—'), resultado: 'negado_papel' });
      throw new https.HttpsError(
        'permission-denied',
        'Apenas quem administra a plataforma concede ou revoga a capacidade.'
      );
    }

    // ── 3. Validação de input ─────────────────────────────────────────────
    const input = data as SetPlatformAdminCapabilityInput;

    if (!input || typeof input.uid !== 'string' || !input.uid.trim()) {
      throw new https.HttpsError('invalid-argument', 'uid é obrigatório.');
    }
    if (typeof input.conceder !== 'boolean') {
      throw new https.HttpsError(
        'invalid-argument',
        'conceder é obrigatório e precisa ser boolean.'
      );
    }

    // ── 4. Alvo nunca é o próprio caller (invariantes 2 e o piso) ─────────
    // Esta é a trava que impede `canSetClaims` de virar autoconcessão na mão
    // de um portador — sem ela, qualquer administrador se reconcederia e a
    // proibição de auto-alvo deixaria de existir. É também o que garante o
    // piso de 1 administrador: quem revoga sobrevive à própria revogação.
    if (input.uid === callerUid) {
      await trilha({ targetUid: input.uid, resultado: 'negado_auto_alvo' });
      throw new https.HttpsError(
        'permission-denied',
        'A capacidade de plataforma nunca é concedida nem revogada sobre a própria conta.'
      );
    }

    // ── 5. Alvo existe ────────────────────────────────────────────────────
    let targetUser: admin.auth.UserRecord;
    try {
      targetUser = await admin.auth().getUser(input.uid);
    } catch {
      await trilha({ targetUid: input.uid, resultado: 'negado_alvo_inexistente' });
      throw new https.HttpsError(
        'not-found',
        `Usuário '${input.uid}' não encontrado no Firebase Auth.`
      );
    }

    // ── 6. Merge preservador + revogação de refresh tokens ────────────────
    const novasClaims = mergePlatformAdminCapability(
      targetUser.customClaims,
      input.conceder
    );

    await admin.auth().setCustomUserClaims(input.uid, novasClaims);
    await admin.auth().revokeRefreshTokens(input.uid);

    // Trilha DEPOIS da escrita no caminho feliz: o que se registra aqui é o
    // fato consumado, e o `targetRole` prova que a capacidade coexistiu com o
    // papel em vez de substituí-lo.
    await trilha({
      targetUid: input.uid,
      targetRole: String((targetUser.customClaims as Partial<AuthClaims> | undefined)?.role ?? 'sem_papel'),
      resultado: input.conceder ? 'concedido' : 'revogado',
    });

    const result: SetPlatformAdminCapabilityOutput = {
      success: true,
      uid: input.uid,
      platformAdmin: input.conceder,
    };
    return result;
  }
);

// ---------------------------------------------------------------------------
// BREAK-GLASS — Admin SDK, sem caller, NUNCA exposto ao cliente
// ---------------------------------------------------------------------------

/**
 * ⚠️ RECUPERAÇÃO DE DEADLOCK. Liga/desliga a capacidade sem verificar caller.
 *
 * Por que precisa existir. O piso de 1 administrador vale contra REVOGAÇÃO,
 * não contra EXCLUSÃO DE CONTA nem contra perda de acesso à última conta
 * administradora. Zerado o conjunto de administradores, não há caminho de volta
 * pelo produto: `canSetClaims` exige um administrador vivo, e não há nenhum.
 *
 * Esta função é esse caminho de volta, e só ele — procedimento de INCIDENTE.
 * Roda com credencial de serviço, fora de qualquer superfície de cliente — o
 * mesmo padrão de `setTenantClaimsAdmin`. NÃO exportar como callable, NÃO
 * chamar de handler que receba `context.auth`: fazê-lo entrega a nomeação a
 * quem chamar o handler e apaga as invariantes inteiras.
 *
 * Antes de usar, o caminho normal: um administrador vivo nomeia o sucessor por
 * `setPlatformAdminCapability`. Nomeie ANTES de apagar qualquer conta de
 * administração — é o que mantém este break-glass na gaveta.
 */
export async function setPlatformAdminCapabilityAdmin(
  uid: string,
  conceder: boolean
): Promise<void> {
  const user = await admin.auth().getUser(uid);
  const claims = mergePlatformAdminCapability(user.customClaims, conceder);

  await admin.auth().setCustomUserClaims(uid, claims);
  await admin.auth().revokeRefreshTokens(uid);

  // WARN, não INFO: uso de break-glass tem de saltar no Cloud Logging.
  logger.warn('set_platform_admin_capability_break_glass', { uid, conceder });

  // Trilha BEST-EFFORT: break-glass roda em incidente, e um Firestore fora do
  // ar não pode ser o motivo de a plataforma ficar sem administrador. O log
  // acima é a garantia; o doc é o conforto.
  try {
    await registrarAcessoAuditado(
      admin.firestore(),
      TIPO_AUDITORIA_CAPACIDADE,
      { callerUid: 'break_glass', callerRole: 'admin_sdk', targetUid: uid, resultado: conceder ? 'concedido' : 'revogado' },
      'capacidade_plataforma_break_glass'
    );
  } catch (err) {
    logger.error('set_platform_admin_capability_break_glass_trilha_falhou', {
      uid,
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}
