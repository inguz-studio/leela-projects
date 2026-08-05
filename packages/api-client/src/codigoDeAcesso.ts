// =============================================================================
// @leela/api-client — o código de seis dígitos das duas portas da landing
// (SPEC-CONTAS-LANDING · RN-476 a RN-482).
//
// POR QUE UM ARQUIVO PRÓPRIO, e não mais um bloco em `auth.ts`: as duas telas
// novas (`/primeiro-acesso` e `/criar-conta`) consomem UMA máquina, e ela é
// distinta do login e da recuperação por link. Misturá-la ali produziria um
// arquivo em que "esqueci minha senha" e "primeiro acesso por código" moram
// coladas — e elas são justamente as duas superfícies que o CONTA-1 pergunta
// ao dono se devem conviver.
//
// A REGRA QUE ATRAVESSA TUDO (RN-477): as duas portas chamam as MESMAS
// callables com o MESMO payload. O que muda por porta é a moldura, a copy e o
// campo de nome — nunca o que o servidor faz. Nenhuma tela pode dizer "você não
// tem conta" nem "e-mail já cadastrado": as duas frases são o oráculo voltando
// pela janela, e nenhuma delas existe neste pacote.
// =============================================================================

import { signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { getLeelaAuth, getLeelaFunctions } from './firebase';

export interface SolicitarCodigoResultado {
  ok: true;
  /** Minutos de validade — a tela mostra o mesmo número que o servidor aplica. */
  validadeMinutos: number;
}

/**
 * Pede o código de seis dígitos para um endereço (RN-476).
 *
 * A resposta é a mesma exista ou não conta no endereço, e o tempo também: o
 * servidor não consulta "existe conta?" antes de enviar. A tela mostra a frase
 * única — *"Se este endereço puder receber um código, ele já saiu."* — nos
 * quatro desfechos.
 *
 * ERROS que o chamador distingue (nenhum deles depende de existir conta):
 *   · `invalid-argument`  → endereço mal formado (a tela já barra antes);
 *   · `resource-exhausted`→ limitador por ALVO estourou (3/15min, 10/24h). A
 *     frase é a do `rateLimit.ts`: "Muitas tentativas. Tente novamente em
 *     alguns minutos.";
 *   · `unavailable` / `failed-precondition` → o e-mail NÃO saiu (provedor
 *     recusou ou não está configurado). A tela é honesta e não finge que saiu
 *     — é a doutrina de 04/08, e aqui ela vale com uma credencial no meio.
 */
export async function solicitarCodigoDeAcesso(
  email: string
): Promise<SolicitarCodigoResultado> {
  const fn = httpsCallable<{ email: string }, SolicitarCodigoResultado>(
    getLeelaFunctions(),
    'solicitarCodigoDeAcesso'
  );
  const { data } = await fn({ email });
  return data;
}

export interface ConfirmarCodigoResultado {
  ok: true;
  /**
   * Credencial de continuação. Vive em MEMÓRIA pela duração do formulário —
   * nunca em `localStorage`, nunca na URL, nunca em log. Ela é o que permite a
   * tela pedir a senha depois do código aceito sem gastar um segundo código.
   */
  prova: string;
  /** Mostrar o campo de nome e o checkbox do termo? (RN-477/RN-479) */
  precisaCadastro: boolean;
  /** Nome já conhecido, quando a conta existe. Vazio quando não existe. */
  nome: string;
}

/**
 * Confirma o código de seis dígitos (RN-476/RN-477).
 *
 * As cinco causas de negativa chegam aqui como o MESMO `permission-denied` com
 * a mesma frase; o que muda é `details.tentativasRestantes`, e a tela usa esse
 * número para escolher entre "Código incorreto ou vencido" (restam n) e "Este
 * código não vale mais. Peça um novo." (restam 0).
 *
 * O que a tela faz com `precisaCadastro` é a divergência da RN-477, e ela é
 * legítima porque acontece DEPOIS da prova. Mesmo assim, **nenhuma frase pode
 * dizer "você não tem conta" nem "e-mail já cadastrado"**: o campo de nome
 * simplesmente aparece, ou não aparece.
 */
export async function confirmarCodigoDeAcesso(
  email: string,
  codigo: string
): Promise<ConfirmarCodigoResultado> {
  const fn = httpsCallable<
    { email: string; codigo: string },
    ConfirmarCodigoResultado
  >(getLeelaFunctions(), 'confirmarCodigoDeAcesso');
  const { data } = await fn({ email, codigo });
  return data;
}

export interface ConcluirAcessoInput {
  email: string;
  prova: string;
  senha: string;
  /** Só quando `precisaCadastro` — o servidor recusa a criação sem ele. */
  nome?: string;
  /** Só quando `precisaCadastro`. Nasce DESMARCADO na tela (RN-479). */
  consentimentoLgpd?: boolean;
}

export interface ConcluirAcessoResultado {
  ok: true;
  contaCriada: boolean;
}

/**
 * Define a senha (ou cria a conta) e ENTRA — a ordem da RN-453: senha primeiro,
 * sessão depois.
 *
 * O token devolvido pelo servidor é credencial e não sai desta função: ele é
 * trocado por sessão aqui mesmo, com `signInWithCustomToken`. Devolvê-lo ao
 * chamador seria uma credencial a mais viajando por props de componente, com
 * chance de parar em log de erro ou em estado serializado.
 *
 * ⚠ O `consentimentoLgpd` é o BOOLEANO do checkbox e nada mais. Instante e
 * versão são carimbados pelo SERVIDOR (RN-446): mandar `aceitoEm` daqui faz o
 * servidor recusar a chamada inteira, de propósito.
 */
export async function concluirAcessoComProva(
  input: ConcluirAcessoInput
): Promise<ConcluirAcessoResultado> {
  const fn = httpsCallable<
    ConcluirAcessoInput,
    ConcluirAcessoResultado & { token: string }
  >(getLeelaFunctions(), 'concluirAcessoComProva');
  const { data } = await fn(input);
  await signInWithCustomToken(getLeelaAuth(), data.token);
  return { ok: true, contaCriada: data.contaCriada };
}
