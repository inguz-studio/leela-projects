// =============================================================================
// functions/src/auth/codigoDeAcesso.ts
//
// O NÚCLEO do código de seis dígitos (S1229-T1 · RN-476 · SPEC-CONTAS-LANDING).
//
// O produto não tinha código numérico de verificação, e o Firebase Auth não o
// oferece: ele entrega LINK de ação por e-mail e código por SMS para telefone.
// Isto aqui é peça nova, e é peça de CREDENCIAL — a categoria mais cara de
// errar. Cada decisão abaixo é carga estrutural, na ordem em que um atacante
// as encontraria.
//
// -----------------------------------------------------------------------------
// 1. POR QUE HMAC COM PEPPER, E POR QUE SHA-256 PURO **NÃO** SERVE
// -----------------------------------------------------------------------------
// Só o digest persiste — isso é doutrina da casa desde o convite de assessoria
// (`provisionAssessoria.ts:89-90`), e lá o algoritmo é `sha256` puro.
// Copiá-lo aqui seria o erro caro, e a razão é ARITMÉTICA, não estilística:
//
//   · o token do convite tem 256 bits ⇒ ninguém enumera 2²⁵⁶, e o hash puro
//     basta;
//   · um código de seis dígitos tem 10⁶ valores ⇒ quem puser as mãos no
//     documento calcula o milhão de digests em MILISSEGUNDOS e recupera o
//     código em claro.
//
// A defesa é a que o CRM já aplicou ao CPF pela MESMA conta de espaço de busca
// (RN-174 · hardening A3): HMAC-SHA256 com pepper secreto, fail-closed quando
// o pepper falta. Sem o pepper, o espaço de busca do atacante deixa de ser 10⁶
// e passa a ser o da chave do HMAC.
//
// O material é o PAR, nunca o código sozinho: `"<e-mail normalizado>:<código>"`.
// Amarrar ao endereço impede que um digest observado num documento seja testado
// contra outro documento.
//
// -----------------------------------------------------------------------------
// 2. POR QUE O CONTADOR VIVE DENTRO DA TRANSAÇÃO
// -----------------------------------------------------------------------------
// É o alvo número um da review desta tarefa, e com razão: teto de tentativas
// FORA da transação é decoração. Dois pedidos simultâneos leem o mesmo valor,
// os dois acham que gastaram a primeira tentativa, e o milhão de combinações
// volta a estar ao alcance de quem paralelizar. Aqui a leitura, a comparação e
// o incremento acontecem no MESMO `runTransaction` — o Firestore aborta e
// repete quem perder a corrida, e o contador não tem como ser lido duas vezes
// com o mesmo valor.
//
// -----------------------------------------------------------------------------
// 3. POR QUE O DOCUMENTO NÃO É APAGADO NO CONSUMO
// -----------------------------------------------------------------------------
// Apagar faria a segunda tentativa cair no ramo "não existe" em vez de "já
// usado", e o SERVIDOR precisa distinguir os dois para contar tentativas. Para
// o CLIENTE os dois são a mesma negativa (RN-419 aplicada a cinco causas).
//
// -----------------------------------------------------------------------------
// 4. A PROVA — POR QUE EXISTE UM SEGUNDO PASSO, E POR QUE ELE **NÃO** É UMA
//    SEGUNDA SUPERFÍCIE DE CREDENCIAL
// -----------------------------------------------------------------------------
// A tabela de estados da spec (§Parte 7) escreve o fluxo em letra: *"código
// aceito → o formulário de senha, com o nome quando ele fizer falta"*. A senha
// é pedida DEPOIS do código aceito, e o campo de nome só aparece para quem não
// tem conta — que é informação que só existe DEPOIS da prova (RN-477).
// Logo, entre "provei que tenho a caixa" e "defini a senha" há, por desenho da
// própria spec, uma volta ao servidor.
//
// O que atravessa essa volta é a PROVA: 256 bits da entropia do sistema, com
// digest guardado NO MESMO documento, uso único, e o mesmo prazo do código.
// Ela não é um segundo caminho para provar posse do e-mail — é a continuação
// da prova única que o código já fez, e ela não vale nada sozinha: quem não
// passou pelo código não tem como fabricá-la. O código continua com uso único
// literal (duas requisições com o mesmo código correto ⇒ um sucesso e uma
// negativa), que é o teste que a fila cobra.
//
// -----------------------------------------------------------------------------
// 5. O LIMITADOR É POR ALVO, E **NÃO** POR ORIGEM
// -----------------------------------------------------------------------------
// A chave é derivada do e-mail: 3 em 15 minutos e 10 em 24 horas. Não existe
// chave por IP aqui, e não é esquecimento — o `rateLimit.ts` tem a decisão
// escrita, com o motivo: derivar IP confiável do `x-forwarded-for` num callable
// é premissa de infraestrutura NÃO verificável, um índice fixo vira bypass
// silencioso quando a topologia muda, e um balde por IP pune vizinho de NAT. O
// throttle volumétrico por origem é da BORDA (App Check / Cloud Armor), e a
// borda não está ligada — item do CTO humano no painel, e o pedido de código é
// mais um consumidor dele.
//
// -----------------------------------------------------------------------------
// 6. OPERAÇÃO — O SEGREDO NOVO
// -----------------------------------------------------------------------------
// `CODIGO_ACESSO_PEPPER` é o SÉTIMO segredo da casa e precisa existir no Secret
// Manager ANTES do deploy das functions que o declaram. Nenhum teste do
// emulador cobra isso (local, `process.env` é do processo inteiro e todo mundo
// enxerga todo mundo); quem cobra é o `secretsBinding.contract.test.ts`, e é
// por isso que o pepper entra na lista `SEGREDOS` dele junto com esta tarefa.
//
// A coleção `codigosDeAcesso` nasce SEM `match` no `firestore.rules` —
// deny-by-default, no mesmo tratamento que `rateLimits` recebe. Nenhum client
// SDK lê ou escreve digest de credencial.
// =============================================================================

import type * as admin from 'firebase-admin';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import {
  CODIGO_ACESSO_JANELA_CURTA_MS,
  CODIGO_ACESSO_JANELA_LONGA_MS,
  CODIGO_ACESSO_LIMITE_CURTO,
  CODIGO_ACESSO_LIMITE_LONGO,
  CODIGO_ACESSO_MAX_TENTATIVAS,
  CODIGO_ACESSO_TTL_MS,
  gerarCodigoDeAcesso,
  normalizarCodigoDeAcesso,
  normalizarEmailCodigo,
  tentativasRestantes,
} from '@leela/core';
import { hashChave, type JanelaRateLimit } from '../shared/rateLimit';

// ---------------------------------------------------------------------------
// Coleção
// ---------------------------------------------------------------------------

/**
 * Onde o digest com prazo mora. SEM `match` nas Rules (deny-by-default), no
 * mesmo tratamento de `rateLimits`: o que vive aqui é material de credencial e
 * nenhum client SDK tem o que fazer com ele.
 */
export const COLECAO_CODIGOS_ACESSO = 'codigosDeAcesso';

// ---------------------------------------------------------------------------
// O pepper — fail-closed, em tempo de CHAMADA
// ---------------------------------------------------------------------------

/** Nome do segredo no Secret Manager. Constante para o binding não divergir. */
export const ENV_CODIGO_ACESSO_PEPPER = 'CODIGO_ACESSO_PEPPER';

/**
 * Pepper do HMAC do código. FAIL-CLOSED: ausente ou vazio ⇒ LANÇA, em QUALQUER
 * ambiente.
 *
 * A checagem é em tempo de CHAMADA e não no load do módulo, no mesmo molde do
 * `crmIdPepper()`: o deploy não quebra, a chamada quebra alto se mal
 * provisionada. O valor NUNCA é logado nem ecoado.
 *
 * Rebaixar para "sem pepper, usa sha256 puro" seria abrir exatamente o buraco
 * que este módulo existe para fechar — e abriria em silêncio, no ambiente em
 * que importa.
 */
export function codigoAcessoPepper(): string {
  const pepper = process.env[ENV_CODIGO_ACESSO_PEPPER];
  if (typeof pepper !== 'string' || pepper.length === 0) {
    throw new Error(
      'CODIGO_ACESSO_PEPPER ausente — o código de acesso é HMAC com pepper ' +
        'secreto (RN-476, fail-closed: com 10⁶ valores, hash sem pepper é ' +
        'enumerável offline). Produção: provisionar no Secret Manager; ' +
        'emulator/teste: setar env explícita de teste.'
    );
  }
  return pepper;
}

// ---------------------------------------------------------------------------
// Digests
// ---------------------------------------------------------------------------

/**
 * Prefixos de DOMÍNIO. Três materiais diferentes passam pelo mesmo pepper (o
 * docId, o código e a prova) e nenhum deles pode ser testável contra o outro:
 * sem separação, um digest de prova observado num documento poderia ser
 * conferido contra o campo do código.
 *
 * O prefixo do CÓDIGO é vazio de propósito — a RN-476 escreve o material dele
 * em letra, `"<e-mail normalizado>:<código>"`, e mudar isso aqui faria o
 * código divergir da regra canônica.
 */
const DOMINIO_DOC = 'codigo-acesso/doc:v1:';
const DOMINIO_PROVA = 'codigo-acesso/prova:v1:';

function hmacHex(material: string): string {
  return createHmac('sha256', codigoAcessoPepper()).update(material, 'utf8').digest('hex');
}

/**
 * Digest do código (RN-476): `HMAC-SHA256(pepper, "<e-mail>:<código>")`.
 *
 * O e-mail entra normalizado porque `Ana@Leela.com` e `ana@leela.com` são a
 * mesma caixa e precisam produzir o mesmo digest para o mesmo código.
 */
export function digestCodigo(email: string, codigo: string): string {
  return hmacHex(`${normalizarEmailCodigo(email)}:${normalizarCodigoDeAcesso(codigo)}`);
}

/** Digest da prova (§4 do cabeçalho), em domínio próprio. */
export function digestProva(email: string, prova: string): string {
  return hmacHex(`${DOMINIO_PROVA}${normalizarEmailCodigo(email)}:${prova}`);
}

/**
 * DocId derivado do endereço, também por HMAC com pepper.
 *
 * Poderia ser o `hashChave` (SHA-256 truncado) que o `rateLimit.ts` usa, e a
 * escolha do HMAC aqui é deliberada: o path é a única coisa que fica visível
 * numa listagem de coleção, e um SHA-256 puro de e-mail é enumerável contra
 * qualquer lista de endereços vazada. Com pepper, quem lê a coleção não
 * descobre PARA QUEM existe código vivo. O e-mail em claro nunca entra no
 * path nem no documento (minimização, RN-172).
 */
export function docIdDoEmail(email: string): string {
  return hmacHex(`${DOMINIO_DOC}${normalizarEmailCodigo(email)}`).slice(0, 40);
}

// ---------------------------------------------------------------------------
// Limitador por ALVO (RN-476)
// ---------------------------------------------------------------------------

/**
 * As duas janelas do endereço: a curta para o dedo nervoso, a longa para o
 * ataque paciente. A chave usa `hashChave` (não o HMAC): ela é docId de
 * `rateLimits`, coleção que já tem essa convenção, e trocá-la ali criaria dois
 * formatos de chave na mesma coleção.
 */
export function janelasDoCodigo(email: string): JanelaRateLimit[] {
  const alvo = hashChave(normalizarEmailCodigo(email));
  return [
    {
      chave: `codigo-acesso-curto:${alvo}`,
      limite: CODIGO_ACESSO_LIMITE_CURTO,
      janelaMs: CODIGO_ACESSO_JANELA_CURTA_MS,
    },
    {
      chave: `codigo-acesso-longo:${alvo}`,
      limite: CODIGO_ACESSO_LIMITE_LONGO,
      janelaMs: CODIGO_ACESSO_JANELA_LONGA_MS,
    },
  ];
}

// ---------------------------------------------------------------------------
// Emissão
// ---------------------------------------------------------------------------

export interface CodigoEmitido {
  /** O código em CLARO — existe só para viajar até o e-mail e some depois. */
  codigo: string;
  expiraEm: Date;
}

/**
 * Sorteia, grava o digest e devolve o código em claro para o envio.
 *
 * INVALIDAÇÃO (RN-476): a gravação é `set` INTEIRO, nunca `merge`. Pedir um
 * código novo SUBSTITUI o anterior — digest, contador e prova. Sem isso, cada
 * pedido acrescentaria uma chance ao atacante em vez de substituí-la, e o
 * limitador viraria acumulador em vez de teto.
 *
 * O documento nasce ANTES do envio (RN-482) — quem chama mata o documento se o
 * provedor recusar. Devolver "enviamos" para quem nunca vai receber é o
 * incidente de 04/08 servido de novo.
 */
export async function emitirCodigoDeAcesso(
  db: admin.firestore.Firestore,
  email: string,
  agora: Date = new Date()
): Promise<CodigoEmitido> {
  const codigo = gerarCodigoDeAcesso();
  const expiraEm = new Date(agora.getTime() + CODIGO_ACESSO_TTL_MS);
  await db
    .collection(COLECAO_CODIGOS_ACESSO)
    .doc(docIdDoEmail(email))
    .set({
      digest: digestCodigo(email, codigo),
      criadoEm: Timestamp.fromDate(agora),
      expiraEm: Timestamp.fromDate(expiraEm),
      tentativas: 0,
      consumidoEm: null,
      morto: false,
      motivoMorte: null,
      provaDigest: null,
      provaExpiraEm: null,
      provaConsumidaEm: null,
    });
  return { codigo, expiraEm };
}

/**
 * Mata o código porque o e-mail não saiu (RN-482).
 *
 * Best-effort de propósito: a chamada já vai devolver erro explícito ao
 * cliente, e falhar aqui não pode transformar "não enviamos" em 500 opaco. O
 * código morto tem prazo de dez minutos de qualquer forma.
 */
export async function matarCodigoDeAcesso(
  db: admin.firestore.Firestore,
  email: string,
  motivo: 'envio_falhou'
): Promise<void> {
  await db
    .collection(COLECAO_CODIGOS_ACESSO)
    .doc(docIdDoEmail(email))
    .set({ morto: true, motivoMorte: motivo }, { merge: true })
    .catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Consumo
// ---------------------------------------------------------------------------

/** Motivo interno — para LOG e TESTE. Nunca para a resposta (RN-476). */
export type MotivoNegativa =
  | 'inexistente'
  | 'morto'
  | 'ja_usado'
  | 'vencido'
  | 'errado'
  | 'esgotado';

export type ConsumoCodigo =
  | {
      ok: true;
      /** Credencial de continuação (§4 do cabeçalho) — uso único, mesmo prazo. */
      prova: string;
      restantes: number;
    }
  | { ok: false; motivo: MotivoNegativa; restantes: number };

/** Comparação em tempo constante de digests hex (molde `provisionAssessoria`). */
function digestConfere(esperado: string, persistido: unknown): boolean {
  if (typeof persistido !== 'string' || persistido.length !== esperado.length) {
    // Comprimento diferente já é negativa: `timingSafeEqual` LANÇA com
    // buffers de tamanhos distintos, e um throw aqui viraria erro `internal`
    // distinguível da negativa — oráculo pela porta dos fundos.
    return false;
  }
  return timingSafeEqual(Buffer.from(esperado, 'utf8'), Buffer.from(persistido, 'utf8'));
}

function paraDate(valor: unknown): Date | null {
  if (valor instanceof Date) return valor;
  if (
    typeof valor === 'object' &&
    valor !== null &&
    typeof (valor as { toDate?: unknown }).toDate === 'function'
  ) {
    return (valor as { toDate(): Date }).toDate();
  }
  return null;
}

/**
 * Lê, compara e consome — TUDO na mesma transação (§2 do cabeçalho).
 *
 * As cinco causas de negativa (inexistente, morto, já usado, vencido, errado e
 * esgotado) devolvem a MESMA forma para o chamador. O `motivo` existe para log
 * e teste e não pode chegar à tela.
 *
 * `restantes` vale 0 em TODAS as causas em que o código não está mais vivo —
 * as quatro ficam indistinguíveis entre si — e traz a contagem real só quando
 * o código está vivo e a pessoa errou (decisão da spec, §Parte 7).
 */
export async function consumirCodigoDeAcesso(
  db: admin.firestore.Firestore,
  email: string,
  codigoBruto: string,
  agora: Date = new Date()
): Promise<ConsumoCodigo> {
  const ref = db.collection(COLECAO_CODIGOS_ACESSO).doc(docIdDoEmail(email));
  const esperado = digestCodigo(email, codigoBruto);
  // A prova nasce FORA da transação: o callback pode ser reexecutado pelo
  // Firestore, e um valor sorteado lá dentro mudaria entre as tentativas —
  // o documento gravaria um digest e o cliente receberia outro.
  const prova = randomBytes(32).toString('hex');
  const provaDigest = digestProva(email, prova);

  return db.runTransaction<ConsumoCodigo>(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false, motivo: 'inexistente', restantes: 0 };

    const dados = snap.data() ?? {};
    if (dados['morto'] === true) return { ok: false, motivo: 'morto', restantes: 0 };
    if (paraDate(dados['consumidoEm']) !== null) {
      return { ok: false, motivo: 'ja_usado', restantes: 0 };
    }
    const expiraEm = paraDate(dados['expiraEm']);
    if (expiraEm === null || expiraEm.getTime() <= agora.getTime()) {
      return { ok: false, motivo: 'vencido', restantes: 0 };
    }

    const gastas = typeof dados['tentativas'] === 'number' ? dados['tentativas'] : 0;
    if (gastas >= CODIGO_ACESSO_MAX_TENTATIVAS) {
      // Defesa em profundidade: o ramo abaixo já mata o código ao esgotar, mas
      // um documento herdado de versão anterior (ou tocado à mão) não pode
      // ganhar tentativa extra por não ter o `morto`.
      tx.update(ref, { morto: true, motivoMorte: 'tentativas_esgotadas' });
      return { ok: false, motivo: 'esgotado', restantes: 0 };
    }

    if (!digestConfere(esperado, dados['digest'])) {
      const novas = gastas + 1;
      const esgotou = novas >= CODIGO_ACESSO_MAX_TENTATIVAS;
      tx.update(ref, {
        tentativas: novas,
        ...(esgotou ? { morto: true, motivoMorte: 'tentativas_esgotadas' } : {}),
      });
      return {
        ok: false,
        motivo: esgotou ? 'esgotado' : 'errado',
        restantes: tentativasRestantes(novas),
      };
    }

    tx.update(ref, {
      consumidoEm: Timestamp.fromDate(agora),
      provaDigest,
      provaExpiraEm: Timestamp.fromDate(new Date(agora.getTime() + CODIGO_ACESSO_TTL_MS)),
      provaConsumidaEm: null,
    });
    return { ok: true, prova, restantes: tentativasRestantes(gastas) };
  });
}

/**
 * Consome a PROVA (§4 do cabeçalho) — uso único, na mesma transação.
 *
 * A prova tem 256 bits, então não há teto de tentativas a defender: enumerá-la
 * não é uma corrida que alguém possa vencer dentro dos dez minutos. O que
 * importa é o uso único, e ele é o mesmo mecanismo do código.
 */
export async function consumirProvaDeAcesso(
  db: admin.firestore.Firestore,
  email: string,
  prova: string,
  agora: Date = new Date()
): Promise<boolean> {
  const ref = db.collection(COLECAO_CODIGOS_ACESSO).doc(docIdDoEmail(email));
  const esperado = typeof prova === 'string' && prova.length > 0 ? digestProva(email, prova) : '';

  return db.runTransaction<boolean>(async (tx) => {
    if (esperado.length === 0) return false;
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    const dados = snap.data() ?? {};
    if (paraDate(dados['provaConsumidaEm']) !== null) return false;
    const expira = paraDate(dados['provaExpiraEm']);
    if (expira === null || expira.getTime() <= agora.getTime()) return false;
    if (!digestConfere(esperado, dados['provaDigest'])) return false;
    tx.update(ref, { provaConsumidaEm: Timestamp.fromDate(agora) });
    return true;
  });
}
