// =============================================================================
// functions/src/eventos/virarLote.ts
//
// Function de VIRADA DE LOTE (LEELA-S300-T2 · E04 · RN-300 · ADR-012).
//
// O lote pertence à MODALIDADE (ADR-012): a virada opera na granularidade
// (modalidade, lote) — "esgotou o L1 da 5k, a 5k vira sozinha pro L2 enquanto
// a 10k segue no L1". Esta Function é a ÚNICA escritora dos campos-∑ do lote
// (`vendidos`) e dos carimbos de virada (`encerradoEm`/`encerradoMotivo`) —
// as Rules negam tudo isso ao cliente (CAMPOS_FUNCTION_LOTE).
//
// FONTE DA CONTAGEM (Kleppmann — derive do fato, não do espelho): uma "venda"
// é um INSCRITO que JÁ FOI CONFIRMADO pelo webhook de pagamento (a única
// porta de confirmação — E12). O lote da venda vive na LINHA do pedido
// (`pedido.itens[].loteId`, ADR-011/ADR-012) — o inscrito NÃO carrega loteId.
// Logo: vendidos(L) = |{ inscrito ∈ {confirmado, estornado} :
//                         linha(inscrito).loteId == L }|.
//
// DECISÕES REGISTRADAS (dinheiro — postura conservadora):
//   1. ESTORNO NÃO DEVOLVE VAGA: inscrito `estornado` CONTA como venda do
//      lote. Precedente explícito do checkout: "estornar 1 inscrito não
//      desfaz o uso do cupom (decisão explícita, documentada)". Devolver a
//      vaga reabriria o degrau de preço (L1 esgotado voltaria a ativo) e o
//      preço vigente REGREDIRIA pós-estorno — dinheiro entrando por porta
//      que a RN-300 fechou (mesma classe do re-review S300 #1).
//   2. `vendidos` é MONOTÔNICO (ratchet): novo = max(atual, recontado). A
//      virada RN-300 é one-way ("reexecução não pula lote nem duplica
//      encerramento") — o contador que a alimenta não regride. Isso também
//      preserva contadores semeados (seed canônico) que não têm pedidos
//      materializados por trás. Correção para BAIXO = intervenção manual
//      de platform_admin, nunca automática.
//   3. CARIMBO ≠ FONTE DE VERDADE: o estado ativo/encerrado que o checkout
//      consome segue DERIVADO no kernel (`loteEncerrado`/`loteAtivo`/
//      `precoVigente` — S300-T1, consumidos aqui, NUNCA reimplementados).
//      `encerradoEm`/`encerradoMotivo` são trilha de auditoria/UI,
//      monotônicos: uma vez carimbados, nunca reescritos nem apagados.
//
// IDEMPOTÊNCIA (prova): recontagem absoluta (não incremental) + max() +
// carimbo só-quando-ausente ⇒ reexecutar N vezes produz o MESMO estado.
// Concorrência: tudo numa transação Firestore (isolamento serializável) —
// duas viradas simultâneas do mesmo evento serializam; a segunda recomputa
// sobre o estado commitado e no-opa.
//
// GATILHOS:
//   - `onInscritoWriteVirada` (quantidade): mudança de STATUS de inscrito →
//     recomputa o evento (a 100ª confirmação esgota o lote no mesmo ciclo);
//   - `virarLoteCron` (data): a cada 5 min, varre lotes com `fimEm` no
//     passado ainda SEM carimbo (collection-group + índice fieldOverride) e
//     recomputa só os eventos afetados. Modalidades/eventos vizinhos ficam
//     intocados (zero write quando nada mudou).
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import { pubsub } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { loteAtivo, motivoEncerramento, type MotivoEncerramentoLote } from '@leela/core';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Statuses de inscrito que CONTAM como venda do lote (decisão #1 acima). */
export const STATUS_QUE_CONTAM_VENDA = ['confirmado', 'estornado'] as const;

/** Uma virada materializada nesta execução (carimbo novo). */
export interface ViradaLote {
  loteId: string;
  modalidade: string;
  ordem: number;
  motivo: MotivoEncerramentoLote;
}

/** Resultado de uma recomputação de virada (consumido por testes/log). */
export interface ResultadoVirarLote {
  eventoId: string;
  /** Lotes cujo ∑ `vendidos` subiu nesta execução. */
  contadoresAtualizados: number;
  /** Carimbos de encerramento NOVOS (reexecução ⇒ lista vazia). */
  viradas: ViradaLote[];
  /**
   * Lote ativo DERIVADO por modalidade após a recomputação (kernel
   * `loteAtivo` — RN-300 "o próximo vira ativo"). `null` = venda fechada.
   */
  ativoPorModalidade: Record<string, string | null>;
}

// ---------------------------------------------------------------------------
// Derivação pura da contagem (testável sem Emulator)
// ---------------------------------------------------------------------------

/** Linha de pedido relevante para a contagem (projeção de `pedido.itens[]`). */
export interface LinhaVenda {
  inscritoRef: string;
  loteId: string | null;
}

/**
 * Conta vendas por lote a partir das linhas dos pedidos e do conjunto de
 * inscritos que contam como venda (confirmado/estornado). Linha sem lote
 * (`loteId` null — venda a preço legado, pré-lotes) não conta para nenhum
 * lote. @pure
 */
export function tallyVendasPorLote(
  linhas: readonly LinhaVenda[],
  inscritosQueContam: ReadonlySet<string>
): Map<string, number> {
  const tally = new Map<string, number>();
  for (const linha of linhas) {
    if (linha.loteId === null) continue;
    if (!inscritosQueContam.has(linha.inscritoRef)) continue;
    tally.set(linha.loteId, (tally.get(linha.loteId) ?? 0) + 1);
  }
  return tally;
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; gatilhos são wrappers)
// ---------------------------------------------------------------------------

/** Shape mínimo de lote usado na recomputação (doc + valores novos). */
interface LoteEmMemoria {
  id: string;
  modalidade: string;
  ordem: number;
  inicioEm: Timestamp;
  fimEm: Timestamp;
  quantidadeLimite: number;
  preco: number;
  vendidos: number;
  jaCarimbado: boolean;
}

/**
 * Recomputa a virada de lote de UM evento (RN-300 · ADR-012). Idempotente e
 * monotônica — ver invariantes no cabeçalho. Retorna `null` quando o evento
 * não existe (gatilho órfão de evento deletado).
 */
export async function virarLote(
  db: Db,
  eventoId: string,
  agora: Date = new Date()
): Promise<ResultadoVirarLote | null> {
  const eventoRef = db.collection('eventos').doc(eventoId);

  const resultado = await db.runTransaction(async (tx) => {
    // ── FASE DE LEITURA (toda leitura antes de qualquer escrita) ──────────
    const eventoSnap = await tx.get(eventoRef);
    if (!eventoSnap.exists) return null;

    const lotesSnap = await tx.get(eventoRef.collection('lotes'));
    if (lotesSnap.empty) {
      // Evento sem lotes (legado/preço-base) — nada a virar.
      return {
        eventoId,
        contadoresAtualizados: 0,
        viradas: [],
        ativoPorModalidade: {},
      } satisfies ResultadoVirarLote;
    }

    // Inscritos que contam como venda (decisão #1): confirmado + estornado.
    const inscritosSnap = await tx.get(
      eventoRef
        .collection('inscritos')
        .where('status', 'in', [...STATUS_QUE_CONTAM_VENDA])
    );
    const inscritosQueContam = new Set<string>(inscritosSnap.docs.map((d) => d.id));

    // Pedidos referenciados pelos inscritos (dedupe) — a linha do pedido é
    // quem sabe o lote da venda (ADR-011: itens[].loteId por inscritoRef).
    const pedidoIds = [
      ...new Set(
        inscritosSnap.docs
          .map((d) => d.get('pedidoRef'))
          .filter((p): p is string => typeof p === 'string' && p.length > 0)
      ),
    ];
    const pedidoSnaps =
      pedidoIds.length > 0
        ? await tx.getAll(...pedidoIds.map((id) => db.collection('pedidos').doc(id)))
        : [];

    const linhas: LinhaVenda[] = [];
    for (const pedidoSnap of pedidoSnaps) {
      if (!pedidoSnap.exists) continue; // vínculo órfão — não conta
      if (pedidoSnap.get('eventoId') !== eventoId) continue; // defesa ADR-011
      const itens = pedidoSnap.get('itens');
      if (!Array.isArray(itens)) continue;
      for (const item of itens as Record<string, unknown>[]) {
        const inscritoRef = item['inscritoRef'];
        if (typeof inscritoRef !== 'string' || inscritoRef.length === 0) continue;
        const loteId = typeof item['loteId'] === 'string' ? item['loteId'] : null;
        linhas.push({ inscritoRef, loteId });
      }
    }

    const tally = tallyVendasPorLote(linhas, inscritosQueContam);

    // ── RECOMPUTAÇÃO EM MEMÓRIA ───────────────────────────────────────────
    const lotes: LoteEmMemoria[] = [];
    const escritas: {
      ref: FirebaseFirestore.DocumentReference;
      payload: Record<string, unknown>;
    }[] = [];
    const viradas: ViradaLote[] = [];

    for (const doc of lotesSnap.docs) {
      const vendidosAtual =
        typeof doc.get('vendidos') === 'number' ? (doc.get('vendidos') as number) : 0;
      // Ratchet monotônico (decisão #2): nunca regride.
      const vendidosNovo = Math.max(vendidosAtual, tally.get(doc.id) ?? 0);
      const jaCarimbado = doc.get('encerradoEm') !== undefined;

      const lote: LoteEmMemoria = {
        id: doc.id,
        modalidade: (doc.get('modalidade') as string) ?? '',
        ordem: typeof doc.get('ordem') === 'number' ? (doc.get('ordem') as number) : 0,
        inicioEm: doc.get('inicioEm') as Timestamp,
        fimEm: doc.get('fimEm') as Timestamp,
        quantidadeLimite:
          typeof doc.get('quantidadeLimite') === 'number'
            ? (doc.get('quantidadeLimite') as number)
            : 1,
        preco: typeof doc.get('preco') === 'number' ? (doc.get('preco') as number) : 0,
        vendidos: vendidosNovo,
        jaCarimbado,
      };
      lotes.push(lote);

      const payload: Record<string, unknown> = {};
      if (vendidosNovo !== vendidosAtual) payload['vendidos'] = vendidosNovo;

      // Carimbo SÓ quando derivado-encerrado E ainda ausente (monotônico —
      // decisão #3). Kernel decide o "se" (motivoEncerramento, RN-300).
      const motivo = motivoEncerramento(
        { fimEm: lote.fimEm, vendidos: vendidosNovo, quantidadeLimite: lote.quantidadeLimite },
        agora
      );
      if (motivo !== null && !jaCarimbado) {
        payload['encerradoEm'] = Timestamp.fromDate(agora);
        payload['encerradoMotivo'] = motivo;
        viradas.push({
          loteId: lote.id,
          modalidade: lote.modalidade,
          ordem: lote.ordem,
          motivo,
        });
      }

      if (Object.keys(payload).length > 0) {
        payload['atualizadoEm'] = FieldValue.serverTimestamp();
        escritas.push({ ref: doc.ref, payload });
      }
    }

    // ── ESCRITAS (zero write quando nada mudou — no-op idempotente) ───────
    for (const escrita of escritas) {
      tx.update(escrita.ref, escrita.payload);
    }

    // "Próximo vira ativo" é DERIVAÇÃO do kernel (RN-300/ADR-012) sobre o
    // estado recomputado — exposto no resultado para log/testes/UI.
    const ativoPorModalidade: Record<string, string | null> = {};
    const modalidades = [...new Set(lotes.map((l) => l.modalidade))];
    for (const modalidade of modalidades) {
      const ativo = loteAtivo(
        lotes.filter((l) => l.modalidade === modalidade),
        agora
      );
      ativoPorModalidade[modalidade] = ativo === null ? null : ativo.id;
    }

    return {
      eventoId,
      contadoresAtualizados: escritas.filter((e) => 'vendidos' in e.payload).length,
      viradas,
      ativoPorModalidade,
    } satisfies ResultadoVirarLote;
  });

  if (resultado !== null && resultado.viradas.length > 0) {
    // Sem PII no log — só ids/motivos (LGPD).
    logger.info('lote_virado', {
      eventoId,
      viradas: resultado.viradas,
      ativoPorModalidade: resultado.ativoPorModalidade,
    });
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// Varredura do cron (data — RN-300): candidatos por collection-group
// ---------------------------------------------------------------------------

/**
 * Varre lotes com `fimEm` no passado AINDA sem carimbo e recomputa a virada
 * dos eventos afetados. A ausência de campo não é indexável no Firestore —
 * o filtro de "já carimbado" é client-side; a query corta por `fimEm`
 * (fieldOverride collection-group em firestore.indexes.json).
 */
export async function varrerViradasPorData(
  db: Db,
  agora: Date = new Date()
): Promise<{ candidatos: number; eventosProcessados: string[] }> {
  const snap = await db
    .collectionGroup('lotes')
    .where('fimEm', '<=', Timestamp.fromDate(agora))
    .get();

  const eventoIds = [
    ...new Set(
      snap.docs
        .filter((d) => d.get('encerradoEm') === undefined)
        .map((d) => d.ref.parent.parent)
        .filter(
          (ref): ref is FirebaseFirestore.DocumentReference =>
            ref !== null && ref.parent.id === 'eventos'
        )
        .map((ref) => ref.id)
    ),
  ];

  for (const eventoId of eventoIds) {
    await virarLote(db, eventoId, agora);
  }

  return { candidatos: snap.size, eventosProcessados: eventoIds };
}

// ---------------------------------------------------------------------------
// Gatilhos (Cloud Functions v1 — mesmo runtime dos módulos existentes)
// ---------------------------------------------------------------------------

/**
 * onWrite de inscrito → recomputa a virada do evento (metade QUANTIDADE da
 * RN-300). Guard barato: só mudança de STATUS interessa (é ela que muda a
 * contagem); edições de nome/kit/chip não disparam recomputação.
 * At-least-once safe: a recomputação é absoluta — reprocessar não duplica.
 */
export const onInscritoWriteVirada = functions.firestore
  .document('eventos/{eventoId}/inscritos/{inscritoId}')
  .onWrite(async (change, context) => {
    const eventoId = context.params['eventoId'] as string;
    const statusAntes = change.before.exists ? (change.before.get('status') as string) : null;
    const statusDepois = change.after.exists ? (change.after.get('status') as string) : null;
    if (statusAntes === statusDepois) return;

    try {
      await virarLote(admin.firestore(), eventoId);
    } catch (err) {
      // Sem PII no log — só o id do evento (LGPD)
      logger.error('virar_lote_falha', { eventoId, err });
      throw err;
    }
  });

/**
 * Cron da metade DATA da RN-300: a cada 5 minutos carimba lotes cuja janela
 * expirou. O checkout NÃO depende deste cron (o kernel deriva encerramento
 * por data em tempo de leitura) — o cron materializa a trilha/UI e mantém
 * `vendidos` fresco mesmo sem tráfego de inscritos.
 */
export const virarLoteCron = pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    const resultado = await varrerViradasPorData(admin.firestore());
    logger.info('virar_lote_cron', resultado);
    return null;
  });
