// =============================================================================
// functions/src/finance/getBankDetailsForPayout.ts
//
// Callable `getBankDetailsForPayout` (LEELA-E09s-L2-T5 · RN-354/356 ·
// decisão #8 — fica na V1, COM auditoria).
//
// O ÚNICO ponto do sistema onde o número de conta/PIX volta EM CLARO —
// just-in-time, para o platform_admin executar o pagamento manual (mock,
// RN-356) de um repasse APROVADO. Regras:
//
//   1. SÓ platform_admin. Qualquer outro papel autenticado ⇒
//      permission-denied E o acesso NEGADO é REGISTRADO (aceite T5:
//      "não-admin ⇒ negado + acesso registrado").
//   2. TODO desfecho vira registro em `auditoriaAcessos/{autoId}`
//      (quem/quando/qual repasse/resultado — trilha LGPD): concedido,
//      negado (papel/estado/inexistente) e erro de decifra. A coleção não
//      tem match nas Rules ⇒ deny-by-default para todo cliente.
//   3. A auditoria é gravada FORA de transação e ANTES do throw — um abort
//      não apaga a trilha do acesso tentado.
//   4. Escopo mínimo: o repasse precisa estar 'aprovado' (é o único momento
//      operacional que justifica ver a conta — o fluxo L4-T2). Ampliar =
//      decisão consciente pós-V1, não default.
//   5. NUNCA em log: nem `logger.*`, nem mensagens de erro, nem o doc de
//      auditoria carregam o número em claro (ADR-014 §5) — o dado só
//      existe no RETORNO do callable para o admin autenticado.
// =============================================================================

import * as admin from 'firebase-admin';
import { https, runWith } from 'firebase-functions/v1';
import type { AuthClaims, EstadoRepasse } from '@leela/core';
import type { FinanceCaller } from './atores';
import { registrarAcessoAuditado } from '../shared/auditoriaAcessos';
import {
  decifrarDadosBancarios,
  ENV_BANK_DATA_KEY,
  type EnvelopeCifrado,
} from './cifraDadosBancarios';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

// A constante mora em `shared/auditoriaAcessos` desde que ganhou um segundo
// consumidor (F2); o re-export mantém o import histórico deste módulo válido.
export { AUDITORIA_ACESSOS_COL } from '../shared/auditoriaAcessos';

export type ResultadoAcessoAuditado =
  | 'concedido'
  | 'negado_papel'
  | 'negado_repasse_inexistente'
  | 'negado_estado'
  | 'negado_sem_dados'
  | 'erro_decifra';

export interface GetBankDetailsInput {
  tenantId: string;
  repasseId: string;
}

export interface GetBankDetailsResult {
  tenantId: string;
  repasseId: string;
  /** Número COMPLETO — existe só neste retorno (RN-354, acesso auditado). */
  conta: string;
  /** Chave PIX COMPLETA — null quando o organizador não cadastrou. */
  pix: string | null;
  banco: string;
  agencia: string;
  tipo: string;
  titular: string;
  cpfCnpjMascarado: string;
  /** Aviso fixo para a UI (L4-T2): o acesso foi registrado. */
  avisoAuditoria: string;
}

export const AVISO_AUDITORIA =
  'Acesso a dado bancário registrado (LGPD — quem, quando, qual repasse).';

// ---------------------------------------------------------------------------
// Auditoria (RN-354 — fora de tx, antes de qualquer throw)
// ---------------------------------------------------------------------------

async function registrarAcesso(
  db: Db,
  registro: {
    tenantId: string;
    repasseId: string;
    uid: string;
    papel: string;
    resultado: ResultadoAcessoAuditado;
  }
): Promise<void> {
  // Observabilidade sem dado sensível — só ids/resultado (ADR-014 §5)
  await registrarAcessoAuditado(
    db,
    'acesso_dados_bancarios',
    registro,
    'acesso_dados_bancarios'
  );
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator)
// ---------------------------------------------------------------------------

export async function getBankDetailsForPayoutCore(
  db: Db,
  rawInput: unknown,
  caller: FinanceCaller
): Promise<GetBankDetailsResult> {
  const input = rawInput as Partial<GetBankDetailsInput> | null;
  const tenantId = input?.tenantId;
  const repasseId = input?.repasseId;
  if (
    typeof tenantId !== 'string' || tenantId.length === 0 ||
    typeof repasseId !== 'string' || repasseId.length === 0
  ) {
    throw new https.HttpsError(
      'invalid-argument',
      '"tenantId" e "repasseId" são obrigatórios.'
    );
  }

  const papel = typeof caller.claims.role === 'string' ? caller.claims.role : 'desconhecido';
  const base = { tenantId, repasseId, uid: caller.uid, papel };

  // 1. Papel — negação é REGISTRADA (aceite T5)
  if (caller.claims.role !== 'platform_admin') {
    await registrarAcesso(db, { ...base, resultado: 'negado_papel' });
    throw new https.HttpsError(
      'permission-denied',
      'Apenas platform_admin acessa dados bancários completos — acesso registrado (RN-354).'
    );
  }

  // 2. Repasse existe e está 'aprovado' (escopo mínimo do payout manual)
  const repasseSnap = await db
    .doc(`tenants/${tenantId}/repasses/${repasseId}`)
    .get();
  if (!repasseSnap.exists) {
    await registrarAcesso(db, { ...base, resultado: 'negado_repasse_inexistente' });
    throw new https.HttpsError('not-found', `Repasse '${repasseId}' não existe.`);
  }
  const estado = repasseSnap.get('estado') as EstadoRepasse;
  if (estado !== 'aprovado') {
    await registrarAcesso(db, { ...base, resultado: 'negado_estado' });
    throw new https.HttpsError(
      'failed-precondition',
      `Dados completos só para repasse 'aprovado' (está '${estado}') — acesso registrado.`
    );
  }

  // 3. Envelope cifrado
  const secretSnap = await db
    .doc(`tenants/${tenantId}/dadosBancariosSecret/current`)
    .get();
  if (!secretSnap.exists) {
    await registrarAcesso(db, { ...base, resultado: 'negado_sem_dados' });
    throw new https.HttpsError(
      'failed-precondition',
      'Tenant sem dados bancários cifrados cadastrados.'
    );
  }

  // 4. Decifra JIT — falha NUNCA expõe payload/chave na mensagem
  let conta: string;
  let pix: string | null;
  try {
    const payload = decifrarDadosBancarios(
      secretSnap.data() as unknown as EnvelopeCifrado,
      tenantId
    );
    conta = payload.conta;
    pix = payload.pix;
  } catch {
    await registrarAcesso(db, { ...base, resultado: 'erro_decifra' });
    throw new https.HttpsError(
      'internal',
      'Falha ao decifrar dados bancários — acesso registrado; verifique a rotação de chaves (ADR-014).'
    );
  }

  // 5. Acesso CONCEDIDO — registrado (quem/quando/qual repasse)
  await registrarAcesso(db, { ...base, resultado: 'concedido' });

  const publicoSnap = await db
    .doc(`tenants/${tenantId}/dadosBancarios/current`)
    .get();

  return {
    tenantId,
    repasseId,
    conta,
    pix,
    banco: (publicoSnap.get('banco') as string) ?? '',
    agencia: (publicoSnap.get('agencia') as string) ?? '',
    tipo: (publicoSnap.get('tipo') as string) ?? '',
    titular: (publicoSnap.get('titular') as string) ?? '',
    cpfCnpjMascarado: (publicoSnap.get('cpfCnpjMascarado') as string) ?? '',
    avisoAuditoria: AVISO_AUDITORIA,
  };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

export const getBankDetailsForPayout = runWith({
  secrets: [ENV_BANK_DATA_KEY],
}).https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    // Sem uid não há a quem atribuir a tentativa — nega sem registro
    // (documentado: a auditoria é de ACESSO IDENTIFICADO).
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return getBankDetailsForPayoutCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
