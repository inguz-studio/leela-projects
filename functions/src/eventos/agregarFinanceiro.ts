// =============================================================================
// functions/src/eventos/agregarFinanceiro.ts
//
// Agregado financeiro do evento por Cloud Function (LEELA-S207-T2 · E03).
//
// Doc mantido: `eventos/{eventoId}/financeiro/current` — escrita EXCLUSIVA
// de Function (a Rule catch-all das subcoleções de evento nega escrita de
// cliente; leitura fica com o tenant dono/platform_admin). A tela S207-T1
// LÊ este doc — nunca recalcula receita no cliente.
//
// FULL RECOMPUTE (idempotente por construção — mesmo padrão dos rollups
// E16 e dos agregados de membros E05): recontagem via aggregate count()
// sobre a subcoleção `inscritos` + derivação de taxa/líquido a partir do
// TERMO do tenant. Reprocessar N vezes produz o MESMO doc — nada acumula.
// SNAPSHOT-CONSISTENTE (review Onda1 #07): leituras E escritas rodam numa
// única transação — corrida entre dois onInscritoWrite não persiste mais
// agregado stale nem doc com total ≠ Σ porStatus.
//
// Fontes:
//   - contagens (total, por status/kit/modalidade): count() na subcoleção;
//   - `receitaBruta` = `eventos.receitaConfirmada` (∑): o VALOR monetário
//     nasce no fluxo de pagamento (webhook idempotente por eventId — E12,
//     mockProvider já define o contrato). Até lá a fonte é o seed canônico
//     (R$ 85.617). Esta Function NUNCA inventa receita a partir de contagem
//     × preço de kit (kit.preco é DELTA sobre inscrição — E04 define lotes);
//   - `taxaPct` = platformFeePct do TERMO do tenant (TermsProvider, RN-406).
//     Tenant sem termos → taxaPct/taxaValor/receitaLiquida = null, SEM
//     fallback para default (padrão rollups E16 — mascarar ausência de
//     termo reinstalaria a constante que RN-406 proíbe).
//
// O agregado ∑ `eventos.qtdInscritos` também é mantido aqui (era só seed até
// este lote): total de inscrições da subcoleção (todas — cancelada é
// inscrição com histórico; bate com o canônico 453). Escreve SÓ quando o
// valor difere (no-op em reprocesso — padrão itemKitIndex).
//
// Gatilho: onWrite de `eventos/{e}/inscritos/{i}` → recomputa. O write do
// financeiro/current e do evento pai NÃO redispara este gatilho (documentos
// diferentes) — sem loop.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  computeLiquidoProdutor,
  computeTaxa,
  createTermsProvider,
  isModoTaxa,
  KITS_INSCRITO,
  STATUS_INSCRITO,
  TermsNotFoundError,
} from '@leela/core';
import type { CommercialTerms, KitInscrito, ModoTaxa, StatusInscrito } from '@leela/core';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Contagens de inscritos do evento (recontadas da fonte). */
export interface ContagemInscritos {
  total: number;
  porStatus: Record<StatusInscrito, number>;
  porKit: Record<KitInscrito, number>;
  /** Chaves = `evento.modalidades` (percursos configurados no evento) */
  porModalidade: Record<string, number>;
}

/** Shape do doc `eventos/{id}/financeiro/current` (sem o Timestamp). */
export interface FinanceiroEvento {
  tenantId: string;
  /** Receita bruta confirmada (R$) — espelho do ∑ `receitaConfirmada` */
  receitaBruta: number;
  /** % do termo do tenant (RN-406) — null quando o tenant não tem termos */
  taxaPct: number | null;
  /** Taxa Leela (R$) — null quando não há termo */
  taxaValor: number | null;
  /** Líquido do produtor (R$) — null quando não há termo */
  receitaLiquida: number | null;
  inscritos: ContagemInscritos;
}

/**
 * Deriva taxa e líquido a partir do bruto + % do termo (null-safe, RN-406).
 *
 * RN-347 (EVENTO-CAMPOS): o líquido respeita o MODO da taxa do evento —
 * 'incorporada' (default/vigente): líquido = bruto − taxa;
 * 'repassada': a taxa é cobrada por fora do comprador ⇒ líquido = bruto
 * (a taxa nunca foi dinheiro do produtor). Reusa `computeLiquidoProdutor`
 * do core (E09s-L1) — NUNCA reimplementa a matemática. `taxaValor` segue
 * informativo nos DOIS modos (é a fatia Leela; o modo decide QUEM paga).
 * @pure
 */
export function computeFinanceiro(
  receitaBruta: number,
  taxaPct: number | null,
  modo: ModoTaxa = 'incorporada'
): Pick<FinanceiroEvento, 'taxaPct' | 'taxaValor' | 'receitaLiquida'> {
  if (taxaPct === null) {
    return { taxaPct: null, taxaValor: null, receitaLiquida: null };
  }
  return {
    taxaPct,
    taxaValor: computeTaxa(receitaBruta, taxaPct),
    receitaLiquida: computeLiquidoProdutor(receitaBruta, taxaPct, modo),
  };
}

// ---------------------------------------------------------------------------
// Recomputação (núcleo — testável com Admin SDK contra o Emulator)
// ---------------------------------------------------------------------------

/**
 * Reconta os inscritos do evento via aggregate count() DENTRO da transação
 * (fonte da verdade, snapshot-consistente — review Onda1 #07: as ~10 counts
 * sequenciais fora de tx podiam misturar estados de writes concorrentes).
 */
async function contarInscritos(
  tx: admin.firestore.Transaction,
  db: Db,
  eventoId: string,
  modalidades: readonly string[]
): Promise<ContagemInscritos> {
  const col = db.collection('eventos').doc(eventoId).collection('inscritos');

  const count = async (q: FirebaseFirestore.Query): Promise<number> =>
    (await tx.get(q.count())).data().count;

  const total = await count(col);

  const porStatus = {} as Record<StatusInscrito, number>;
  for (const status of STATUS_INSCRITO) {
    porStatus[status] = await count(col.where('status', '==', status));
  }

  const porKit = {} as Record<KitInscrito, number>;
  for (const kit of KITS_INSCRITO) {
    porKit[kit] = await count(col.where('kit', '==', kit));
  }

  const porModalidade: Record<string, number> = {};
  for (const modalidade of modalidades) {
    porModalidade[modalidade] = await count(
      col.where('modalidade', '==', modalidade)
    );
  }

  return { total, porStatus, porKit, porModalidade };
}

/**
 * Recomputa o agregado financeiro do evento do zero e persiste:
 *   - `eventos/{id}/financeiro/current` — set() integral (idempotente);
 *   - `eventos/{id}.qtdInscritos` — sincronizado quando difere (no-op senão).
 *
 * TUDO dentro de UMA transação (fix review Onda1 #07): leituras (evento,
 * counts, termo) saem do MESMO snapshot e o commit falha/retenta se um write
 * concorrente de inscrito invalidar o snapshot — dois onInscritoWrite em
 * corrida não gravam mais agregado stale (que persistia até o próximo write),
 * nem doc com `total` ≠ Σ porStatus na tela S207.
 *
 * @returns o doc financeiro recomputado, ou null quando o evento não existe
 *          (inscrito órfão de evento deletado — nada a manter).
 */
export async function recomputarFinanceiroEvento(
  db: Db,
  eventoId: string
): Promise<FinanceiroEvento | null> {
  return db.runTransaction(async (tx) => {
    const eventoRef = db.collection('eventos').doc(eventoId);
    const eventoSnap = await tx.get(eventoRef);
    if (!eventoSnap.exists) return null;

    const tenantId = (eventoSnap.get('tenantId') as string) ?? '';
    const receitaBruta =
      typeof eventoSnap.get('receitaConfirmada') === 'number'
        ? (eventoSnap.get('receitaConfirmada') as number)
        : 0;
    const modalidades = Array.isArray(eventoSnap.get('modalidades'))
      ? (eventoSnap.get('modalidades') as unknown[]).filter(
          (m): m is string => typeof m === 'string'
        )
      : [];

    const inscritos = await contarInscritos(tx, db, eventoId, modalidades);

    // Termo do PRÓPRIO tenant (RN-406) — sem termo, sem taxa imputada.
    // Leitura via tx (mesmo snapshot); parsing/validação seguem no provider.
    const termoSnap = await tx.get(
      db.doc(`tenants/${tenantId}/commercialTerms/current`)
    );
    const terms = createTermsProvider(
      async (): Promise<CommercialTerms | null> =>
        termoSnap.exists ? (termoSnap.data() as CommercialTerms) : null,
      { ttlMs: 0 }
    );
    let taxaPct: number | null = null;
    try {
      taxaPct = await terms.getPlatformFeePct(tenantId);
    } catch (err) {
      if (!(err instanceof TermsNotFoundError)) throw err;
    }

    // RN-347: modo da taxa do PRÓPRIO evento (mesmo snapshot da tx) — ausente
    // ou lixo ⇒ 'incorporada' (comportamento vigente; guard, nunca lança aqui
    // para não travar o pipeline de agregação por doc legado).
    const taxaModoRaw = eventoSnap.get('taxaModo');
    const modoTaxa: ModoTaxa = isModoTaxa(taxaModoRaw) ? taxaModoRaw : 'incorporada';

    const financeiro: FinanceiroEvento = {
      tenantId,
      receitaBruta,
      ...computeFinanceiro(receitaBruta, taxaPct, modoTaxa),
      inscritos,
    };

    // set() integral (não merge): o doc É a recomputação — idempotente
    tx.set(eventoRef.collection('financeiro').doc('current'), {
      ...financeiro,
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    // ∑ qtdInscritos — sincroniza só quando difere (no-op em reprocesso)
    if (eventoSnap.get('qtdInscritos') !== inscritos.total) {
      tx.update(eventoRef, {
        qtdInscritos: inscritos.total,
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    }

    return financeiro;
  });
}

// ---------------------------------------------------------------------------
// Gatilho (Cloud Functions v1 — mesmo runtime dos módulos existentes)
// ---------------------------------------------------------------------------

/**
 * onWrite de inscrito → recomputa o financeiro do evento.
 * At-least-once safe: a recomputação é full — reprocessar não duplica.
 */
export const onInscritoWrite = functions.firestore
  .document('eventos/{eventoId}/inscritos/{inscritoId}')
  .onWrite(async (_change, context) => {
    const eventoId = context.params['eventoId'] as string;
    try {
      const financeiro = await recomputarFinanceiroEvento(
        admin.firestore(),
        eventoId
      );
      if (financeiro) {
        logger.info('financeiro_evento_recomputado', {
          eventoId,
          total: financeiro.inscritos.total,
          receitaBruta: financeiro.receitaBruta,
        });
      }
    } catch (err) {
      // Sem PII no log — só o id do evento (LGPD)
      logger.error('financeiro_evento_falha', { eventoId, err });
      throw err;
    }
  });
