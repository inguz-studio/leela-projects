// =============================================================================
// functions/src/checkout/reservaLote.ts
//
// A RESERVA DA VAGA (LEELA-S323 · RN-543 · RN-544 · trace
// leela-redesign-v2-20260810, lane ESTOURO-BUILD).
//
// A decisão do dono, sem retoque (ESTOURO-1, 09/08): *"se um pedido está com
// pagamento pendente, a vaga não está disponível para compra."* Ratificada em
// 10/08: *"não podemos ter excedentes de ingressos jamais."*
//
// O QUE ESTAVA ERRADO, MEDIDO: uma venda só consumia vaga quando o webhook
// CONFIRMAVA (`STATUS_QUE_CONTAM_VENDA = ['confirmado', 'estornado']`). Duas
// cobranças PIX em voo pela mesma última vaga passavam as duas, as duas
// pagavam, e `vendidos` estourava o limite sem teto — o ratchet
// `vendidos = max(atual, tally)` não conhece `quantidadeLimite`.
//
// O MECANISMO: um contador, três portas de saída.
//   · NASCE na transação que cria a cobrança. O gate lê o lote e recusa se
//     `vendidos + reservas + linhas > quantidadeLimite`; passando, incrementa
//     no MESMO commit que cria pedido, inscritos e pagamento. Nenhuma janela
//     entre checar e gravar — e é o próprio doc do lote, lido e escrito na
//     transação, que dá às duas requisições concorrentes o documento em comum
//     que o Firestore serializa. Sem ele, dois compradores distintos não
//     tocavam nenhum doc compartilhado (a trava PIX é por comprador+carrinho)
//     e a corrida ficava aberta.
//   · MORRE junto do estado terminal do pagamento, nunca num passo separado:
//     confirmação (converte), `'failed'` do webhook, flip da varredura e flip
//     do onCall. As quatro passam pela guarda de transição única que já
//     existe, então a liberação é exactly-once por construção.
//
// POR QUE READ-MODIFY-WRITE E NÃO `FieldValue.increment`: a liberação tem de
// ser SEGURA em dois casos que o increment cego não cobre. (1) Lote apagado
// no meio: `update` com increment num doc inexistente derruba a transação —
// e essa transação é a que CONFIRMA UMA COMPRA PAGA. Nenhum contador de vaga
// vale derrubar a confirmação de dinheiro que já entrou. (2) Contador
// semeado/corrigido à mão: o clamp em 0 impede que um decremento a mais
// deixe `reservas` negativo, que o parse do core recusaria na leitura
// seguinte — e um lote ilegível é um lote que não vende. O custo é
// contenção no doc do lote, que aqui não é custo: a serialização É o
// mecanismo.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { reservaDeCartaoExpirada } from '@leela/core';

type Db = admin.firestore.Firestore;
type Tx = admin.firestore.Transaction;
type DocRef = admin.firestore.DocumentReference;

/** Uma linha lida do pedido — só o que a reserva precisa enxergar. */
export interface LinhaComLote {
  loteId?: string | null;
}

/** O estado do lote lido DENTRO da transação, pronto para decidir e escrever. */
export interface LeituraLoteReserva {
  loteId: string;
  ref: DocRef;
  /** Doc existe? Lote apagado não derruba a transação — ver cabeçalho. */
  existe: boolean;
  vendidos: number;
  reservas: number;
  quantidadeLimite: number;
  /** Quantas linhas DESTE pedido apontam para este lote (≥ 1). */
  linhas: number;
}

/**
 * Agrupa as linhas do pedido por lote (RN-543 — "multi-inscrito no mesmo
 * lote conta cada linha").
 *
 * Linha SEM lote é ignorada de propósito: é a modalidade legada, que vende
 * pelo `percursos[].preco` e nunca teve teto de vaga. A reserva não inventa
 * capacidade onde o produto nunca a configurou — inventar um limite aqui
 * fecharia venda que hoje funciona. @pure
 */
export function linhasPorLote(
  itens: readonly LinhaComLote[]
): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const item of itens) {
    const loteId = item.loteId;
    if (typeof loteId !== 'string' || loteId.length === 0) continue;
    mapa.set(loteId, (mapa.get(loteId) ?? 0) + 1);
  }
  return mapa;
}

/** Inteiro ≥ 0 do doc, com leitura Postel (ausente = 0). */
function contadorDoDoc(valor: unknown): number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0
    ? valor
    : 0;
}

/**
 * FASE DE LEITURA da transação: lê os lotes das linhas do pedido.
 *
 * Ordenado por `loteId` de propósito: duas transações que tocam o MESMO par
 * de lotes leem na mesma ordem, e a ordem estável é o que evita que elas se
 * bloqueiem em sentidos opostos (a lição clássica de deadlock, aqui em
 * versão otimista — sem ela, as duas abortariam e retentariam à toa).
 */
export async function lerLotesDoPedidoNaTx(
  tx: Tx,
  eventoRef: DocRef,
  linhas: Map<string, number>
): Promise<LeituraLoteReserva[]> {
  const ids = [...linhas.keys()].sort();
  const leituras: LeituraLoteReserva[] = [];
  for (const loteId of ids) {
    const ref = eventoRef.collection('lotes').doc(loteId);
    const snap = await tx.get(ref);
    leituras.push({
      loteId,
      ref,
      existe: snap.exists,
      vendidos: contadorDoDoc(snap.get('vendidos')),
      reservas: contadorDoDoc(snap.get('reservas')),
      // Limite AUSENTE/torto num doc que existe é dado corrompido — o gate
      // trata como capacidade ZERO (fail-closed): melhor recusar a venda do
      // que vender contra um teto que ninguém sabe qual é.
      quantidadeLimite:
        typeof snap.get('quantidadeLimite') === 'number' &&
        Number.isInteger(snap.get('quantidadeLimite'))
          ? (snap.get('quantidadeLimite') as number)
          : 0,
      linhas: linhas.get(loteId) ?? 0,
    });
  }
  return leituras;
}

/** Atalho para quem só tem o `db` e o `eventoId` à mão. */
export async function lerLotesDasLinhasNaTx(
  db: Db,
  tx: Tx,
  eventoId: string,
  itens: readonly LinhaComLote[]
): Promise<LeituraLoteReserva[]> {
  const linhas = linhasPorLote(itens);
  if (linhas.size === 0) return [];
  return lerLotesDoPedidoNaTx(tx, db.collection('eventos').doc(eventoId), linhas);
}

/**
 * FASE DE ESCRITA: a vaga sai do estoque (RN-543). Chamada só depois do gate
 * de capacidade ter passado, na MESMA transação que cria os docs do pedido.
 */
export function reservarNaTx(tx: Tx, leituras: readonly LeituraLoteReserva[]): void {
  for (const l of leituras) {
    if (!l.existe) continue;
    tx.update(l.ref, {
      reservas: l.reservas + l.linhas,
      atualizadoEm: FieldValue.serverTimestamp(),
    });
  }
}

/**
 * FASE DE ESCRITA: a vaga volta (RN-544). Chamada na MESMA transação que dá
 * ao pagamento o estado terminal — ou que o confirma, e aí a reserva não
 * "volta": ela CONVERTE em venda (o decremento aqui, e o `vendidos` subindo
 * pelo recompute que o gatilho de inscrito já dispara; a soma
 * `vendidos + reservas` nunca conta a mesma pessoa duas vezes).
 *
 * Lote apagado no meio: nada a fazer, e a transação do dinheiro segue. O
 * contador some junto com o doc, e a recontagem da varredura (S323-T4) é a
 * rede se ele voltar.
 */
export function liberarNaTx(
  tx: Tx,
  leituras: readonly LeituraLoteReserva[],
  contexto: { pedidoId: string; porta: string }
): void {
  for (const l of leituras) {
    if (!l.existe) {
      logger.warn('reserva_lote_inexistente_na_liberacao', {
        pedidoId: contexto.pedidoId,
        loteId: l.loteId,
        porta: contexto.porta,
      }); // sem PII
      continue;
    }
    const novo = Math.max(0, l.reservas - l.linhas);
    if (novo === l.reservas) continue; // nada a escrever (já em 0)
    tx.update(l.ref, {
      reservas: novo,
      atualizadoEm: FieldValue.serverTimestamp(),
    });
  }
}

// ---------------------------------------------------------------------------
// Recontagem absoluta (S323-T4 · RN-544 · RN-546)
// ---------------------------------------------------------------------------

/**
 * Teto de pedidos pendentes que a recontagem aceita examinar numa rodada.
 *
 * Por que ela PULA em vez de truncar quando estoura: a recontagem escreve
 * valores ABSOLUTOS. Uma recontagem parcial escreveria "este lote tem 3
 * reservas" tendo enxergado só metade dos pedidos pendentes — e o número
 * errado num contador de vaga ou trava venda que existe, ou solta vaga que
 * não existe (o excedente que o dono proibiu). Contagem incompleta não é
 * meia-verdade, é mentira; melhor não escrever e deixar o log pedir um teto
 * maior.
 */
export const RECONTAGEM_PENDENTES_MAX = 500;

/** Teto de lotes com reserva viva examinados por rodada — mesma disciplina. */
export const RECONTAGEM_LOTES_MAX = 500;

export interface RecontagemResultado {
  /** Rodou? `false` quando algum teto estourou (ver `motivoPulo`). */
  executada: boolean;
  motivoPulo?: 'pendentes_acima_do_teto' | 'lotes_acima_do_teto';
  /** Pedidos pendentes examinados. */
  pendentes: number;
  /** Pedidos de cartão fora da conta por terem passado do teto (RN-546). */
  cartoesAlemDoTeto: number;
  /** Lotes cujo contador divergia e foi CORRIGIDO nesta rodada. */
  corrigidos: number;
}

/** Chave canônica de um lote na recontagem. */
function chaveLote(eventoId: string, loteId: string): string {
  return `${eventoId}/${loteId}`;
}

/**
 * RECONTAGEM ABSOLUTA de `reservas` (RN-544 — a rede contra drift).
 *
 * A liberação exactly-once das quatro portas é a máquina principal; esta é a
 * rede embaixo dela, para o que a máquina não cobre: crash entre releitura e
 * commit fora das transações, contador semeado à mão, correção manual, lote
 * restaurado de backup. Ela SUBSTITUI o valor, não soma — e é por isso que
 * ela cura drift em vez de acumulá-lo.
 *
 * `reservas` NÃO É RATCHET, e a diferença é o ponto: `vendidos` só sobe
 * (`max(atual, tally)` no `virarLote`), porque venda não desfaz. Reserva
 * expira — ela tem de descer. Aplicar o ratchet aqui deixaria a primeira
 * reserva vencida travando a vaga para sempre, que é exatamente o defeito
 * que esta frente veio matar.
 *
 * A VERDADE, definida: `reservas(L)` = linhas de pedidos `'pendente'` que
 * apontam para L — MENOS as linhas de pedidos de CARTÃO que passaram do teto
 * de 15 minutos (RN-546, decisão do dono em 11/08). É aqui, e em nenhum
 * outro lugar, que o teto do cartão vira efeito: nada é cancelado no
 * gateway, o pedido continua vivo, e só a VAGA volta.
 */
export async function recontarReservasCore(
  db: Db,
  agora: Date,
  tetos: { pendentes?: number; lotes?: number } = {}
): Promise<RecontagemResultado> {
  const agoraMillis = agora.getTime();
  const tetoPendentes = tetos.pendentes ?? RECONTAGEM_PENDENTES_MAX;
  const tetoLotes = tetos.lotes ?? RECONTAGEM_LOTES_MAX;
  const resultado: RecontagemResultado = {
    executada: false,
    pendentes: 0,
    cartoesAlemDoTeto: 0,
    corrigidos: 0,
  };

  // 1 · A VERDADE: todo pedido pendente. Sem filtro de tempo de propósito —
  // um PIX pendente ALÉM dos 30 minutos continua segurando a vaga dele,
  // porque o fail-safe só o deixa vivo quando o gateway recusou o
  // cancelamento, e nesse caso a cobrança ainda é pagável. Filtrar por
  // janela soltaria a vaga de uma cobrança viva.
  const pendentesSnap = await db
    .collection('pedidos')
    .where('status', '==', 'pendente')
    .limit(tetoPendentes + 1)
    .get();
  if (pendentesSnap.size > tetoPendentes) {
    resultado.motivoPulo = 'pendentes_acima_do_teto';
    resultado.pendentes = pendentesSnap.size;
    return resultado;
  }
  resultado.pendentes = pendentesSnap.size;

  const verdade = new Map<string, number>();
  for (const doc of pendentesSnap.docs) {
    const eventoId = doc.get('eventoId') as unknown;
    if (typeof eventoId !== 'string' || eventoId.length === 0) continue;
    const criadoEm = doc.get('criadoEm') as { toMillis?: () => number } | undefined;
    const expirouPorTeto = reservaDeCartaoExpirada(
      {
        formaPagamento: doc.get('formaPagamento'),
        status: doc.get('status'),
        criadoEmMillis:
          typeof criadoEm?.toMillis === 'function' ? criadoEm.toMillis() : undefined,
      },
      agoraMillis
    );
    if (expirouPorTeto) {
      resultado.cartoesAlemDoTeto += 1;
      continue; // RN-546: passou do teto ⇒ não segura mais vaga.
    }
    const itens = (doc.get('itens') as { loteId?: string | null }[] | undefined) ?? [];
    for (const [loteId, linhas] of linhasPorLote(itens)) {
      const chave = chaveLote(eventoId, loteId);
      verdade.set(chave, (verdade.get(chave) ?? 0) + linhas);
    }
  }

  // 2 · O QUE O BANCO AFIRMA: todo lote que diz ter reserva viva. Sem esta
  // query, um contador preso em 1 num evento parado nunca seria visitado —
  // e uma vaga presa para sempre é o defeito exato que esta lane existe
  // para matar. Exige o índice de COLLECTION_GROUP sobre `lotes.reservas`
  // (fieldOverrides), no molde do que `lotes.fimEm` já tem.
  const afirmadosSnap = await db
    .collectionGroup('lotes')
    .where('reservas', '>', 0)
    .limit(tetoLotes + 1)
    .get();
  if (afirmadosSnap.size > tetoLotes) {
    resultado.motivoPulo = 'lotes_acima_do_teto';
    return resultado;
  }

  // 3 · A união dos dois conjuntos — quem afirma reserva e quem deveria ter.
  const alvos = new Map<string, { ref: DocRef; afirmado: number }>();
  for (const doc of afirmadosSnap.docs) {
    const eventoId = doc.ref.parent.parent?.id;
    if (eventoId === undefined) continue;
    alvos.set(chaveLote(eventoId, doc.id), {
      ref: doc.ref,
      afirmado: contadorDoDoc(doc.get('reservas')),
    });
  }
  for (const chave of verdade.keys()) {
    if (alvos.has(chave)) continue;
    const [eventoId, loteId] = chave.split('/');
    if (eventoId === undefined || loteId === undefined) continue;
    alvos.set(chave, {
      // Lote que deveria ter reserva e afirma 0 — o caso do decremento a
      // mais. Ele não aparece na query acima justamente porque está errado.
      ref: db.collection('eventos').doc(eventoId).collection('lotes').doc(loteId),
      afirmado: 0,
    });
  }

  // 4 · Correção, uma transação por lote: releitura in-tx para não
  // sobrescrever uma reserva que NASCEU entre a contagem e a escrita (o
  // checkout roda o tempo todo). Escrever só quando ainda diverge do mesmo
  // valor lido é o que impede a recontagem de apagar venda em voo.
  for (const [chave, alvo] of alvos) {
    const esperado = verdade.get(chave) ?? 0;
    if (esperado === alvo.afirmado) continue;
    try {
      const corrigiu = await db.runTransaction(async (tx) => {
        const fresco = await tx.get(alvo.ref);
        if (!fresco.exists) return false;
        const atual = contadorDoDoc(fresco.get('reservas'));
        // Mudou desde a contagem ⇒ a foto envelheceu. Não escreve; a rodada
        // seguinte reconta com dado fresco.
        if (atual !== alvo.afirmado) return false;
        if (atual === esperado) return false;
        tx.update(alvo.ref, {
          reservas: esperado,
          atualizadoEm: FieldValue.serverTimestamp(),
        });
        return true;
      });
      if (corrigiu) {
        resultado.corrigidos += 1;
        logger.warn('reserva_recontagem_corrigiu', {
          lote: chave,
          de: alvo.afirmado,
          para: esperado,
        }); // sem PII
      }
    } catch (err) {
      logger.error('reserva_recontagem_falhou', {
        lote: chave,
        erro: err instanceof Error ? err.message.slice(0, 200) : String(err),
      }); // sem PII
    }
  }

  resultado.executada = true;
  return resultado;
}
