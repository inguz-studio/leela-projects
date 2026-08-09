// =============================================================================
// functions/src/platform/resgatarConviteOrganizador.ts
//
// Cloud Function callable: resgate do código de convite de organizador
// (E16 · S1609-T1 · RN-413/414/415).
//
// Contrato (overlay da home — S1609-T2):
//   resgatarConviteOrganizador({ codigo }) -> { tenantId, replay }
//
// -----------------------------------------------------------------------------
// Anti-enumeração (RN-414)
// -----------------------------------------------------------------------------
// UMA resposta para todos os "não": inexistente, usado, revogado e expirado
// devolvem `permission-denied` com a MESMA frase (`ERRO_RESGATE_CONVITE`).
// Diferenciar qualquer um deles transforma o overlay num oráculo que confirma
// códigos válidos — e o espaço de busca (31^8) só é caro enquanto nenhuma
// resposta separa "não existe" de "existe, mas já foi".
//
// O cliente NUNCA lê `convitesOrganizador` (Rules negam a todo papel que não
// seja platform_admin); esta Function é o único caminho, e ela roda com Admin
// SDK, que bypassa Rules.
//
// A uniformidade vale para TODO chamador, não só para o candidato do caminho
// feliz: a conta com papel conflitante (`platform_admin`, `tenant_staff`,
// `promoter`, `athlete` demovido) atravessava até o provisionamento antes de
// ser recusada, e a recusa de lá chegava como `internal` — diferente do
// `permission-denied` do código morto. Era um oráculo de validade. Ver
// `contaElegivelParaResgate`.
//
// -----------------------------------------------------------------------------
// Rate-limit (RN-415)
// -----------------------------------------------------------------------------
// 5 tentativas por hora POR CONTA, consumidas ANTES de qualquer leitura do
// convite — inclusive quando o código nem tem o formato certo. Consumir só
// depois da validação de formato criaria dois tempos de resposta distintos, e
// tempo é oráculo. O balde é por `uid` (a chamada exige autenticação: o
// overlay só existe logado), via `consumirRateLimit` — janela deslizante,
// fail-closed, contador no servidor.
//
// -----------------------------------------------------------------------------
// Atomicidade nos DOIS sentidos (RN-414)
// -----------------------------------------------------------------------------
// Uma transação Firestore não abraça o `provisionTenant` (que fala com o Auth
// e seta claims). O par é montado com CAS + compensação:
//
//   1. TRANSAÇÃO DE RESERVA: `ativo → usado` com `usadoPor`/`usadoEm`/
//      `tenantId`. É aqui que a corrida de duplo resgate é decidida — o
//      Firestore serializa, um vence e o outro relê o doc já `usado` e recebe
//      o erro genérico.
//   2. `provisionTenantCore` (RN-403) — a MESMA máquina do caminho manual do
//      super-admin (S1601). Não existe segunda máquina de criação de tenant.
//   3. FALHA no passo 2 ⇒ COMPENSAÇÃO: o código volta a `ativo` (só se ainda
//      estiver reservado por ESTA conta). "Falha no provisionamento não queima
//      o código."
//   4. Sucesso ⇒ o código `usado` aponta para um tenant que existe. "Código
//      queimado sem tenant não existe."
//
// REPLAY: reexecutar com o mesmo código já resgatado por ESTA conta devolve
// `replay: true` em vez do erro genérico — sem isso, o retry de rede depois de
// um resgate bem-sucedido diria "código inválido" a quem acabou de acertar.
//
// -----------------------------------------------------------------------------
// A conta que resgata nasceu `athlete` (achado desta lane)
// -----------------------------------------------------------------------------
// `onCreateUser` dá claim `athlete` por default a toda conta nova — inclusive
// à do organizador que acabou de se cadastrar. O `provisionTenantCore` recusa
// promover conta com papel conflitante (guarda do review Onda1 #2), e isso
// barraria TODO resgate. A extensão é a mínima possível e explícita:
// `ProvisionOptions.autoCadastroUid` autoriza a promoção `athlete →
// tenant_owner` SÓ para o uid que está resgatando para si mesmo. Não é
// exceção nova de segurança: o caminho já era permitido para conta SEM papel;
// o que muda é reconhecer o papel default que o próprio trigger acabou de pôr.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  COLECAO_CONVITES_ORGANIZADOR,
  ERRO_RESGATE_CONVITE,
  JANELA_RESGATE_CONVITE_MS,
  LIMITE_RESGATE_CONVITE,
  conviteResgatavel,
  derivarSlugOrganizacao,
  normalizarCodigoOrganizador,
  validarCodigoOrganizador,
  type ProvisionInput,
  type StatusConviteOrganizador,
} from '@leela/core';
import { consumirRateLimit, hashChave } from '../shared/rateLimit';
import {
  contaElegivelParaPapelDeOrganizador,
  type ClaimsDeElegibilidade,
} from './elegibilidadeOrganizador';
import { provisionTenantCore } from './provisionTenant';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface ResgatarConviteInput {
  codigo: string;
}

export interface ResgatarConviteResult {
  tenantId: string;
  /** true = esta conta já havia resgatado ESTE código (retry idempotente). */
  replay: boolean;
}

/** Teto de sufixos ao desempatar slug (`castelo`, `castelo-2`, …). */
const MAX_SUFIXO_SLUG = 50;

/** Erro ÚNICO do "não" (RN-414). Nunca varie a frase nem o código. */
function recusaGenerica(): https.HttpsError {
  return new https.HttpsError('permission-denied', ERRO_RESGATE_CONVITE);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Slug LIVRE a partir da semente (P7). `tenantId == slug` (determinístico —
 * ver core/platform/provisioning.ts), então precisa ser único: o desempate é
 * numérico e estável. Corrida entre dois resgates simultâneos com o mesmo
 * nome de organização ainda é resolvida pelo `provisionTenantCore` (que
 * devolve `already-exists`); aqui só evitamos o caso comum.
 */
async function slugLivre(
  db: admin.firestore.Firestore,
  base: string
): Promise<string> {
  const raiz = base.length > 0 ? base : 'organizador';
  for (let i = 1; i <= MAX_SUFIXO_SLUG; i++) {
    const candidato = i === 1 ? raiz : `${raiz}-${i}`;
    const snap = await db.collection('tenants').doc(candidato).get();
    if (!snap.exists) return candidato;
  }
  throw new https.HttpsError(
    'resource-exhausted',
    'Não foi possível derivar um endereço livre para a organização.'
  );
}

/**
 * A conta pode virar dona de um tenant por ESTE caminho (fix ONBOARD-REV ·
 * DEF-B)? Espelha, e só espelha, a guarda de papel do `provisionTenantCore`:
 * conta sem papel algum e `athlete` LIMPO passam; `platform_admin`,
 * `tenant_staff`, `promoter`, `tenant_owner` e o `athlete` com o marcador de
 * demoção deliberada não.
 *
 * A LISTA NÃO MORA MAIS AQUI (PONTE-ELEGIVEL-1). A régua é o
 * `contaElegivelParaPapelDeOrganizador`, e a porta da área do cliente lê a
 * MESMA função — era a divergência entre as duas guardas que deixava o
 * divulgador e a ex-organizadora rebaixada atravessarem a porta para morrer
 * aqui. O que continua sendo trabalho DESTE arquivo é a leitura do crachá no
 * Auth e a decisão de fail-open quando ela falha.
 *
 * Exportada para que o teste da porta possa comparar as duas decisões contra a
 * função de verdade, em vez de contra uma cópia da lista.
 *
 * Existe por duas razões, e nenhuma delas é autorização — a autoridade segue
 * sendo o `provisionTenantCore`:
 *
 *   1. **Anti-enumeração (RN-414).** Sem esta consulta, a conta com papel
 *      conflitante recebia `permission-denied` quando o código não existia e
 *      `internal` quando ele existia e estava vivo — o provisionamento só é
 *      alcançado depois de um código VÁLIDO. Duas respostas para dois estados
 *      é exatamente o oráculo que a RN-414 proíbe, e ele estava documentado
 *      como contrato no `api-client` ("`internal` → falha APÓS um código
 *      válido").
 *   2. **O convite não pode piscar.** O caminho antigo RESERVAVA o código
 *      (`ativo → usado`), descobria a recusa lá no provisionamento e
 *      compensava. Quem nunca poderia ser dono queimava e devolvia convite
 *      alheio a cada tentativa, e ainda lia "Tente de novo em instantes" — um
 *      convite para repetir para sempre um pedido que jamais vai passar.
 *
 * O veredito é lido ANTES da transação (é I/O de Auth) e aplicado DENTRO dela,
 * DEPOIS do ramo de replay: quem já resgatou é `tenant_owner` — inelegível por
 * esta régua — e o retry idempotente dessa conta tem de continuar de pé.
 */
export async function contaElegivelParaResgate(
  auth: admin.auth.Auth,
  callerUid: string
): Promise<boolean> {
  try {
    const user = await auth.getUser(callerUid);
    return contaElegivelParaPapelDeOrganizador(
      (user.customClaims ?? {}) as ClaimsDeElegibilidade
    );
  } catch {
    // Ler o papel falhou: NÃO é motivo para barrar quem talvez seja legítimo.
    // Fail-open aqui é seguro porque isto não autoriza nada — o
    // `provisionTenantCore` continua sendo a guarda de verdade, e o pior caso
    // é voltar ao comportamento anterior a este fix.
    return true;
  }
}

/** Semente do slug: organização do cadastro; nome; local-part do e-mail. */
function sementeDoSlug(
  organizacao: unknown,
  nome: unknown,
  email: string
): string {
  const candidatos = [organizacao, nome, email.split('@')[0]];
  for (const bruto of candidatos) {
    const slug = derivarSlugOrganizacao(bruto);
    if (slug.length > 0) return slug;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Núcleo (testável contra o Emulator; o callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function resgatarConviteCore(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  rawInput: unknown,
  callerUid: string,
  callerEmail: string,
  agora: Date = new Date()
): Promise<ResgatarConviteResult> {
  // ── Rate-limit ANTES de tudo (RN-415) ───────────────────────────────────
  // Chave por conta, hasheada (LGPD: uid nunca vira docId em claro).
  await consumirRateLimit(
    db,
    [
      {
        chave: hashChave(`resgate_convite_organizador:${callerUid}`),
        limite: LIMITE_RESGATE_CONVITE,
        janelaMs: JANELA_RESGATE_CONVITE_MS,
      },
    ],
    agora
  );

  const input = rawInput as Partial<ResgatarConviteInput> | null;
  const codigo = normalizarCodigoOrganizador(input?.codigo);
  if (!validarCodigoOrganizador(codigo)) {
    // MESMA recusa do código inexistente — formato é conhecimento público
    // (constante do core), então não há informação a proteger aqui; o que se
    // protege é a UNIFORMIDADE da resposta.
    throw recusaGenerica();
  }

  const conviteRef = db.collection(COLECAO_CONVITES_ORGANIZADOR).doc(codigo);
  const profRef = db.collection('profissionais').doc(callerUid);

  // Papel da conta, lido UMA vez (ver `contaElegivelParaResgate`). Fica aqui,
  // antes da transação, porque é I/O de Auth — dentro dela seria reexecutado a
  // cada retry do Firestore.
  const elegivel = await contaElegivelParaResgate(auth, callerUid);

  // ── Dados do cadastro (semente do tenant — P7) ──────────────────────────
  const profSnap = await profRef.get();
  const organizacao = profSnap.get('organizacao') as unknown;
  const nomePessoa = (profSnap.get('nome') as unknown) ?? undefined;
  const nomeTenant =
    typeof organizacao === 'string' && organizacao.trim().length >= 2
      ? organizacao.trim()
      : typeof nomePessoa === 'string' && nomePessoa.trim().length >= 2
        ? nomePessoa.trim()
        : callerEmail.split('@')[0] ?? 'Organizador';

  // ── Reserva do código (CAS) — decide a corrida de duplo resgate ─────────
  const slugPretendido = await slugLivre(
    db,
    sementeDoSlug(organizacao, nomePessoa, callerEmail)
  );

  const reserva = await db.runTransaction<{ replay: boolean; tenantId: string }>(
    async (tx) => {
      const snap = await tx.get(conviteRef);
      if (!snap.exists) throw recusaGenerica();

      const status = snap.get('status') as StatusConviteOrganizador;
      const usadoPor = snap.get('usadoPor') as string | undefined;
      const tenantIdGravado = snap.get('tenantId') as string | undefined;

      // Replay: ESTA conta já resgatou ESTE código. Idempotente e honesto.
      if (usadoPor === callerUid && typeof tenantIdGravado === 'string') {
        return { replay: true, tenantId: tenantIdGravado };
      }

      if (!conviteResgatavel({ status, expiraEm: snap.get('expiraEm') }, agora)) {
        throw recusaGenerica();
      }

      // Último gate antes de QUEIMAR o convite (DEF-B): a conta que o
      // provisionamento vai recusar de qualquer forma não reserva o código e
      // recebe a MESMA recusa de um código morto. Não é autorização — é a
      // uniformidade da RN-414 e a integridade do convite.
      if (!elegivel) throw recusaGenerica();

      tx.update(conviteRef, {
        status: 'usado' satisfies StatusConviteOrganizador,
        usadoPor: callerUid,
        usadoEm: FieldValue.serverTimestamp(),
        tenantId: slugPretendido,
      });
      return { replay: false, tenantId: slugPretendido };
    }
  );

  if (reserva.replay) {
    // Reaplica o provisionamento: ele é idempotente (replay) e cobre a falha
    // pós-commit do run anterior (claims que não chegaram a ser gravadas).
    await provisionarComoOrganizador(db, auth, {
      tenantId: reserva.tenantId,
      nomeTenant,
      callerUid,
      callerEmail,
      nomePessoa,
    });
    return { tenantId: reserva.tenantId, replay: true };
  }

  // ── Provisionamento (RN-403 — máquina única) + compensação ──────────────
  try {
    await provisionarComoOrganizador(db, auth, {
      tenantId: reserva.tenantId,
      nomeTenant,
      callerUid,
      callerEmail,
      nomePessoa,
    });
  } catch (err) {
    // Devolve o código ao estado `ativo` — falha de provisionamento não pode
    // queimar o convite de quem não fez nada errado. CAS defensivo: só
    // reverte o que ESTA execução reservou.
    await db
      .runTransaction(async (tx) => {
        const snap = await tx.get(conviteRef);
        if (!snap.exists) return;
        if (snap.get('usadoPor') !== callerUid) return;
        tx.update(conviteRef, {
          status: 'ativo' satisfies StatusConviteOrganizador,
          usadoPor: FieldValue.delete(),
          usadoEm: FieldValue.delete(),
          tenantId: FieldValue.delete(),
        });
      })
      .catch((compErr: unknown) => {
        // Compensação falhou: o código fica reservado sem tenant. É o único
        // resíduo possível e ele EXIGE runbook — nunca engolir.
        logger.error('resgate_convite_compensacao_falhou', {
          callerUid,
          tenantId: reserva.tenantId,
          reason: compErr instanceof Error ? compErr.message : String(compErr),
        });
      });

    logger.error('resgate_convite_provisionamento_falhou', {
      callerUid,
      tenantId: reserva.tenantId,
      reason: err instanceof Error ? err.message : String(err),
    });
    // Falha de INFRA não vira a recusa genérica: quem digitou um código válido
    // merece saber que o problema não foi o código dele.
    throw new https.HttpsError(
      'internal',
      'Não foi possível liberar o acesso agora. Tente de novo em instantes.'
    );
  }

  logger.info('resgate_convite_organizador', {
    callerUid,
    tenantId: reserva.tenantId,
  });

  return { tenantId: reserva.tenantId, replay: false };
}

/** Invoca a máquina única de provisionamento com os dados do cadastro. */
async function provisionarComoOrganizador(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  ctx: {
    tenantId: string;
    nomeTenant: string;
    callerUid: string;
    callerEmail: string;
    nomePessoa: unknown;
  }
): Promise<void> {
  const input: ProvisionInput = {
    nome: ctx.nomeTenant.slice(0, 80),
    slug: ctx.tenantId,
    tipo: 'produtor',
    ownerEmail: ctx.callerEmail,
    ...(typeof ctx.nomePessoa === 'string' && ctx.nomePessoa.trim().length > 0
      ? { ownerNome: ctx.nomePessoa.trim() }
      : {}),
  };
  await provisionTenantCore(db, auth, input, ctx.callerUid, undefined, {
    autoCadastroUid: ctx.callerUid,
  });
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/**
 * `resgatarConviteOrganizador` — chamada pelo overlay da conta travada.
 * Exige autenticação (RN-415): não existe resgate anônimo.
 */
export const resgatarConviteOrganizador = https.onCall(
  async (data: unknown, context) => {
    if (!context.auth) {
      throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
    }
    const email = context.auth.token.email;
    if (typeof email !== 'string' || email.length === 0) {
      // O provisionamento resolve owner POR E-MAIL; sem e-mail no token não há
      // como amarrar a conta ao tenant.
      throw new https.HttpsError(
        'failed-precondition',
        'A conta precisa ter e-mail para receber acesso ao painel.'
      );
    }
    return resgatarConviteCore(
      admin.firestore(),
      admin.auth(),
      data,
      context.auth.uid,
      email
    );
  }
);
