// =============================================================================
// functions/src/cliente/gateAreaCliente.ts
//
// O GATE da área do cliente (S1222-T1 · RN-451, sobre a RN-174).
//
// POR QUE CALLABLE, E NÃO RULE. `pedidos` e `eventos/{id}/inscritos` são
// tenant-scoped e fechadas ao papel `athlete` (`firestore.rules`). A fila
// ADMINSEP escreve a fronteira em uma linha: "se alguma task parecer pedir
// para abrir coleção tenant-scoped ao `athlete`, a task está errada; o molde é
// callable do próprio dono da conta". Abrir `platform/config` à conta travada
// já foi tentado uma vez e custou a reconciliação da RN-417. Este módulo é o
// molde EXATO do `getCheckoutPrefill` (checkout/prefillCheckout.ts), que já
// resolve o mesmo problema: devolver dado tenant-scoped a um participante sem
// mover uma vírgula das Rules.
//
// AS TRÊS RESPOSTAS, E POR QUE ELAS NÃO COLAPSAM EM UMA. A RN-451 proíbe
// mostrar lista vazia para quem não pode ler: "sem e-mail verificado mostra o
// estado honesto com o reenvio, e não a lista vazia". Então o resultado
// carrega um ESTADO, e "não há compras" (`ok` + lista vazia) é distinguível de
// "esta sessão não prova quem é" (`sessao_anonima`) e de "esta conta ainda não
// confirmou o e-mail" (`email_nao_verificado`). Colapsar os três produziria a
// tela que mente — a mesma família de defeito que o dono viu em 04/08, quando
// pagou um PIX real e nenhuma superfície mostrou a compra.
//
// SESSÃO ANÔNIMA É SESSÃO (RN-451, primeira linha). O checkout cria sessão
// ANÔNIMA para invocar callables (`CheckoutFlow.tsx`), e ela vive no mesmo
// Auth, no mesmo navegador, muitas vezes na mesma pessoa. `context.auth` é
// verdadeiro para ela. Uma guarda escrita como "tem usuário?" aceitaria o uid
// anônimo — por isso o provedor de sign-in é lido explicitamente aqui, e não
// inferido.
//
// PROVA DE POSSE DO E-MAIL (o que este gate NÃO afrouxa). O item de painel
// POSSE-EMAIL-1 (vínculo por e-mail sem prova de posse) aguarda ratificação do
// dono, e a lane tem ordem de não piorar a fronteira. Este leitor exige
// `email_verified` NATIVO do Firebase e o e-mail do token IGUAL ao carimbo da
// compra que efetivou o claim — as mesmas duas condições que o prefill já
// exige. Ou seja: a área do cliente é ESTRITAMENTE mais fechada que a RN-469,
// que autoriza o mesmo doc de pedido sem checar verificação nenhuma.
//
// Zero PII em log (LGPD): só uid, contagens e flags.
// =============================================================================

import type * as admin from 'firebase-admin';
import { COLECAO_PESSOAS } from '@leela/core';

export type Db = admin.firestore.Firestore;

/**
 * Estado da leitura da área do cliente. `ok` é a ÚNICA resposta em que a lista
 * pode ser lida como verdade; nos outros dois a lista vem vazia porque a
 * pergunta não pôde ser feita, e não porque a resposta seja "nada".
 */
export type EstadoAreaCliente = 'ok' | 'sessao_anonima' | 'email_nao_verificado';

/** O chamador, já destrinchado do token (o callable é wrapper fino). */
export interface CallerAreaCliente {
  uid: string;
  /** Provedor `anonymous` — sessão do checkout, não da área (RN-451). */
  ehAnonimo: boolean;
  /** E-mail do token (null = token sem e-mail). */
  email: string | null;
  /** `email_verified` nativo do Firebase (RN-174 condição c). */
  emailVerificado: boolean;
}

/** A conta resolvida, quando e só quando o gate passou. */
export interface ContaDoCliente {
  uid: string;
  /** E-mail do token, minúsculo e VERIFICADO. */
  email: string;
  /**
   * Ids em `pessoas` reivindicados por esta conta E carimbados com ESTE
   * e-mail (RN-174 (b) re-checada no leitor). Pode ser VAZIO sem que isso
   * seja erro: compra para terceiros não amarra pessoa (limitação documentada
   * no `contaSemFriccao`), e a conta ainda assim tem compras para ver.
   */
  pessoaIds: string[];
}

export type ResolucaoContaDoCliente =
  | { estado: 'ok'; conta: ContaDoCliente }
  | { estado: 'sessao_anonima' | 'email_nao_verificado'; conta: null };

/**
 * Teto de fichas de pessoa lidas por conta. Uma conta deveria ter 1 (1 CPF por
 * pessoa); mais de uma indica correção de CPF antiga. O teto existe para que
 * um dado corrompido não vire uma query sem fim, e é o mesmo do prefill.
 */
export const TETO_PESSOAS_POR_CONTA = 10;

/**
 * Aplica o gate e resolve as fichas de pessoa da conta.
 *
 * Ordem deliberada: anônimo ANTES de e-mail. Um uid anônimo nunca tem e-mail,
 * então checar e-mail primeiro classificaria toda sessão de checkout como
 * "e-mail não verificado" e a UI ofereceria reenviar verificação para uma
 * conta que não existe.
 */
export async function resolverContaDoCliente(
  db: Db,
  caller: CallerAreaCliente
): Promise<ResolucaoContaDoCliente> {
  if (caller.ehAnonimo) return { estado: 'sessao_anonima', conta: null };

  const email = typeof caller.email === 'string' ? caller.email.trim().toLowerCase() : '';
  if (!caller.emailVerificado || email.length === 0) {
    return { estado: 'email_nao_verificado', conta: null };
  }

  const snap = await db
    .collection(COLECAO_PESSOAS)
    .where('contaUid', '==', caller.uid)
    .limit(TETO_PESSOAS_POR_CONTA)
    .get();

  const pessoaIds: string[] = [];
  for (const doc of snap.docs) {
    // RN-174 (b) no leitor: o e-mail do token precisa SER o e-mail da compra
    // que efetivou o claim. Claim legado sem carimbo, ou conta que trocou de
    // e-mail depois do claim: NEGADO (fail-closed, igual ao prefill). O
    // carimbo se auto-cura na próxima compra confirmada da mesma conta.
    const contaEmail = doc.get('contaEmail') as unknown;
    if (typeof contaEmail !== 'string' || contaEmail.toLowerCase() !== email) continue;
    pessoaIds.push(doc.id);
  }

  return { estado: 'ok', conta: { uid: caller.uid, email, pessoaIds } };
}

/**
 * Traduz o token de um callable para o contrato acima. Isolado porque os DOIS
 * callables da área precisam da mesma leitura, e duas traduções equivalentes
 * são exatamente onde a checagem de anônimo some sem ninguém notar.
 */
export function callerDoToken(auth: {
  uid: string;
  token: { email?: string; email_verified?: boolean; firebase?: { sign_in_provider?: string } };
}): CallerAreaCliente {
  const provider = auth.token.firebase?.sign_in_provider;
  return {
    uid: auth.uid,
    // Provedor ausente é tratado como anônimo (fail-closed): um token sem
    // procedência declarada não prova identidade nomeada.
    ehAnonimo: provider === undefined || provider === 'anonymous',
    email: typeof auth.token.email === 'string' ? auth.token.email : null,
    emailVerificado: auth.token.email_verified === true,
  };
}
