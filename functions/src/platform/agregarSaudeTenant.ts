// =============================================================================
// functions/src/platform/agregarSaudeTenant.ts
//
// Agregados ∑ de SAÚDE do tenant — `tenants/{tenantId}.gmvAcumulado` e
// `.eventosAtivos` (LEELA-E16 · RN-409 · lane METRICAS-PAGANTES-BACKEND).
//
// ── O defeito que este módulo fecha ─────────────────────────────────────────
// Os dois campos nasciam em `0` (`provisionTenant.ts:387-388`) e NENHUMA
// Function os escrevia — varredura completa de `functions/src` provou que só o
// provisionamento, os seeds e a LEITURA (`platform/rollups.ts:104-105`)
// tocavam os campos. Consequência medida: `/plataforma/macro` exibia
// **GMV total R$ 0,00 e Receita Leela total R$ 0,00 para sempre**
// (`receitaLeela = computeTaxa(gmv, fee)` herda o zero), `/plataforma/tenants`
// mostrava GMV zerado por tenant, e `deriveTenantHealth(status, 0)` carimbava
// TODO tenant ativo como 'atencao' ("conta operável mas parada") mesmo com
// evento no ar. Números que não existem exibidos como se existissem.
//
// ── Definição (E16 + spec ADMIN-VISAO V-1) ──────────────────────────────────
// `gmvAcumulado` = "valor de face confirmado do tenant" = Σ
// `eventos.receitaConfirmada` dos eventos do tenant. É a MESMA base que o
// organizador vê em `financeiro/current.receitaBruta` — qualquer outra
// definição faria o macro do admin discordar da tela do produtor sobre o mesmo
// dinheiro. Já é LÍQUIDA de reembolso por construção: `estornarInscricao`
// reverte o face em `receitaConfirmada` (o webhook somou, o estorno subtrai).
//
// `eventosAtivos` = nº de eventos com status `publicado`/`ao_vivo`
// (`eventoPublico` do core — nunca re-derivar a lista de status aqui).
//
// ── Por que um gatilho de RECOMPUTAÇÃO e não um incremento na venda ─────────
// O caminho óbvio seria somar `valorFinal` em `tenants/{tid}` dentro da
// transação do `webhookPagamento` (e subtrair no `estornarInscricao`). Foi
// REJEITADO por dois motivos concretos:
//   1. hot-doc: TODA confirmação de pagamento do tenant passaria a escrever no
//      MESMO documento, dentro da transação de dinheiro. Numa abertura de
//      vendas isso serializa o checkout inteiro do tenant num único doc
//      (limite prático de ~1 escrita/s por documento) — o agregado de um
//      dashboard de preço derrubaria a venda;
//   2. custo de blast radius: exigiria abrir TRÊS transações de dinheiro já
//      seladas (webhook, estorno de inscrição, estorno de órfão) para um campo
//      que nenhuma delas precisa ler.
// A recomputação FULL a partir da fonte é o padrão da casa para agregado
// (`platform/rollups`, `agregarFinanceiro`, `membrosAggregates`,
// `onConversao`) e é IDEMPOTENTE por construção: rodar N vezes sobre o mesmo
// estado produz o mesmo doc, sem acumulação que drifta. O gatilho é
// `eventos/{id}` onWrite porque é EXATAMENTE ali que o efeito da venda
// aterrissa: `receitaConfirmada` (webhook e estorno) e `status`
// (publicar/despublicar) vivem nesse doc.
//
// ⚠️ Condição de reabertura (registrada, não escondida): se um tenant passar a
// sustentar mais de ~1 evento-write por segundo (não payment-write: writes de
// eventos DIFERENTES do mesmo tenant também caem no mesmo doc de tenant), este
// desenho vira gargalo e a saída é agregação por janela (cron) ou contador
// shardado. Hoje o volume não chega perto e o número fica fresco em segundos.
//
// Sem loop de gatilho: o destino (`tenants/{tid}`) NÃO tem trigger algum —
// verificado na varredura desta lane (zero `document('tenants/{tenantId}')`).
//
// ⛔ BACKFILL É PASSO SEPARADO: o gatilho corrige daqui para a frente (todo
// evento que receber qualquer write recomputa o tenant dele). Tenant cujos
// eventos ficarem parados mantém o 0 histórico até o backfill rodar —
// `recomputarSaudeDeTodosOsTenants` existe e é testada para isso, mas NÃO é
// chamada por nenhum gatilho, cron ou callable: quem a executa é a fase de
// deploy, com os gates dela.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { eventoPublico, isStatusEvento, roundMoney } from '@leela/core';

type Db = admin.firestore.Firestore;

/** Agregados de saúde recomputados de um tenant. */
export interface SaudeTenant {
  /** Σ `eventos.receitaConfirmada` do tenant (R$, face confirmado) */
  gmvAcumulado: number;
  /** Nº de eventos `publicado`/`ao_vivo` do tenant */
  eventosAtivos: number;
  /** Eventos varridos (observabilidade — não persistido) */
  eventosVarridos: number;
  /** A recomputação MUDOU o doc? (false = no-op idempotente) */
  escreveu: boolean;
}

function asMoney(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

/**
 * Recomputa `gmvAcumulado` e `eventosAtivos` do tenant a partir da FONTE
 * (`eventos where tenantId == …`) e grava SÓ quando algum dos dois difere do
 * persistido — o no-op deixa `atualizadoEm` intocado, que é como a
 * idempotência se prova de fora.
 *
 * Projeção `select()`: a varredura lê dois campos por evento, não o doc
 * inteiro. Query equality-only em `tenantId` — índice single-field automático,
 * o mesmo que `lerInputsSaldoRepasse` já usa (nenhum índice novo).
 *
 * SNAPSHOT-CONSISTENTE: leitura do tenant, varredura dos eventos e escrita
 * rodam numa ÚNICA transação. Sem isso, dois writes de eventos do MESMO tenant
 * em corrida podiam persistir o agregado do snapshot MAIS VELHO — e ele
 * ficaria de pé até o próximo write do tenant. É exatamente o defeito que a
 * review Onda1 #07 achou em `agregarFinanceiro` (as counts fora de transação
 * misturando estados de writes concorrentes); a casa já pagou por essa lição
 * uma vez, e este agregado nasce do lado certo dela.
 *
 * @returns null quando o tenant não existe (evento com `tenantId` órfão —
 *          nada a manter; nunca cria doc de tenant por efeito colateral).
 */
export async function recomputarSaudeTenant(
  db: Db,
  tenantId: string
): Promise<SaudeTenant | null> {
  if (tenantId.length === 0) return null;

  const tenantRef = db.collection('tenants').doc(tenantId);

  return db.runTransaction(async (tx) => {
    // Leituras ANTES de qualquer escrita (exigência da transação).
    const tenantSnap = await tx.get(tenantRef);
    if (!tenantSnap.exists) return null;

    const eventosSnap = await tx.get(
      db
        .collection('eventos')
        .where('tenantId', '==', tenantId)
        .select('receitaConfirmada', 'status')
    );

    let gmvAcumulado = 0;
    let eventosAtivos = 0;
    for (const doc of eventosSnap.docs) {
      // roundMoney a cada passo: a mesma disciplina cent-exata de
      // `receitaConfirmada` (o erro de ponto flutuante não acumula ao longo
      // da varredura).
      gmvAcumulado = roundMoney(gmvAcumulado + asMoney(doc.get('receitaConfirmada')));
      const status = doc.get('status') as unknown;
      if (isStatusEvento(status) && eventoPublico(status)) eventosAtivos += 1;
    }

    const escreveu =
      tenantSnap.get('gmvAcumulado') !== gmvAcumulado ||
      tenantSnap.get('eventosAtivos') !== eventosAtivos;

    if (escreveu) {
      tx.update(tenantRef, {
        gmvAcumulado,
        eventosAtivos,
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    }

    return {
      gmvAcumulado,
      eventosAtivos,
      eventosVarridos: eventosSnap.size,
      escreveu,
    };
  });
}

/**
 * ⛔ BACKFILL — passo SEPARADO da fase de deploy, nunca chamado por gatilho,
 * cron ou callable. Recomputa a saúde de TODOS os tenants existentes (o
 * gatilho só alcança tenants cujos eventos recebem write depois do deploy).
 *
 * Idempotente e re-executável: é a mesma recomputação FULL por tenant, e
 * tenant já correto não é escrito.
 */
export async function recomputarSaudeDeTodosOsTenants(
  db: Db
): Promise<{ tenants: number; escritos: number }> {
  const tenantsSnap = await db.collection('tenants').select().get();
  let escritos = 0;
  for (const doc of tenantsSnap.docs) {
    const r = await recomputarSaudeTenant(db, doc.id);
    if (r?.escreveu === true) escritos += 1;
  }
  return { tenants: tenantsSnap.size, escritos };
}

// ---------------------------------------------------------------------------
// Gatilho de fan-out (padrão v1 do repo — onEventoWriteDashboard é o vizinho)
// ---------------------------------------------------------------------------

/** Tenants afetados por um write de evento (before ∪ after — cobre migração). */
function tenantsAfetados(change: {
  before: FirebaseFirestore.DocumentSnapshot;
  after: FirebaseFirestore.DocumentSnapshot;
}): Set<string> {
  const afetados = new Set<string>();
  for (const snap of [change.before, change.after]) {
    if (!snap.exists) continue;
    const id = snap.get('tenantId') as unknown;
    if (typeof id === 'string' && id.length > 0) afetados.add(id);
  }
  return afetados;
}

/**
 * Fan-out eventos → saúde do tenant. Cobre create/update/delete e a troca de
 * `tenantId` (recomputa o tenant antigo E o novo — o GMV não fica preso no
 * tenant errado depois de uma migração).
 */
export const onEventoWriteSaudeTenant = firestore
  .document('eventos/{eventoId}')
  .onWrite(async (change) => {
    const db = admin.firestore();
    for (const tenantId of tenantsAfetados(change)) {
      const saude = await recomputarSaudeTenant(db, tenantId);
      if (saude === null) {
        logger.warn('saude_tenant_inexistente', { tenantId });
        continue;
      }
      if (saude.escreveu) {
        logger.info('saude_tenant_recomputada', {
          tenantId,
          gmvAcumulado: saude.gmvAcumulado,
          eventosAtivos: saude.eventosAtivos,
          eventosVarridos: saude.eventosVarridos,
        });
      }
    }
  });
