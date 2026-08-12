// =============================================================================
// functions/src/platform/consultarDocumentoDaConta.ts
//
// Callable `consultarDocumentoDaConta` (ADMIN-VISAO onda 5 · S1615-T3 ·
// RN-540 · vetável V-4).
//
// -----------------------------------------------------------------------------
// O QUE O DONO DECIDIU, E O QUE O MAESTRO DECIDIU EM CIMA
// -----------------------------------------------------------------------------
// A frase do dono, na íntegra: *"sim, identificação via CPF ou documento
// estrangeiro."* Ela responde SE o CPF aparece no painel master — não POR ONDE.
// O mecanismo é o do meio das três saídas do V-4, registrado no E16: **leitura
// por callable auditado, com registro de cada consulta**, no molde do
// `getBankDetailsForPayout`. A Rule de `pessoas` (`firestore.rules:2724` —
// `read, write: if false`) **CONTINUA FECHADA**, que é a escolha mais
// conservadora do arquivo inteiro: abrir a Rule seria barato de construir e
// caro de defender, porque transformaria a coleção de CPF do sistema inteiro
// em leitura de painel.
//
// -----------------------------------------------------------------------------
// UMA CONTA POR CHAMADA — E POR QUE O CPF NÃO É COLUNA
// -----------------------------------------------------------------------------
// Sem lote e sem export (RN-540). O consumidor é a revelação POR LINHA, sob
// gesto explícito do operador, na tela `/plataforma/contas`. Uma coluna de CPF
// faria o painel emitir uma consulta auditada por linha da página só por
// alguém ter aberto a tela — e transformaria a lista em planilha de CPF, que é
// exatamente o que a RN-540 recusa quando proíbe saída em massa. A trilha só
// vale como trilha se cada registro corresponder a uma decisão de olhar.
//
// -----------------------------------------------------------------------------
// A FONTE, E O QUE ELA NÃO TEM
// -----------------------------------------------------------------------------
// `pessoas/{pessoaId}` é o registro global de identidade por CPF (RN-173): o
// docId é HMAC do CPF (path sem PII) e o DOC guarda o CPF em claro, mais
// `contaUid` — o vínculo com a conta Firebase Auth, escrito por escritor ÚNICO
// na confirmação de pagamento (RN-174). É por `contaUid` que se chega da conta
// ao documento; igualdade de campo único, índice automático.
//
// **Documento estrangeiro NÃO EXISTE no modelo de dados.** Medido: zero
// ocorrências de `estrangeir`/`passaporte`/`documentoEstrangeiro` em
// `packages/core/src`, `functions/src` e `apps/painel/src`; `Pessoa.cpf` é CPF
// canônico de 11 dígitos e nada mais; `DadosPessoaisInscrito.cpf` idem; a
// cadeia `derivarIdentidadeCliente` do CRM é CPF → e-mail → atletaId, sem ramo
// de documento estrangeiro. Então a metade estrangeira da frase do dono **não
// é implementada aqui e não é inventada**: `TipoDocumentoDaConta` nasce com um
// membro só, o retorno diz `motivoAusencia` quando não há CPF, e a TELA declara
// a lacuna com a causa nomeada. Guardar passaporte no campo `cpf` seria mentir
// no lugar onde a mentira é mais cara.
//
// -----------------------------------------------------------------------------
// AUTORIZAÇÃO E RASTRO
// -----------------------------------------------------------------------------
// Autorizado pelo predicado `isPlatformAdmin` do CORE (as DUAS pernas —
// RN-401), NÃO pela comparação `claims.role === 'platform_admin'` na mão que
// quase todo callable de plataforma ainda usa (dívida registrada em 03-spec.md
// Parte 4). Esta Function nasce do lado certo da dívida, e não acrescenta mais
// uma ocorrência dela.
//
// TODO desfecho identificado vira registro em `auditoriaAcessos` — concedido E
// negado —, gravado FORA de transação e ANTES de qualquer throw. Sem uid
// autenticado não há a quem atribuir a tentativa: `unauthenticated` não
// registra (mesma doutrina de `getBankDetailsForPayout` e de
// `listarClientesDoTenant`).
//
// NUNCA em log: nem `logger.*`, nem mensagem de erro, nem o doc de auditoria
// carregam o número (ADR-014 §5) — o documento só existe no RETORNO do
// callable para o administrador autenticado.
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import { COLECAO_PESSOAS, isPlatformAdmin, type AuthClaims } from '@leela/core';
import { registrarAcessoAuditado } from '../shared/auditoriaAcessos';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/**
 * O tipo de documento que a plataforma sabe identificar hoje. Um membro só, e
 * é fato do modelo de dados, não simplificação: documento estrangeiro não tem
 * campo em lugar nenhum (ver cabeçalho). Quando a fonte nascer, este union
 * cresce e o contrato do retorno não muda de forma.
 */
export type TipoDocumentoDaConta = 'cpf';

export interface DocumentoDaConta {
  tipo: TipoDocumentoDaConta;
  /** Só dígitos, como o registro guarda. Existe SÓ neste retorno. */
  numero: string;
}

/** Por que não há documento a mostrar — a tela nomeia a causa, nunca cala. */
export type MotivoSemDocumento =
  /** Nenhum `pessoas/*` aponta para esta conta: ela nunca comprou com CPF. */
  | 'sem_registro_de_identificacao'
  /** O registro existe mas o campo `cpf` não é utilizável (dado corrompido). */
  | 'registro_sem_documento';

export interface ConsultarDocumentoInput {
  /** uid da conta (`profissionais/{id}` ou `atletas/{id}`) a identificar. */
  contaUid: string;
}

export interface ConsultarDocumentoResult {
  contaUid: string;
  /** null quando não há documento — `motivoAusencia` diz por quê. */
  documento: DocumentoDaConta | null;
  motivoAusencia: MotivoSemDocumento | null;
  /**
   * A conta está ligada a MAIS DE UM registro de identidade (compras com CPFs
   * diferentes pela mesma conta). Devolver um número em silêncio nesse caso
   * apresentaria uma escolha arbitrária como se fosse A identificação — a tela
   * precisa poder dizer que a resposta não é única. Nenhum segundo número sai
   * daqui: isso seria o lote que a RN-540 proíbe.
   */
  haMaisDeUmRegistro: boolean;
  /** Aviso fixo para a UI: o acesso foi registrado. */
  avisoAuditoria: string;
}

export const AVISO_AUDITORIA_DOCUMENTO =
  'Consulta de documento registrada (LGPD — quem, quando, sobre qual conta).';

/** Família do acesso na trilha — é por ela que a consulta filtra. */
export const TIPO_ACESSO_DOCUMENTO_CONTA = 'acesso_documento_conta';

export type ResultadoAcessoDocumento =
  | 'concedido'
  | 'concedido_sem_registro'
  | 'negado_papel';

interface Caller {
  uid: string;
  claims: AuthClaims;
}

// ---------------------------------------------------------------------------
// Auditoria (fora de tx, antes de qualquer throw — molde getBankDetailsForPayout)
// ---------------------------------------------------------------------------

async function registrarAcesso(
  db: Db,
  registro: {
    contaUid: string;
    uid: string;
    papel: string;
    resultado: ResultadoAcessoDocumento;
  }
): Promise<void> {
  // Só ids, papel e desfecho — nunca o número (ADR-014 §5).
  await registrarAcessoAuditado(
    db,
    TIPO_ACESSO_DOCUMENTO_CONTA,
    registro,
    TIPO_ACESSO_DOCUMENTO_CONTA
  );
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator)
// ---------------------------------------------------------------------------

export async function consultarDocumentoDaContaCore(
  db: Db,
  rawInput: unknown,
  caller: Caller
): Promise<ConsultarDocumentoResult> {
  const input = rawInput as Partial<ConsultarDocumentoInput> | null;
  const contaUidBruto = input?.contaUid;

  const papel =
    typeof caller.claims.role === 'string' ? caller.claims.role : 'desconhecido';

  // Autorização ANTES de tudo (RN-540/RN-401): predicado do core, as duas
  // pernas. A negativa é REGISTRADA — é metade do rastro que a RN-540 exige.
  // `contaUid` entra no registro como o alvo declarado, mesmo malformado: o
  // que se audita é a TENTATIVA, e ela tem um alvo pretendido.
  if (!isPlatformAdmin(caller.claims)) {
    await registrarAcesso(db, {
      contaUid: typeof contaUidBruto === 'string' ? contaUidBruto : 'ausente',
      uid: caller.uid,
      papel,
      resultado: 'negado_papel',
    });
    throw new https.HttpsError(
      'permission-denied',
      'Apenas platform_admin consulta o documento de uma conta — acesso registrado (RN-540).'
    );
  }

  // Validação DEPOIS da autorização (não-admin não sonda a borda) e ANTES de
  // qualquer leitura: aqui nenhuma PII foi lida, e nada é registrado como
  // acesso concedido. Mesma disciplina de `listarClientesDoTenant`.
  if (typeof contaUidBruto !== 'string' || contaUidBruto.length === 0) {
    throw new https.HttpsError(
      'invalid-argument',
      '"contaUid" é obrigatório.'
    );
  }
  const contaUid = contaUidBruto;

  // UMA conta por chamada. `limit(2)` não é lote: o segundo doc nunca é
  // devolvido — ele existe só para responder "a identificação é única?".
  const snap = await db
    .collection(COLECAO_PESSOAS)
    .where('contaUid', '==', contaUid)
    .limit(2)
    .get();

  const haMaisDeUmRegistro = snap.size > 1;
  const primeiro = snap.docs[0];

  if (!primeiro) {
    await registrarAcesso(db, {
      contaUid,
      uid: caller.uid,
      papel,
      resultado: 'concedido_sem_registro',
    });
    // Não é negativa: a consulta foi autorizada e aconteceu. O que não existe
    // é o dado — e dizer isso é a resposta honesta, não um erro.
    return {
      contaUid,
      documento: null,
      motivoAusencia: 'sem_registro_de_identificacao',
      haMaisDeUmRegistro,
      avisoAuditoria: AVISO_AUDITORIA_DOCUMENTO,
    };
  }

  const cpfBruto = primeiro.get('cpf') as unknown;
  if (typeof cpfBruto !== 'string' || cpfBruto.length === 0) {
    await registrarAcesso(db, {
      contaUid,
      uid: caller.uid,
      papel,
      resultado: 'concedido_sem_registro',
    });
    return {
      contaUid,
      documento: null,
      motivoAusencia: 'registro_sem_documento',
      haMaisDeUmRegistro,
      avisoAuditoria: AVISO_AUDITORIA_DOCUMENTO,
    };
  }

  await registrarAcesso(db, {
    contaUid,
    uid: caller.uid,
    papel,
    resultado: 'concedido',
  });

  return {
    contaUid,
    documento: { tipo: 'cpf', numero: cpfBruto },
    motivoAusencia: null,
    haMaisDeUmRegistro,
    avisoAuditoria: AVISO_AUDITORIA_DOCUMENTO,
  };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

export const consultarDocumentoDaConta = https.onCall(
  async (data: unknown, context) => {
    if (!context.auth) {
      // Sem uid não há a quem atribuir a tentativa — nega sem registro
      // (a auditoria é de ACESSO IDENTIFICADO).
      throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
    }
    return consultarDocumentoDaContaCore(admin.firestore(), data, {
      uid: context.auth.uid,
      claims: context.auth.token as unknown as AuthClaims,
    });
  }
);
