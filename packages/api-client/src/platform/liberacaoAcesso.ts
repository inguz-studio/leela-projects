// =============================================================================
// packages/api-client/src/platform/liberacaoAcesso.ts
//
// Wrapper tipado do callable `liberarAcessoOrganizador` (ADMIN-VISAO onda 5 ·
// S1615-T3 · RN-548/RN-551). Espelha o contrato de
// `functions/src/platform/liberarAcessoOrganizador.ts` — só tipa a chamada;
// autorização, elegibilidade, provisionamento e rastro acontecem no servidor.
//
// A liberação direta e o resgate por código terminam no MESMO estado, produzido
// pelo MESMO núcleo (`provisionTenantCore`) — não existe segunda máquina de
// aprovação, e nada aqui reconstrói regra.
//
// A RECUSA TEM NOME, e é de propósito. O resgate por código responde a todos os
// "não" com a mesma frase (anti-enumeração, RN-414); esta porta é do operador
// da plataforma, que precisa saber o que consertar. O motivo chega em
// `details.motivo` e a TELA escolhe a frase — copy é voz do produto, não
// contrato de API.
// =============================================================================

import { httpsCallable, type Functions } from 'firebase/functions';

/**
 * Os motivos que o SERVIDOR nomeia, em `details.motivo`.
 *
 * Esta lista é a fonte, e a união é derivada dela — nunca escrita ao lado.
 * Mesma disciplina de `MOTIVOS_NOMEADOS` em `profissionais.ts`: duas listas
 * paralelas fazem um motivo novo compilar e cair no balde genérico, e a pessoa
 * lê "tente de novo" para uma recusa que o servidor tinha acabado de nomear.
 */
const MOTIVOS_LIBERACAO = [
  'conta_inexistente',
  'conta_sem_email',
  'conta_inelegivel',
  'sem_nome_para_endereco',
] as const;

/**
 * As recusas nomeadas da liberação direta. `indisponivel` é o balde do que não
 * é recusa de regra (rede, deploy ainda não propagado) — existe para que
 * nenhuma delas chegue ao operador como "erro interno".
 */
export type MotivoRecusaLiberacao =
  | (typeof MOTIVOS_LIBERACAO)[number]
  | 'indisponivel';

export interface LiberarAcessoInput {
  /** uid da conta que espera liberação. */
  contaUid: string;
}

export interface LiberarAcessoResult {
  tenantId: string;
  ownerUid: string;
  /** true = a conta já estava provisionada (retry idempotente, não erro). */
  replay: boolean;
}

/**
 * Libera o acesso de uma conta SEM código (RN-548). Só `platform_admin`;
 * qualquer outro papel autenticado recebe `permission-denied` com a tentativa
 * já registrada (RN-551).
 */
export async function liberarAcessoOrganizador(
  functions: Functions,
  input: LiberarAcessoInput
): Promise<LiberarAcessoResult> {
  const call = httpsCallable<LiberarAcessoInput, LiberarAcessoResult>(
    functions,
    'liberarAcessoOrganizador'
  );
  return (await call(input)).data;
}

/**
 * Traduz a falha da liberação no motivo que a tela sabe dizer.
 *
 * A leitura é do `details.motivo` que o servidor manda, e NÃO do código HTTP:
 * derivar o motivo do código obrigaria a tela a reconstruir a regra, e no dia
 * em que uma recusa nova nascesse com o mesmo código o operador leria a frase
 * errada. Motivo desconhecido vira `indisponivel` — nunca uma mensagem crua.
 * @pure
 */
export function motivoDaRecusaDaLiberacao(erro: unknown): MotivoRecusaLiberacao {
  const detalhe = (erro as { details?: { motivo?: unknown } } | null)?.details
    ?.motivo;
  if (
    typeof detalhe === 'string' &&
    (MOTIVOS_LIBERACAO as readonly string[]).includes(detalhe)
  ) {
    return detalhe as MotivoRecusaLiberacao;
  }
  return 'indisponivel';
}
