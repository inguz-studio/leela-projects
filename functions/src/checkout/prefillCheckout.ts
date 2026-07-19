// =============================================================================
// functions/src/checkout/prefillCheckout.ts
//
// Pré-preenchimento do checkout (LEELA-CK2-T2 · RN-154 · DEC-0719) com o
// gate de leitura da RN-174 (lote CLAIM-FIX · DEC-0719-ret).
//
// Comprador AUTENTICADO com compra anterior → os dados que a plataforma já
// conhece DELE voltam pré-preenchíveis (gênero, telefone, nascimento,
// endereço, CPF). Fonte: o registro de pessoa (RN-173) VINCULADO à conta.
//
// FRONTEIRA DE PII (RN-172 + RN-174 — a review antagonista ataca isto):
//   1. Só conta REAL: sessão anônima devolve `prefill: null` (uid anônimo
//      não tem identidade — e o vetor "anon adivinha uid" nem existe: a
//      query é pelo uid VERIFICADO do token, nunca de input).
//   2. Só o PRÓPRIO: a query é `pessoas.contaUid == caller.uid` — o vínculo
//      é escrito SÓ pela confirmação de pagamento (escritor único, RN-174);
//      não existe NENHUM canal de input (CPF, e-mail, id) para pedir dados
//      de terceiro. PII de outra pessoa é inalcançável por construção.
//   3. RN-174 (as três condições juntas): o vínculo só existe com pagamento
//      CONFIRMADO + conta resolvida pelo e-mail da compra (escritor); AQUI
//      o leitor exige (c) e-mail do token VERIFICADO (Firebase nativo
//      `email_verified`) e (b re-checada) e-mail do token IGUAL ao
//      `contaEmail` carimbado no claim. Sem as três: `prefill: null` —
//      NUNCA um erro que confirme a existência da ficha (sem oráculo).
//   4. Zero PII em log (LGPD) — só uid/flags.
//
// Leitura via parse do core (parsePessoa — fail-fast); campos ausentes
// degradam Postel ('' / 'nao_informado' / sem endereço). Claim legado sem
// `contaEmail` = leitura NEGADA (fail-closed; auto-cura na próxima compra
// confirmada — ver contaSemFriccao).
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
  /**
   * null = sem prefill (anônimo, sem vínculo, sem dados, e-mail não
   * verificado ou não correspondente — RN-174: todos os denies são
   * indistinguíveis de "não há ficha").
   */
  prefill: CheckoutPrefill | null;
}

export interface PrefillCaller {
  uid: string;
  ehAnonimo: boolean;
  /** E-mail do token da conta (null = token sem e-mail). */
  email: string | null;
  /** `email_verified` do token Firebase (RN-174 condição c). */
  emailVerificado: boolean;
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

  // RN-174 (c): sem e-mail VERIFICADO no token, NADA é lido — mesmo shape
  // de resposta do "sem ficha" (fail-closed, sem oráculo).
  const emailCaller =
    typeof caller.email === 'string' ? caller.email.trim().toLowerCase() : '';
  if (!caller.emailVerificado || emailCaller.length === 0) {
    return { prefill: null };
  }

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

  for (const doc of docs) {
    let pessoa;
    try {
      pessoa = parsePessoa(doc.id, doc.data() ?? {});
    } catch (err) {
      // Doc corrompido não pode travar o checkout — prefill é conveniência.
      logger.error('prefill_pessoa_corrompida', {
        uid: caller.uid,
        err: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
    // RN-174 (b) no leitor: o e-mail do token precisa SER o e-mail da compra
    // que efetivou o claim (`contaEmail`). Claim legado sem carimbo ou conta
    // que trocou de e-mail depois do claim: NEGADO (fail-closed).
    if (
      typeof pessoa.contaEmail !== 'string' ||
      pessoa.contaEmail.toLowerCase() !== emailCaller
    ) {
      continue;
    }

    const dados = pessoa.dadosConhecidos;
    const prefill: CheckoutPrefill = {
      nome: dados?.nome ?? '',
      cpf: pessoa.cpf,
      genero: dados?.genero ?? 'nao_informado',
      nascimento: dados?.nascimento ?? '',
      telefone: dados?.telefone ?? '',
      ...(dados?.endereco !== undefined ? { endereco: dados.endereco } : {}),
    };
    logger.info('prefill_servido', { uid: caller.uid }); // sem PII
    return { prefill };
  }

  // Nenhuma ficha passou o gate — indistinguível de "não há ficha".
  return { prefill: null };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/**
 * `getCheckoutPrefill` — dados conhecidos do PRÓPRIO comprador (RN-154),
 * gated pela RN-174 (pagamento confirmado + e-mail correspondente + e-mail
 * verificado — as duas primeiras valem no claim; a leitura re-checa o
 * e-mail e exige a verificação nativa do Firebase).
 */
export const getCheckoutPrefill = https.onCall(async (_data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  const token = context.auth.token as {
    email?: string;
    email_verified?: boolean;
    firebase?: { sign_in_provider?: string };
  };
  const signInProvider = token.firebase?.sign_in_provider;
  return getCheckoutPrefillCore(admin.firestore(), {
    uid: context.auth.uid,
    ehAnonimo: signInProvider === undefined || signInProvider === 'anonymous',
    email: typeof token.email === 'string' ? token.email : null,
    emailVerificado: token.email_verified === true,
  });
});
