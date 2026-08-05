// =============================================================================
// functions/src/auth/confirmarCodigoDeAcesso.ts
//
// As DUAS callables que ficam depois do código (S1229-T4 e S1230-T1 · RN-476 a
// RN-480). Superfícies PÚBLICAS: quem chega aqui ainda não tem sessão.
//
// -----------------------------------------------------------------------------
// POR QUE SÃO DUAS, E POR QUE ISSO NÃO É INVENÇÃO
// -----------------------------------------------------------------------------
// A tabela de estados da spec (§Parte 7) escreve o fluxo em letra: *"código
// aceito → o formulário de senha, com o nome quando ele fizer falta"*. A senha
// é pedida DEPOIS do código aceito, e o campo de nome só aparece para quem não
// tem conta — informação que, pela RN-477, só pode existir DEPOIS da prova.
// Logo há, por desenho da própria spec, uma volta ao servidor entre "provei que
// tenho a caixa" e "defini a senha":
//
//   1. `confirmarCodigoDeAcesso` — consome o código na transação e devolve a
//      PROVA de continuação e a divergência (precisa de nome? qual nome?).
//   2. `concluirAcessoComProva` — define a senha (ou cria a conta), carimba
//      `emailVerified` e devolve o token para a sessão nascer.
//
// A prova NÃO é uma segunda superfície de credencial: ela não prova posse de
// e-mail nenhum, não pode ser pedida, não chega por e-mail e não vale nada sem
// que alguém já tenha acertado o código. O código continua com uso único
// literal — duas requisições com o mesmo código correto produzem um sucesso e
// uma negativa. A separação está detalhada em `codigoDeAcesso.ts` §4.
//
// -----------------------------------------------------------------------------
// A ORDEM É A DA RN-453, E ELA É ACEITE: SENHA PRIMEIRO, SESSÃO DEPOIS
// -----------------------------------------------------------------------------
// O token de sessão só nasce DEPOIS de a senha estar gravada. Um caminho que
// abrisse sessão sem senha seria login por código — a jornada da Sympla, e não
// a que o dono descreveu. Se a gravação da senha falha, ninguém entra.
//
// -----------------------------------------------------------------------------
// A NEGATIVA É UMA SÓ
// -----------------------------------------------------------------------------
// Código errado, vencido, já usado, de endereço que nunca pediu nada e teto
// esgotado saem daqui com o MESMO código de erro e a MESMA frase (RN-419
// aplicada a cinco causas). O que acompanha é `tentativasRestantes`, que a spec
// autorizou em letra e que não distingue conta: pedir um código sempre grava um
// código, exista ou não a conta, e as quatro causas de morte devolvem `0`.
//
// ⚠ É FÁCIL UM DELES ESCAPAR com código de erro próprio — um `not-found` para
// "nunca pediu", um `deadline-exceeded` para "vencido". Qualquer um desses é o
// oráculo de volta. Por isso a negativa nasce numa função só (`negar`).
//
// -----------------------------------------------------------------------------
// O TOKEN DEVOLVIDO É CREDENCIAL
// -----------------------------------------------------------------------------
// A resposta que o carrega merece o mesmo cuidado que o código: ele não vai
// para log, não vai para URL e não é persistido em lugar nenhum do servidor.
// Ele nasce, viaja uma vez e vira sessão no cliente.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https, runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  aceiteDatadoPeloCliente,
  codigoDeAcessoValido,
  emailDeCodigoValido,
  isPlatformAdmin,
  MENSAGEM_CODIGO_NEGADO,
  normalizarCodigoDeAcesso,
  normalizarEmailCodigo,
  senhaDeContaValida,
  SENHA_CONTA_MIN,
  TERMO_CONTA_FINALIDADE,
  TERMO_CONTA_VERSAO,
  validarContaParticipante,
} from '@leela/core';
import {
  codigoAcessoPepper,
  consumirCodigoDeAcesso,
  consumirProvaDeAcesso,
  provaConfere,
} from './codigoDeAcesso';

// ---------------------------------------------------------------------------
// A negativa única
// ---------------------------------------------------------------------------

/**
 * A ÚNICA negativa de credencial deste módulo (RN-476/RN-419).
 *
 * Nasce numa função só de propósito: espalhar `throw new HttpsError(...)` pelos
 * ramos é como um dos cinco motivos ganha código de erro próprio sem ninguém
 * perceber, e aí a tela vira oráculo por acidente.
 */
function negar(tentativasRestantes: number): https.HttpsError {
  return new https.HttpsError('permission-denied', MENSAGEM_CODIGO_NEGADO, {
    tentativasRestantes,
  });
}

// ---------------------------------------------------------------------------
// 1. Consumir o código
// ---------------------------------------------------------------------------

export interface ConfirmarCodigoResultado {
  ok: true;
  /** Credencial de continuação — uso único, mesmo prazo do código. */
  prova: string;
  /**
   * A divergência da RN-477, e ela só existe DEPOIS da prova: não é vazamento
   * contar sobre a caixa de e-mail de quem acabou de provar que a tem.
   */
  precisaCadastro: boolean;
  /**
   * Nome de exibição da conta, quando ela existe. É o que faz a tela de
   * "Criar conta" pedir só a senha para quem já tem conta, sem nunca dizer
   * "e-mail já cadastrado".
   */
  nome: string;
}

export async function confirmarCodigoDeAcessoCore(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  rawInput: unknown,
  agora: Date = new Date()
): Promise<ConfirmarCodigoResultado> {
  const input = rawInput as { email?: unknown; codigo?: unknown } | null;

  // Forma inválida NÃO é a negativa de credencial: ela não gasta tentativa e
  // não toca o documento. A tela já barra antes, e um `permission-denied` aqui
  // faria o contador da tela mentir.
  if (!emailDeCodigoValido(input?.email) || !codigoDeAcessoValido(input?.codigo)) {
    throw new https.HttpsError('invalid-argument', 'Informe o e-mail e o código.');
  }
  const email = normalizarEmailCodigo(input?.email);
  const codigo = normalizarCodigoDeAcesso(input?.codigo);

  // FAIL-CLOSED do pepper ANTES do bloco protegido: a falta do segredo tem de
  // subir alta e crua (é erro de provisionamento), e não pode ser confundida
  // com contenção pelo tratamento abaixo.
  codigoAcessoPepper();

  // ─────────────────────────────────────────────────────────────────────
  // A SEXTA CAUSA — a que escapava com código de erro próprio (REV · DEF-6).
  //
  // O cabeçalho deste módulo avisa: "É FÁCIL UM DELES ESCAPAR com código de
  // erro próprio... por isso a negativa nasce numa função só". A review achou
  // um que escapava sem ninguém ter escrito um `throw`: sob contenção alta no
  // MESMO endereço (que é a condição de um ataque, não de um dia normal), o
  // `runTransaction` esgota as retentativas e ABORTA, e o erro cru do
  // Firestore atravessava a callable inteira. Medido: com 80 palpites
  // simultâneos e o emulador sob carga, o número de comparações caiu de cinco
  // para dois — as outras foram abortos, invisíveis no log.
  //
  // Abortar NÃO custa tentativa e NÃO produz veredito, então o teto continua
  // exato (comparações == `tentativas`, provado por caso). O que estava errado
  // era a RESPOSTA: um erro distinguível, numa tela que não tem estado para
  // ele, e sem uma linha de log sob a única condição em que isso acontece.
  //
  // `unavailable` é a resposta honesta — "tente de novo", sem afirmar nada
  // sobre o código nem sobre a conta. Ela não distingue endereço com conta de
  // endereço sem: depende da carga no documento, não de quem é a pessoa.
  // ─────────────────────────────────────────────────────────────────────
  let consumo: Awaited<ReturnType<typeof consumirCodigoDeAcesso>>;
  try {
    consumo = await consumirCodigoDeAcesso(db, email, codigo, agora);
  } catch (err) {
    logger.error('codigo_acesso_consumo_abortado', {
      alerta: true,
      severidade: 'critico',
      err: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
    throw new https.HttpsError(
      'unavailable',
      'Não conseguimos conferir o código agora. Tente de novo em instantes.'
    );
  }
  if (!consumo.ok) {
    // O motivo real vai para o LOG, nunca para a resposta.
    logger.info('codigo_acesso_negado', { motivo: consumo.motivo });
    throw negar(consumo.restantes);
  }

  // DAQUI PARA BAIXO a divergência é livre: a pessoa provou que tem a caixa.
  const conta = await contaDoEmail(auth, email);
  logger.info('codigo_acesso_confirmado', { temConta: conta !== null });

  return {
    ok: true,
    prova: consumo.prova,
    precisaCadastro: conta === null,
    nome: conta?.displayName ?? '',
  };
}

/** A conta daquele endereço, ou `null`. Só é chamada DEPOIS da prova. */
async function contaDoEmail(
  auth: admin.auth.Auth,
  email: string
): Promise<admin.auth.UserRecord | null> {
  try {
    return await auth.getUserByEmail(email);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/user-not-found' || code === 'auth/email-not-found') return null;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 2. Concluir — define a senha (conta existente) ou cria a conta
// ---------------------------------------------------------------------------

export interface ConcluirAcessoResultado {
  ok: true;
  /** Token de sessão. CREDENCIAL — não logar, não persistir, não pôr em URL. */
  token: string;
  /** Só para a tela saber que caminho contar; nunca é erro. */
  contaCriada: boolean;
}

export async function concluirAcessoComProvaCore(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  rawInput: unknown,
  agora: Date = new Date()
): Promise<ConcluirAcessoResultado> {
  const input = rawInput as {
    email?: unknown;
    prova?: unknown;
    senha?: unknown;
    nome?: unknown;
    consentimentoLgpd?: unknown;
  } | null;

  if (!emailDeCodigoValido(input?.email)) {
    throw new https.HttpsError('invalid-argument', 'Informe um e-mail válido.');
  }
  const email = normalizarEmailCodigo(input?.email);

  if (!senhaDeContaValida(input?.senha)) {
    throw new https.HttpsError(
      'invalid-argument',
      `Use uma senha de pelo menos ${SENHA_CONTA_MIN} caracteres.`
    );
  }
  const senha = input?.senha as string;

  // RN-446: aceite datado pelo CLIENTE é recusado, e a chamada inteira cai. O
  // servidor não ignora o campo em silêncio — ignorar deixaria uma tela achando
  // que datou, e a discrepância só apareceria numa auditoria seis meses depois.
  if (aceiteDatadoPeloCliente(input)) {
    throw new https.HttpsError(
      'invalid-argument',
      'O instante do aceite é carimbado pelo servidor.'
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // A ORDEM É DA REVIEW (REV-CONTAS-MOTOR · DEF-1): CONFERE, decide o ramo,
  // valida o formulário — e SÓ ENTÃO consome.
  //
  // Consumindo primeiro, um formulário sem o nome ou sem o aceite queimava a
  // prova E o código, e a pessoa tinha de pedir OUTRO código. Esse é
  // literalmente o desfecho que a separação em duas callables foi justificada
  // para evitar; ele só tinha mudado de lugar. O uso único não afrouxa: quem
  // decide é `consumirProvaDeAcesso`, na transação, imediatamente antes da
  // primeira mutação — duas conclusões simultâneas passam as duas pela
  // conferência e só uma consome (há caso de concorrência).
  // ─────────────────────────────────────────────────────────────────────
  const prova = typeof input?.prova === 'string' ? input.prova : '';
  if (!(await provaConfere(db, email, prova, agora))) {
    throw negar(0);
  }

  const existente = await contaDoEmail(auth, email);

  // RN-449d — A CONTA DE ADMINISTRAÇÃO NÃO ENTRA PELA PORTA DO PARTICIPANTE.
  //
  // O `contaSemFriccao` recusa vincular uma conta `platform_admin` a um
  // comprador (`contaSemFriccao.ts:288`) e a review achou a mesma fronteira
  // ABERTA aqui: esta callable é pública, anônima e sem App Check, e trocava a
  // senha da conta de administração, carimbava `emailVerified` nela e devolvia
  // token de sessão. A prova de posse da caixa não é, e nunca foi, autorização
  // para administrar a plataforma — a conta de administração tem a jornada de
  // senha DELA, no painel.
  //
  // A recusa NÃO é oráculo: quem chega aqui já acertou o código, ou seja, já
  // tem a caixa daquele endereço nas mãos. E ela vem ANTES do consumo — a
  // pessoa não perde nem a prova nem o código por bater nesta porta.
  if (existente !== null && (await ehContaDeAdministracao(auth, existente))) {
    logger.error('codigo_acesso_conta_admin_recusada', {
      alerta: true,
      motivo: 'conta_admin',
    });
    throw new https.HttpsError(
      'failed-precondition',
      'Esta conta é de administração da plataforma. Entre pelo painel.'
    );
  }

  const precisaNascer = existente === null;
  if (precisaNascer) {
    // Validação do formulário ANTES do consumo — ver o bloco de ordem acima.
    validarFormularioDeConta(email, input);
  }

  if (!(await consumirProvaDeAcesso(db, email, prova, agora))) {
    throw negar(0);
  }

  if (existente !== null) {
    // ── Ramo A · a conta já existe (S1229-T4) ────────────────────────────
    // Senha primeiro, sessão depois (RN-453). O `emailVerified` é carimbado no
    // MESMO gesto: é ele que faz o código valer como prova de posse, e é ele
    // que destrava a recomendação do POSSE-EMAIL-1.
    await auth.updateUser(existente.uid, { password: senha, emailVerified: true });
    const token = await auth.createCustomToken(existente.uid);
    logger.info('acesso_concluido', { contaCriada: false });
    return { ok: true, token, contaCriada: false };
  }

  // ── Ramo B · a conta não existe (S1230-T1) ─────────────────────────────
  return criarContaDeParticipante(db, auth, { email, senha, input }, agora);
}

// ---------------------------------------------------------------------------
// 3. A criação — nasce inteira ou não nasce (RN-478)
// ---------------------------------------------------------------------------

/** O nome tal como ele entra na conta — uma normalização só para os dois usos. */
function nomeDoFormulario(input: { nome?: unknown } | null): string {
  return typeof input?.nome === 'string' ? input.nome.trim() : '';
}

/**
 * A régua do formulário de criação, SEM efeito colateral (REV · DEF-1).
 *
 * Roda antes do consumo da prova. Não é a negativa de credencial: quem chega
 * aqui já provou que tem a caixa, e dizer "falta o nome" não é oráculo
 * (RN-477). O que ela não pode mais fazer é custar o código à pessoa.
 */
function validarFormularioDeConta(
  email: string,
  input: { nome?: unknown; consentimentoLgpd?: unknown } | null
): void {
  const erros = validarContaParticipante({
    nome: nomeDoFormulario(input),
    email,
    consentimentoLgpd: input?.consentimentoLgpd === true,
  });
  if (erros.length > 0) {
    throw new https.HttpsError('failed-precondition', erros.join(' '));
  }
}

/**
 * "Isto é conta de administração?" — pelo guard PURO do core
 * (`isPlatformAdmin`), que é a autoridade única do papel no repositório.
 *
 * ⚠ POR QUE NÃO O `PAPEL_ADMIN_PLATAFORMA` DO `contaSemFriccao`, que é onde a
 * RN-449d já mora: importá-lo arrasta o módulo do checkout inteiro para dentro
 * destas callables, e o `secretsBinding.contract` REPROVOU exatamente isso —
 * `confirmarCodigoDeAcesso → falta BREVO_API_KEY`. O fecho de segredos é
 * transitivo, então uma importação por conveniência daria a uma superfície
 * pública de credencial acesso à chave do provedor de e-mail sem que ninguém
 * tivesse pedido. O guard do core não carrega segredo nenhum.
 */
async function ehContaDeAdministracao(
  auth: admin.auth.Auth,
  conta: admin.auth.UserRecord
): Promise<boolean> {
  const claims = ((await auth.getUser(conta.uid)).customClaims ?? {}) as Record<
    string,
    unknown
  >;
  return isPlatformAdmin(claims as never);
}

async function criarContaDeParticipante(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  dados: { email: string; senha: string; input: { nome?: unknown } | null },
  agora: Date
): Promise<ConcluirAcessoResultado> {
  const nome = nomeDoFormulario(dados.input);

  // A conta nasce JÁ VERIFICADA: o código é a prova de posse, e verificar
  // depois seria pedir a mesma prova duas vezes.
  let uid = '';
  try {
    const criado = await auth.createUser({
      email: dados.email,
      password: dados.senha,
      emailVerified: true,
      displayName: nome,
    });
    uid = criado.uid;
  } catch (err) {
    // Corrida de duas conclusões concorrentes para o mesmo endereço: o
    // perdedor cai no ramo "conta existe" em vez de subir `internal`. Mesmo
    // tratamento que o `provisionAssessoria` já aplica.
    if ((err as { code?: unknown }).code === 'auth/email-already-exists') {
      const conta = await contaDoEmail(auth, dados.email);
      if (conta === null) throw err;
      await auth.updateUser(conta.uid, { password: dados.senha, emailVerified: true });
      const token = await auth.createCustomToken(conta.uid);
      return { ok: true, token, contaCriada: false };
    }
    throw err;
  }

  try {
    // MERGE, nunca sobrescrita (RN-478): o gatilho `onCreateUser` grava
    // `atletas/{uid}` por conta própria e a corrida entre os dois é real.
    // Sobrescrever apagaria o `criadoEm` do gatilho; o merge deixa os dois
    // convivendo em qualquer ordem de chegada.
    await db
      .collection('atletas')
      .doc(uid)
      .set(
        {
          id: uid,
          nome,
          email: dados.email,
          consentimentoLgpd: {
            versao: TERMO_CONTA_VERSAO,
            finalidade: TERMO_CONTA_FINALIDADE,
            // Instante do SERVIDOR (RN-446). O relógio do cliente não carimba
            // consentimento nesta casa.
            aceitoEm: FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );
  } catch (err) {
    // ── O DESFAZER (RN-478) ──────────────────────────────────────────────
    // Este é o caminho que produziu a conta órfã do organizador, e ele
    // precisa estar PROVADO, não descrito. Conta no Auth criada + gravação
    // falhando = conta que ocupa o endereço de alguém sem documento nenhum
    // por trás, e que ninguém consegue recriar porque o endereço "já existe".
    // O desfazer pode falhar TAMBÉM (REV-CONTAS-MOTOR · DEF-5). Quando falha,
    // sobra no Auth uma conta VERIFICADA, com a senha que a pessoa acabou de
    // digitar, e SEM o `atletas/{uid}` que carrega o consentimento — e a
    // segunda volta dela cai no ramo "conta existe", que não grava
    // consentimento nenhum. Ou seja: a conta fica usável e o aceite da LGPD
    // some para sempre, em silêncio.
    //
    // Não há fila de compensação nesta casa, então o que esta lane pode
    // entregar é a EVIDÊNCIA no formato que a política de alerta desta rodada
    // casa (`alerta`/`severidade`) — sem PII, com o uid, que é o que um
    // operador precisa para limpar a conta à mão.
    const desfeito = await auth
      .deleteUser(uid)
      .then(() => true)
      .catch(() => false);
    logger.error('conta_participante_rollback', {
      desfeito,
      ...(desfeito ? {} : { alerta: true, severidade: 'critico', uid }),
      err: err instanceof Error ? err.message : String(err),
    });
    throw new https.HttpsError(
      'internal',
      'Não conseguimos criar a conta agora. Tente de novo em instantes.'
    );
  }

  // Papel: o `onCreateUser` atribui `athlete` por default. NADA aqui eleva
  // papel, cria `profissionais/{uid}` ou concede claim de tenant (RN-480) —
  // e a fronteira é provada por teste, não presumida.
  const token = await auth.createCustomToken(uid);
  logger.info('acesso_concluido', { contaCriada: true, quando: agora.toISOString() });
  return { ok: true, token, contaCriada: true };
}

// ---------------------------------------------------------------------------
// Callables (PÚBLICAS — quem confirma o código ainda não tem sessão)
// ---------------------------------------------------------------------------

export const confirmarCodigoDeAcesso = runWith({
  secrets: ['CODIGO_ACESSO_PEPPER'],
}).https.onCall(async (data: unknown): Promise<ConfirmarCodigoResultado> => {
  return confirmarCodigoDeAcessoCore(admin.firestore(), admin.auth(), data);
});

export const concluirAcessoComProva = runWith({
  secrets: ['CODIGO_ACESSO_PEPPER'],
}).https.onCall(async (data: unknown): Promise<ConcluirAcessoResultado> => {
  return concluirAcessoComProvaCore(admin.firestore(), admin.auth(), data);
});
