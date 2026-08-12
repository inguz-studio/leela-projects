// =============================================================================
// functions/src/platform/obterFichaDoCliente.ts
//
// Callable `obterFichaDoCliente` (ADMIN-VISAO onda 3 · S1612-T6 · RN-539 na
// forma que o V-2 lhe deu).
//
// O DONO DECIDIU, na íntegra (ADMINVISAO-2, leva 6 de 11/08): "tem que guardar
// cpf, e-mail, telefone, cidade, endereço, restrições, pedidos, tudo. É a ficha
// geral de clientes, membros, participantes dos clubs, e a visao geral no
// individuo, para analisarmos como organizadores."
//
// A frase tem duas metades e as duas mandam. "Tudo" diz QUAIS campos; "a visão
// geral NO INDIVÍDUO" diz ONDE eles aparecem. Por isso esta Function serve UM
// indivíduo por chamada e não engorda a LISTA: `listarClientesDoTenant` (onda
// 1) continua devolvendo só comportamento, e o contato só sai quando alguém
// abre uma pessoa. Uma lista com CPF e telefone de todo mundo seria a agenda de
// participantes de todos os produtores num lugar só — que é exatamente o risco
// que o próprio vetável descreveu, e que a RN-540 recusa quando proíbe saída em
// massa. A decisão do dono autorizou o CONTEÚDO da ficha, não a extração da
// base.
//
// DE ONDE VEM CADA CAMPO, e por que não de `pessoas`. O E16 nomeou as fontes:
// `pedidos.responsavel` (e-mail e telefone) e `inscritos.dadosPessoais` (CPF,
// telefone, nascimento, cidade, UF, restrições médicas, contato de
// emergência); o endereço completo vem de `pedidos.endereco`
// (`EnderecoPedido`), que o checkout coleta e o dono acabou de ratificar como
// obrigatório (CKENDERECO-1 · RN-561). Isso cobre a lista dele inteira.
// `pessoas/{id}` TAMBÉM guardaria CPF e endereço, e é lida por Admin SDK sem
// esforço — e mesmo assim esta Function NÃO a lê. Ela é a coleção que o
// `firestore.rules:2688` fecha para todo mundo, inclusive para o
// platform_admin, e é a escolha mais conservadora do arquivo inteiro. Servir a
// mesma informação por uma fonte já autorizada, em vez de abrir a fonte
// fechada, mantém a fronteira de pé sem custar nada ao dono.
//
// A RN-172 NÃO MUDA. O documento do CRM continua minimizado na origem; o que
// esta Function faz é MONTAR a visão a partir de quem já guarda o dado, nunca
// engordar `crmClientes`.
//
// A RULE NÃO ABRE. `tenants/{tid}/crmClientes` continua omitindo
// `isPlatformAdmin()` de propósito (`firestore.rules:381`), o canário da
// S1612-T7 continua provando isso, e nenhuma leitura por client SDK é
// acrescentada.
//
// Autorização pelo predicado `isPlatformAdmin` do core (as DUAS pernas —
// RN-401), nunca a comparação `claims.role` na mão: a dívida da claim está
// registrada em `03-spec.md` Parte 4 e esta Function nasce do lado certo dela,
// como a vizinha da onda 1.
//
// Auditoria (RN-540 / molde `getBankDetailsForPayout`): TODO desfecho vira
// registro em `auditoriaAcessos` — concedido E negado —, gravado fora de
// transação e ANTES do throw, com o cliente consultado no registro. Uma ficha
// aberta é uma consulta de PII identificada, e o rastro diz sobre QUEM foi.
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  isPlatformAdmin,
  parseCrmCliente,
  SUBCOLECAO_CRM_CLIENTES,
  type AuthClaims,
  type EnderecoPedido,
} from '@leela/core';
import { registrarAcessoAuditado } from '../shared/auditoriaAcessos';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/**
 * Teto de inscrições lidas para montar a ficha. Não é paginação: é o limite do
 * fan-out de leituras que uma ficha custa (uma leitura de inscrito e uma de
 * pedido por inscrição). O cliente mais antigo de um produtor grande tem
 * dezenas de inscrições, e a ficha não precisa das dezenas para responder "quem
 * é esta pessoa e o que ela comprou".
 *
 * Quando o ledger tem mais que isto, o resultado DIZ que truncou
 * (`pedidosTruncados`) — a tela não pode apresentar uma lista cortada como se
 * fosse o histórico inteiro. Mesma régua do contador honesto da onda 4.
 */
export const FICHA_CLIENTE_MAX_INSCRICOES = 24;

/** Contato de emergência, como o inscrito o guarda. */
export interface FichaContatoEmergencia {
  nome: string;
  telefone: string;
}

/** Um pedido do cliente, na visão do administrador. */
export interface FichaPedidoDoCliente {
  pedidoId: string;
  eventoId: string;
  eventoNome: string;
  /** `confirmado` ou `estornado` — o que o ledger do CRM já classificou. */
  statusNoCrm: string;
  /** Status do próprio pedido; null quando o doc não existe mais. */
  statusDoPedido: string | null;
  /** Valor da linha do cliente, como o ledger do CRM carimbou (R$). */
  valorPago: number;
  /** Quando a inscrição foi atualizada pela última vez (ms epoch). */
  atualizadoEmMs: number;
}

/**
 * A ficha completa de um indivíduo. Todo campo de contato é `null` quando a
 * fonte não guarda — nunca string vazia disfarçada de dado, nunca placeholder.
 */
export interface FichaDoClienteView {
  clienteKey: string;

  // Identidade
  nome: string;
  /** CPF em claro (o dono autorizou — ADMINVISAO-2). null = não coletado. */
  cpf: string | null;
  /** date-only `yyyy-mm-dd`. null = não coletado. */
  nascimento: string | null;
  genero: string | null;

  // Contato
  email: string | null;
  telefone: string | null;

  // Onde
  cidade: string | null;
  uf: string | null;
  endereco: EnderecoPedido | null;

  // Saúde
  restricoesMedicas: string | null;
  contatoEmergencia: FichaContatoEmergencia | null;

  // Comportamento (o que a lista já mostra, repetido aqui para a ficha ser
  // legível sozinha — vem do MESMO doc CRM, sem segunda contagem)
  qtdEventos: number;
  qtdInscricoes: number;
  valorGasto: number;
  ltv: number;

  // Pedidos
  pedidos: FichaPedidoDoCliente[];
  /** true = o ledger tem mais inscrições do que a ficha leu (ver o teto). */
  pedidosTruncados: boolean;
}

export interface ObterFichaDoClienteInput {
  tenantId: string;
  clienteKey: string;
}

type ResultadoAcesso = 'concedido' | 'negado_papel';

interface Caller {
  uid: string;
  claims: AuthClaims;
}

// ---------------------------------------------------------------------------
// Auditoria
// ---------------------------------------------------------------------------

async function registrarAcesso(
  db: Db,
  registro: {
    tenantId: string;
    clienteKey: string;
    uid: string;
    papel: string;
    resultado: ResultadoAcesso;
  }
): Promise<void> {
  await registrarAcessoAuditado(
    db,
    'acesso_ficha_cliente',
    registro,
    'acesso_ficha_cliente'
  );
}

// ---------------------------------------------------------------------------
// Normalização de campo de PII
// ---------------------------------------------------------------------------

/**
 * O bloco `[reg]` do inscrito usa `''` para "não coletado" (leitura Postel do
 * `parseDadosPessoais`). Na ficha isso vira `null`, porque a tela precisa
 * distinguir "não temos" de "temos e está vazio" — e string vazia num campo de
 * contato renderiza como um espaço em branco que parece dado.
 */
function ouNulo(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

/** O primeiro valor não-nulo da sequência (a inscrição mais recente vence). */
function primeiroPresente(valores: (string | null)[]): string | null {
  for (const v of valores) if (v !== null) return v;
  return null;
}

// ---------------------------------------------------------------------------
// Núcleo
// ---------------------------------------------------------------------------

export async function obterFichaDoClienteCore(
  db: Db,
  rawInput: unknown,
  caller: Caller
): Promise<FichaDoClienteView> {
  const input = rawInput as Partial<ObterFichaDoClienteInput> | null;
  const tenantId = input?.tenantId;
  const clienteKey = input?.clienteKey;

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"tenantId" é obrigatório.');
  }

  const papel =
    typeof caller.claims.role === 'string' ? caller.claims.role : 'desconhecido';

  // Autorização primeiro — quem não é administrador não sonda nem a borda do
  // input, e a negativa é registrada (RN-539/RN-540).
  if (!isPlatformAdmin(caller.claims)) {
    await registrarAcesso(db, {
      tenantId,
      clienteKey: typeof clienteKey === 'string' ? clienteKey : '(ausente)',
      uid: caller.uid,
      papel,
      resultado: 'negado_papel',
    });
    throw new https.HttpsError(
      'permission-denied',
      'Apenas platform_admin abre a ficha de um cliente — acesso registrado (RN-539).'
    );
  }

  // `clienteKey` é docId simples (hash): "/" viraria path de 5 segmentos em
  // `col.doc()` e o Admin SDK lançaria Error cru, que chega ao chamador como
  // `internal` opaco. Mesma borda que a vizinha da onda 1 já paga.
  if (
    typeof clienteKey !== 'string' ||
    clienteKey.length === 0 ||
    clienteKey.includes('/')
  ) {
    throw new https.HttpsError(
      'invalid-argument',
      '"clienteKey" deve ser um docId simples, sem "/".'
    );
  }

  const clienteSnap = await db
    .doc(`tenants/${tenantId}/${SUBCOLECAO_CRM_CLIENTES}/${clienteKey}`)
    .get();

  if (!clienteSnap.exists) {
    throw new https.HttpsError(
      'not-found',
      'Esse cliente não existe neste tenant.'
    );
  }

  const cliente = parseCrmCliente(clienteSnap.id, clienteSnap.data() ?? {});

  // O ledger é a fonte de QUAIS inscrições existem. A chave é
  // `{eventoId}_{inscritoId}` e o `eventoId` pode conter "_", então o
  // inscritoId sai por remoção do prefixo do próprio campo, nunca por split.
  const entradas = Object.entries(cliente.inscricoes)
    .map(([chave, entrada]) => ({ chave, entrada }))
    .sort((a, b) => {
      if (b.entrada.atualizadoEmMs !== a.entrada.atualizadoEmMs) {
        return b.entrada.atualizadoEmMs - a.entrada.atualizadoEmMs;
      }
      return a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0;
    });

  const pedidosTruncados = entradas.length > FICHA_CLIENTE_MAX_INSCRICOES;
  const janela = entradas.slice(0, FICHA_CLIENTE_MAX_INSCRICOES);

  const pedidos: FichaPedidoDoCliente[] = [];
  const cpfs: (string | null)[] = [];
  const telefonesDoInscrito: (string | null)[] = [];
  const nascimentos: (string | null)[] = [];
  const generos: (string | null)[] = [];
  const cidades: (string | null)[] = [];
  const ufs: (string | null)[] = [];
  const restricoes: (string | null)[] = [];
  const emails: (string | null)[] = [];
  const telefonesDoResponsavel: (string | null)[] = [];
  let contatoEmergencia: FichaContatoEmergencia | null = null;
  let endereco: EnderecoPedido | null = null;

  for (const { chave, entrada } of janela) {
    const prefixo = `${entrada.eventoId}_`;
    const inscritoId = chave.startsWith(prefixo)
      ? chave.slice(prefixo.length)
      : '';

    let statusDoPedido: string | null = null;
    let pedidoId = '';

    if (inscritoId !== '') {
      try {
        const inscritoSnap = await db
          .doc(`eventos/${entrada.eventoId}/inscritos/${inscritoId}`)
          .get();

        if (inscritoSnap.exists) {
          const inscrito = inscritoSnap.data() ?? {};
          const reg = (inscrito['dadosPessoais'] ?? {}) as Record<string, unknown>;

          cpfs.push(ouNulo(reg['cpf']));
          telefonesDoInscrito.push(ouNulo(reg['telefone']));
          nascimentos.push(ouNulo(reg['nascimento']));
          generos.push(ouNulo(reg['genero']));
          cidades.push(ouNulo(reg['cidade']));
          ufs.push(ouNulo(reg['uf']));
          restricoes.push(ouNulo(reg['restricoesMedicas']));

          if (contatoEmergencia === null) {
            const ce = reg['contatoEmergencia'] as Record<string, unknown> | undefined;
            const nome = ouNulo(ce?.['nome']);
            const telefone = ouNulo(ce?.['telefone']);
            if (nome !== null || telefone !== null) {
              contatoEmergencia = { nome: nome ?? '', telefone: telefone ?? '' };
            }
          }

          const pedidoRef = inscrito['pedidoRef'];
          if (typeof pedidoRef === 'string' && pedidoRef.length > 0) {
            pedidoId = pedidoRef;
            const pedidoSnap = await db.doc(`pedidos/${pedidoRef}`).get();
            if (pedidoSnap.exists) {
              const pedido = pedidoSnap.data() ?? {};
              statusDoPedido = ouNulo(pedido['status']);

              const resp = (pedido['responsavel'] ?? {}) as Record<string, unknown>;
              emails.push(ouNulo(resp['email']));
              telefonesDoResponsavel.push(ouNulo(resp['telefone']));

              if (endereco === null && pedido['endereco'] !== undefined) {
                endereco = pedido['endereco'] as EnderecoPedido;
              }
            }
          }
        }
      } catch (err) {
        // Uma inscrição ilegível não pode derrubar a ficha inteira de um painel
        // administrativo. Loga e segue; nenhum dado errado é servido, e o que
        // faltar aparece como ausente na tela em vez de como zero.
        logger.error('ficha_cliente_inscricao_ilegivel', {
          tenantId,
          clienteKey,
          chave,
          erro: err instanceof Error ? err.message : String(err),
        });
      }
    }

    pedidos.push({
      pedidoId,
      eventoId: entrada.eventoId,
      eventoNome: entrada.eventoNome,
      statusNoCrm: entrada.status,
      statusDoPedido,
      valorPago: entrada.valorPago,
      atualizadoEmMs: entrada.atualizadoEmMs,
    });
  }

  await registrarAcesso(db, {
    tenantId,
    clienteKey,
    uid: caller.uid,
    papel,
    resultado: 'concedido',
  });

  return {
    clienteKey,
    nome: cliente.nome,
    cpf: primeiroPresente(cpfs),
    nascimento: cliente.nascimento ?? primeiroPresente(nascimentos),
    genero: cliente.genero ?? primeiroPresente(generos),
    // O telefone do responsável do pedido é o canal de contato da compra; o do
    // inscrito é o da pessoa em prova. O primeiro é o que serve para falar com
    // ela, então vem na frente — e o do inscrito cobre quem comprou sozinho.
    email: primeiroPresente(emails),
    telefone: primeiroPresente([
      ...telefonesDoResponsavel,
      ...telefonesDoInscrito,
    ]),
    cidade: primeiroPresente(cidades) ?? ouNulo(endereco?.cidade),
    uf: primeiroPresente(ufs) ?? ouNulo(endereco?.uf),
    endereco,
    restricoesMedicas: primeiroPresente(restricoes),
    contatoEmergencia,
    qtdEventos: cliente.qtdEventos,
    qtdInscricoes: cliente.qtdInscricoes,
    valorGasto: cliente.valorGasto,
    ltv: cliente.ltv,
    pedidos,
    pedidosTruncados,
  };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

export const obterFichaDoCliente = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    // Sem uid não há a quem atribuir a tentativa — nega sem registro (a
    // auditoria é de ACESSO IDENTIFICADO, mesma doutrina das vizinhas).
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return obterFichaDoClienteCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
