// =============================================================================
// functions/src/seed/eventos.seed.ts
//
// Seed dos eventos canônicos para o Emulator (LEELA-S200-T1 · E03).
// Mocks canônicos de HANDOFF-05 — reusar exatamente, nunca inventar:
//   1. Meia Maratona Floripa 2026 — `meia-floripa-2026`, 27 Abr 2026,
//      Marina Castelo (Castelo Produções), 453 inscritos, R$ 85.617,
//      modalidades 5k/10k/21k, usaChip=true, status publicado.
//   2. Maratona Floripa 2027 — `maratona-floripa-2027`, 25 Abr 2027,
//      mesma organizadora, rascunho (sem vendas).
//
// Agregados ∑ (qtdInscritos/receitaConfirmada) entram AQUI via Admin SDK
// (bypassa Rules) — em produção só a Cloud Function os mantém.
// NÃO executar em produção (assertEmulatorOnly).
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { FaixaChips, JanelaEntrega } from '@leela/core';
import { assertEmulatorOnly } from './emulator-guard';
import { CASTELO_TENANT_ID, MARINA_CASTELO_UID } from './tenants.seed';

export const MEIA_FLORIPA_ID = 'meia-floripa-2026';
export const MARATONA_2027_ID = 'maratona-floripa-2027';

export interface EventoSeed {
  id: string;
  tenantId: string;
  organizadorId: string;
  nome: string;
  /** Data da prova (ISO — convertida para Timestamp no seed) */
  data: string;
  local: string;
  modalidades: string[];
  slug: string;
  status: 'rascunho' | 'publicado' | 'ao_vivo' | 'encerrado';
  usaChip: boolean;
  /** Agregado ∑ — seed via Admin SDK; produção = só Function */
  qtdInscritos: number;
  /** Agregado ∑ — seed via Admin SDK; produção = só Function */
  receitaConfirmada: number;
  /** Cronograma de entrega (FABLE-F-T1) — preview do banner do balcão */
  janelasEntrega?: JanelaEntrega[];
  /** Faixa do lote de chips (FABLE-F-T1) — preview dos alertas de estoque */
  faixaChips?: FaixaChips;
}

export const EVENTO_SEEDS: EventoSeed[] = [
  {
    id: MEIA_FLORIPA_ID,
    tenantId: CASTELO_TENANT_ID,
    organizadorId: MARINA_CASTELO_UID,
    nome: 'Meia Maratona Floripa 2026',
    data: '2026-04-27T07:00:00-03:00',
    local: 'Florianópolis/SC',
    modalidades: ['5k', '10k', '21k'],
    slug: MEIA_FLORIPA_ID,
    status: 'publicado',
    usaChip: true,
    qtdInscritos: 453,
    receitaConfirmada: 85617,
    // FABLE-F-T1 — cronograma de entrega de kits (banner "Dia N de M" do
    // balcão): 2 dias de arena + retirada tardia na madrugada da prova (27).
    janelasEntrega: [
      {
        dia: '2026-04-25',
        horaInicio: '10:00',
        horaFim: '20:00',
        local: 'Arena Meia Floripa — Beira-Mar Norte',
      },
      {
        dia: '2026-04-26',
        horaInicio: '10:00',
        horaFim: '18:00',
        local: 'Arena Meia Floripa — Beira-Mar Norte',
      },
      {
        dia: '2026-04-27',
        horaInicio: '05:00',
        horaFim: '06:30',
        local: 'Balcão da largada — retirada tardia',
      },
    ],
    // FABLE-F-T1 — lote de chips da cronometragem (600 chips p/ 453 inscritos)
    faixaChips: { inicio: 8001, fim: 8600 },
  },
  {
    id: MARATONA_2027_ID,
    tenantId: CASTELO_TENANT_ID,
    organizadorId: MARINA_CASTELO_UID,
    nome: 'Maratona Floripa 2027',
    data: '2027-04-25T07:00:00-03:00',
    local: 'Florianópolis/SC',
    modalidades: ['42k'],
    slug: MARATONA_2027_ID,
    status: 'rascunho',
    usaChip: true,
    qtdInscritos: 0,
    receitaConfirmada: 0,
  },
];

// ---------------------------------------------------------------------------
// Kernel de vendas E04 (LEELA-S300-T1 · ADR-012) — subcoleções da Meia Floripa
//
// Lotes POR MODALIDADE (ADR-012): 5k/10k/21k, cada uma com 3 lotes numa
// sequência de janelas não-sobrepostas — Lote 1 (Promocional) ENCERRADO
// (janela passada + esgotado por quantidade), Lote 2 VIGENTE (janela cobrindo
// mar/2026, ~40% vendido), Lote 3 (Final) FUTURO (abre em abr, até a véspera).
// `vendidos` entra via Admin SDK (∑ de Function em produção). Datas coerentes:
// tudo antes da prova (27/abr/2026). Preço escalando por lote e por distância.
// ---------------------------------------------------------------------------

interface LoteSeed {
  modalidade: string;
  ordem: number;
  nome: string;
  /** ISO — convertido para Timestamp no seed */
  inicioEm: string;
  fimEm: string;
  quantidadeLimite: number;
  preco: number;
  vendidos: number;
}

/** Preço-base por modalidade (Lote 1); lotes 2/3 escalam +25%/+50%. */
const LOTES_POR_MODALIDADE: Record<string, number> = { '5k': 60, '10k': 80, '21k': 120 };

/** Janelas compartilhadas (caso comum do ADR-012 — modalidades coincidem). */
const JANELAS_LOTES: {
  ordem: number;
  nome: string;
  inicioEm: string;
  fimEm: string;
  fator: number;
}[] = [
  { ordem: 1, nome: 'Lote Promocional', inicioEm: '2025-12-01T00:00:00-03:00', fimEm: '2026-02-01T00:00:00-03:00', fator: 1 },
  { ordem: 2, nome: 'Lote 2', inicioEm: '2026-02-01T00:00:00-03:00', fimEm: '2026-04-01T00:00:00-03:00', fator: 1.25 },
  { ordem: 3, nome: 'Lote Final', inicioEm: '2026-04-01T00:00:00-03:00', fimEm: '2026-04-26T23:59:00-03:00', fator: 1.5 },
];

/** Vagas e vendas por ordem: L1 esgotado, L2 parcial, L3 zerado. */
const ESTADO_POR_ORDEM: Record<number, { quantidadeLimite: number; vendidos: number }> = {
  1: { quantidadeLimite: 150, vendidos: 150 },
  2: { quantidadeLimite: 300, vendidos: 120 },
  3: { quantidadeLimite: 300, vendidos: 0 },
};

export const LOTE_SEEDS: LoteSeed[] = Object.entries(LOTES_POR_MODALIDADE).flatMap(
  ([modalidade, base]) =>
    JANELAS_LOTES.map((j) => ({
      modalidade,
      ordem: j.ordem,
      nome: j.nome,
      inicioEm: j.inicioEm,
      fimEm: j.fimEm,
      quantidadeLimite: ESTADO_POR_ORDEM[j.ordem]!.quantidadeLimite,
      preco: Math.round(base * j.fator),
      vendidos: ESTADO_POR_ORDEM[j.ordem]!.vendidos,
    }))
);

interface CupomSeed {
  /** docId = código (já normalizado UPPER) */
  codigo: string;
  tipo: 'percentual' | 'fixo';
  valor: number;
  tetoUso: number | null;
  inicioEm: string;
  fimEm: string;
  usos: number;
}

// HEROI10 é o mesmo código que o seed de pagamentos referencia no slide-in [pag].
export const CUPOM_SEEDS: CupomSeed[] = [
  { codigo: 'HEROI10', tipo: 'percentual', valor: 10, tetoUso: 100, inicioEm: '2025-12-01T00:00:00-03:00', fimEm: '2026-04-26T23:59:00-03:00', usos: 37 },
  { codigo: 'CORRA50', tipo: 'fixo', valor: 50, tetoUso: null, inicioEm: '2026-02-01T00:00:00-03:00', fimEm: '2026-04-26T23:59:00-03:00', usos: 8 },
];

/** docId canônico da página de vendas (1 por evento). */
const PAGINA_VENDAS_DOC_ID = 'config';

/** loteId determinístico e legível: `{modalidade}-lote-{ordem}`. */
function loteId(seed: LoteSeed): string {
  return `${seed.modalidade}-lote-${seed.ordem}`;
}

/**
 * Popula a coleção `eventos` no Firestore (Emulator) + o kernel de vendas E04
 * (lotes/cupons/paginaVendas) sob a Meia Floripa (S300-T1).
 * Idempotente — docIds fixos + set com merge; `criadoEm` só na criação (F8).
 */
export async function seedEventos(db: admin.firestore.Firestore): Promise<void> {
  assertEmulatorOnly('seedEventos');

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();

  for (const evento of EVENTO_SEEDS) {
    const ref = db.collection('eventos').doc(evento.id);
    const snap = await ref.get();

    const data: Record<string, unknown> = {
      id: evento.id,
      tenantId: evento.tenantId,
      organizadorId: evento.organizadorId,
      nome: evento.nome,
      data: Timestamp.fromDate(new Date(evento.data)),
      local: evento.local,
      modalidades: evento.modalidades,
      slug: evento.slug,
      status: evento.status,
      usaChip: evento.usaChip,
      qtdInscritos: evento.qtdInscritos,
      receitaConfirmada: evento.receitaConfirmada,
      atualizadoEm: now,
    };

    // FABLE-F-T1 — cronograma + faixa de chips só quando o seed define
    // (Maratona 2027 rascunho fica SEM — EmptyState honesto no balcão).
    if (evento.janelasEntrega !== undefined) {
      data['janelasEntrega'] = evento.janelasEntrega;
    }
    if (evento.faixaChips !== undefined) {
      data['faixaChips'] = evento.faixaChips;
    }

    // criadoEm só na criação — rerun não regrava (F8)
    if (!snap.exists) {
      data['criadoEm'] = now;
    }

    batch.set(ref, data, { merge: true });
  }

  // ── Kernel de vendas E04 sob a Meia Floripa (S300-T1) ────────────────────
  const eventoRef = db.collection('eventos').doc(MEIA_FLORIPA_ID);

  for (const lote of LOTE_SEEDS) {
    const ref = eventoRef.collection('lotes').doc(loteId(lote));
    const snap = await ref.get();
    const data: Record<string, unknown> = {
      id: loteId(lote),
      tenantId: CASTELO_TENANT_ID,
      modalidade: lote.modalidade,
      ordem: lote.ordem,
      nome: lote.nome,
      inicioEm: Timestamp.fromDate(new Date(lote.inicioEm)),
      fimEm: Timestamp.fromDate(new Date(lote.fimEm)),
      quantidadeLimite: lote.quantidadeLimite,
      preco: lote.preco,
      vendidos: lote.vendidos, // ∑ via Admin SDK — produção = só Function (S300-T2)
      atualizadoEm: now,
    };
    if (!snap.exists) data['criadoEm'] = now;
    batch.set(ref, data, { merge: true });
  }

  for (const cupom of CUPOM_SEEDS) {
    const ref = eventoRef.collection('cupons').doc(cupom.codigo);
    const snap = await ref.get();
    const data: Record<string, unknown> = {
      id: cupom.codigo,
      tenantId: CASTELO_TENANT_ID,
      codigo: cupom.codigo,
      tipo: cupom.tipo,
      valor: cupom.valor,
      tetoUso: cupom.tetoUso,
      inicioEm: Timestamp.fromDate(new Date(cupom.inicioEm)),
      fimEm: Timestamp.fromDate(new Date(cupom.fimEm)),
      usos: cupom.usos, // ∑ via Admin SDK — produção = só Function (checkout)
      atualizadoEm: now,
    };
    if (!snap.exists) data['criadoEm'] = now;
    batch.set(ref, data, { merge: true });
  }

  const paginaRef = eventoRef.collection('paginaVendas').doc(PAGINA_VENDAS_DOC_ID);
  const paginaSnap = await paginaRef.get();
  const paginaData: Record<string, unknown> = {
    id: PAGINA_VENDAS_DOC_ID,
    tenantId: CASTELO_TENANT_ID,
    eventoId: MEIA_FLORIPA_ID,
    secoes: [
      { id: 'hero', canal: 'essenciais', ativa: true, travada: false },
      { id: 'sobre', canal: 'essenciais', ativa: true, travada: false },
      { id: 'percursos', canal: 'essenciais', ativa: true, travada: false },
      { id: 'lotes', canal: 'essenciais', ativa: true, travada: false },
      { id: 'depoimentos', canal: 'landing', ativa: false, travada: false },
      { id: 'patrocinadores', canal: 'landing', ativa: true, travada: false },
      { id: 'checkout', canal: 'sistema', ativa: true, travada: true },
    ],
    seo: {
      titulo: 'Meia Maratona Floripa 2026 — inscrições abertas',
      descricao: '5k, 10k e 21k na Beira-Mar Norte. Lotes promocionais por distância.',
      slugAmigavel: '{DOMINIO_LEELA}/meia-floripa-2026',
    },
    publicada: true, // carimbo de Function em produção (S300-T3); seed via Admin SDK
    atualizadoEm: now,
  };
  if (!paginaSnap.exists) {
    paginaData['criadoEm'] = now;
    paginaData['publicadaEm'] = now;
  }
  batch.set(paginaRef, paginaData, { merge: true });

  await batch.commit();
  console.log(
    '[seed] eventos: Meia Maratona Floripa 2026 (publicado, 453/R$85.617) + Maratona Floripa 2027 (rascunho)'
  );
  console.log(
    `[seed] vendas E04: ${LOTE_SEEDS.length} lotes (5k/10k/21k × L1 encerrado/L2 vigente/L3 futuro) + ${CUPOM_SEEDS.length} cupons + paginaVendas — sob ${MEIA_FLORIPA_ID}`
  );
}

// ---------------------------------------------------------------------------
// Entry point (execução direta)
// ---------------------------------------------------------------------------
if (require.main === module) {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] =
      process.env['FIRESTORE_EMULATOR_HOST'] ?? 'localhost:8080';
    admin.initializeApp({ projectId: 'demo-leela' });
  }
  seedEventos(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
