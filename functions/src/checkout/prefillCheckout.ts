// =============================================================================
// functions/src/checkout/prefillCheckout.ts
//
// Pré-preenchimento do checkout (LEELA-CK2-T2 · RN-154 · DEC-0719).
//
// Comprador AUTENTICADO com compra anterior → os dados que a plataforma já
// conhece DELE voltam pré-preenchíveis (gênero, telefone, nascimento,
// endereço, CPF). Fonte: o registro de pessoa (RN-173) VINCULADO à conta.
//
// FRONTEIRA DE PII (RN-172 — a review antagonista ataca isto):
//   1. Só conta REAL: sessão anônima devolve `prefill: null` (uid anônimo
//      não tem identidade — e o vetor "anon adivinha uid" nem existe: a
//      query é pelo uid VERIFICADO do token, nunca de input).
//   2. Só o PRÓPRIO: a query é `pessoas.contaUid == caller.uid` — o vínculo
//      é first-claim escrito server-side (pessoaRegistry/conta-sem-fricção);
//      não existe NENHUM canal de input (CPF, e-mail, id) para pedir dados
//      de terceiro. PII de outra pessoa é inalcançável por construção.
//   3. Zero PII em log (LGPD) — só uid/flags.
//
// Leitura via parse do core (parsePessoa — fail-fast); campos ausentes
// degradam Postel ('' / 'nao_informado' / sem endereço).
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  COLECAO_PESSOAS,
  parsePessoa,
  type EnderecoPedido,
  type GeneroInscrito,
} from '@leela/core';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Dados pré-preenchíveis da PRÓPRIA pessoa (RN-154). '' = não conhecido. */
export interface CheckoutPrefill {
  nome: string;
  /** CPF canônico (11 dígitos) — o PRÓPRIO, da pessoa vinculada à conta. */
  cpf: string;
  genero: GeneroInscrito;
  nascimento: string;
  telefone: string;
  endereco?: EnderecoPedido;
}

export interface GetCheckoutPrefillResult {
  /** null = sem prefill (anônimo, sem vínculo, ou sem dados conhecidos). */
  prefill: CheckoutPrefill | null;
}

export interface PrefillCaller {
  uid: string;
  ehAnonimo: boolean;
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function getCheckoutPrefillCore(
  db: Db,
  caller: PrefillCaller
): Promise<GetCheckoutPrefillResult> {
  // Sessão anônima não tem identidade — sem erro (UX): o form abre vazio.
  if (caller.ehAnonimo) return { prefill: null };

  const snap = await db
    .collection(COLECAO_PESSOAS)
    .where('contaUid', '==', caller.uid)
    .limit(10)
    .get();
  if (snap.empty) return { prefill: null };

  // Uma conta deveria ter 1 pessoa (1 CPF por pessoa); mais de uma indica
  // claims múltiplos legítimos-raros (correção de CPF antiga) — vence o
  // registro mais recente, com desempate determinístico pelo id.
  const docs = [...snap.docs].sort((a, b) => {
    const ta = (a.get('atualizadoEm') as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    const tb = (b.get('atualizadoEm') as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    if (tb !== ta) return tb - ta;
    return a.id < b.id ? -1 : 1;
  });
  if (docs.length > 1) {
    logger.warn('prefill_multiplas_pessoas_na_conta', {
      uid: caller.uid,
      qtd: docs.length,
    });
  }
  const doc = docs[0];
  if (doc === undefined) return { prefill: null };

  let prefill: CheckoutPrefill;
  try {
    const pessoa = parsePessoa(doc.id, doc.data() ?? {});
    const dados = pessoa.dadosConhecidos;
    prefill = {
      nome: dados?.nome ?? '',
      cpf: pessoa.cpf,
      genero: dados?.genero ?? 'nao_informado',
      nascimento: dados?.nascimento ?? '',
      telefone: dados?.telefone ?? '',
      ...(dados?.endereco !== undefined ? { endereco: dados.endereco } : {}),
    };
  } catch (err) {
    // Doc corrompido não pode travar o checkout — prefill é conveniência.
    logger.error('prefill_pessoa_corrompida', {
      uid: caller.uid,
      err: err instanceof Error ? err.message : String(err),
    });
    return { prefill: null };
  }

  logger.info('prefill_servido', { uid: caller.uid }); // sem PII
  return { prefill };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `getCheckoutPrefill` — dados conhecidos do PRÓPRIO comprador (RN-154). */
export const getCheckoutPrefill = https.onCall(async (_data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  const signInProvider = (
    context.auth.token as { firebase?: { sign_in_provider?: string } }
  ).firebase?.sign_in_provider;
  return getCheckoutPrefillCore(admin.firestore(), {
    uid: context.auth.uid,
    ehAnonimo: signInProvider === undefined || signInProvider === 'anonymous',
  });
});
