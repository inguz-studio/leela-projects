// =============================================================================
// functions/src/seed/desafios.seed.ts
//
// Seed dos 5 desafios canônicos do clube Corrida Perfeita Sul
// (LEELA-S105-T1 — HANDOFF-05 §"5 Desafios mock").
// NÃO executar em produção (guard assertEmulatorOnly local).
//
// 3 ativos:  Preparação Meia Floripa 2026 (C · signature), Morro da Cruz
//            30 dias (A), Marcha Mental (B).
// 2 encerrados: Verão Leve 2026 (C), Desconexão Rota do Sol (B).
//
// Junção N:N `desafios/{id}/acoes/{acaoId}` referencia o catálogo global
// (catalogoAcoes) — `meta` só nos desafios Modelo A ou quando o mock traz
// meta explícita por ação (Preparação Meia Floripa lista metas por ação no
// protótipo; em Modelo C elas são informativas, não obrigatórias — RN-110).
//
// Agregados ∑ (qtdParticipantes, progressoPct, progressoPorPilar) são
// escritos AQUI via Admin SDK com os valores canônicos do protótipo — é o
// mesmo caminho privilegiado da Function (cliente continua bloqueado pelas
// Rules). `clubes.qtdDesafiosAtivos` NÃO é chumbado: sai da MESMA rotina de
// recontagem da Function (recontarDesafiosAtivos).
//
// Nota (Morro da Cruz): o protótipo usa a ação custom "Subir o Morro da
// Cruz", que não existe no catálogo fixo de 16 (RN-114). Ações custom estão
// fora da V1 — a junção usa `caminhar` (meta 10 subidas) como proxy; o nome
// da experiência vive no próprio desafio.
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type {
  ModeloDesafio,
  Pilar,
  RecompensaTipo,
  StatusDesafio,
  VisibilidadeDesafio,
} from '@leela/core';
import { recontarDesafiosAtivos } from '../clubs/desafiosAggregates';
import {
  CLUBE_CPS_SLUG,
  CORRIDA_PERFEITA_TENANT_ID,
  FELIPE_MARTINS_UID,
  seedClubes,
} from './clubes.seed';
import { seedCatalogoAcoes } from './catalogoAcoes.seed';
import { assertEmulatorOnly as guardEmulatorOnly } from './emulator-guard';

/** Total de desafios canônicos semeados */
export const TOTAL_DESAFIOS_SEED = 5;

/** Quantos contam no agregado ∑ qtdDesafiosAtivos (status == 'ativo') */
export const QTD_DESAFIOS_ATIVOS_SEED = 3;

// IDs canônicos das parcerias de patrocínio (nascem em parcerias.seed.ts —
// S107-T1; referência forward por string id é estável)
export const PARCERIA_CDL_ID = 'parceria-cdl-wellness';
export const PARCERIA_ACATE_ID = 'parceria-acate-run-club';
export const PARCERIA_SECRETARIA_ID = 'parceria-secretaria-esportes';

/** Slug do evento vinculado à Preparação Meia Floripa (RN-113 — E03) */
export const EVENTO_MEIA_FLORIPA_SLUG = 'meia-floripa-2026';

/**
 * Guard anti-produção (padrão F5 — review S1600): seed SÓ roda no Emulator.
 */
function assertEmulatorOnly(): void {
  // Delegado ao guard COMPARTILHADO de emulator-guard.ts (mesmo contrato
  // F5 + escape nominal de producao da lane DEPLOY-PREVIEW). Antes: copia
  // local identica - consolidada para o escape valer em todos os seeds.
  guardEmulatorOnly('seedDesafios');
}

interface AcaoSeedSpec {
  acaoRef: string;
  meta?: number;
}

interface DesafioSeedSpec {
  id: string;
  nome: string;
  descricao: string;
  modelo: ModeloDesafio;
  dataInicio: string; // ISO
  dataFim: string; // ISO
  status: StatusDesafio;
  patrocinioId?: string;
  eventoVinculadoId?: string;
  metaTotalPontos?: number;
  minimoPorPilar?: Partial<Record<Pilar, number>>;
  recompensaTipo: RecompensaTipo;
  visibilidade: VisibilidadeDesafio;
  qtdParticipantes: number;
  progressoPct: number;
  progressoPorPilar?: Partial<Record<Pilar, { atual: number; meta: number }>>;
  acoes: readonly AcaoSeedSpec[];
}

/** Specs canônicas — HANDOFF-05 §"5 Desafios mock". */
const DESAFIOS_SEED: readonly DesafioSeedSpec[] = [
  {
    id: 'preparacao-meia-floripa',
    nome: 'Preparação Meia Floripa 2026',
    descricao:
      '8 semanas de preparação equilibrada para a Meia Maratona Floripa ' +
      '2026: corpo forte, mente presente, espírito leve.',
    modelo: 'C',
    dataInicio: '2026-03-01T00:00:00-03:00',
    dataFim: '2026-04-26T23:59:59-03:00',
    status: 'ativo',
    patrocinioId: PARCERIA_CDL_ID,
    eventoVinculadoId: EVENTO_MEIA_FLORIPA_SLUG,
    metaTotalPontos: 2000,
    minimoPorPilar: { fisico: 300, mental: 300, espiritual: 300 },
    recompensaTipo: 'cupom',
    visibilidade: 'membros',
    qtdParticipantes: 48,
    progressoPct: 62,
    progressoPorPilar: {
      fisico: { atual: 520, meta: 700 },
      mental: { atual: 410, meta: 600 },
      espiritual: { atual: 304, meta: 700 },
    },
    acoes: [
      { acaoRef: 'correr', meta: 80 },
      { acaoRef: 'caminhar', meta: 40 },
      { acaoRef: 'pedalar', meta: 120 },
      { acaoRef: 'musculacao', meta: 24 },
      { acaoRef: 'dormir-7h', meta: 56 },
      { acaoRef: 'ler', meta: 300 },
      { acaoRef: 'journaling', meta: 16 },
      { acaoRef: 'meditar', meta: 300 },
      { acaoRef: 'respiracao-consciente', meta: 20 },
    ],
  },
  {
    id: 'morro-da-cruz-30-dias',
    nome: 'Morro da Cruz 30 dias',
    descricao:
      'Suba o Morro da Cruz 10 vezes em 30 dias — elevação mínima de 200m ' +
      'por subida.',
    modelo: 'A',
    dataInicio: '2026-04-01T00:00:00-03:00',
    dataFim: '2026-04-30T23:59:59-03:00',
    status: 'ativo',
    recompensaTipo: 'medalha_digital',
    visibilidade: 'membros',
    qtdParticipantes: 22,
    progressoPct: 47,
    acoes: [{ acaoRef: 'caminhar', meta: 10 }],
  },
  {
    id: 'marcha-mental',
    nome: 'Marcha Mental — Leitura e Foco',
    descricao:
      'Um mês de leitura, escrita e presença: some pontos nos pilares ' +
      'Mental e Espiritual no mix que preferir.',
    modelo: 'B',
    dataInicio: '2026-03-01T00:00:00-03:00',
    dataFim: '2026-03-31T23:59:59-03:00',
    status: 'ativo',
    patrocinioId: PARCERIA_ACATE_ID,
    metaTotalPontos: 500,
    recompensaTipo: 'medalha_digital',
    visibilidade: 'membros',
    qtdParticipantes: 31,
    progressoPct: 78,
    progressoPorPilar: {
      mental: { atual: 245, meta: 300 },
      espiritual: { atual: 145, meta: 200 },
    },
    acoes: [
      { acaoRef: 'ler' },
      { acaoRef: 'journaling' },
      { acaoRef: 'estudar-curso' },
      { acaoRef: 'meditar' },
      { acaoRef: 'gratidao-diaria' },
    ],
  },
  {
    id: 'verao-leve-2026',
    nome: 'Verão Leve 2026',
    descricao:
      'Comece o ano em equilíbrio: meta total com mínimo em cada pilar ' +
      'durante todo o verão.',
    modelo: 'C',
    dataInicio: '2026-01-01T00:00:00-03:00',
    dataFim: '2026-02-28T23:59:59-03:00',
    status: 'encerrado',
    patrocinioId: PARCERIA_CDL_ID,
    metaTotalPontos: 1500,
    minimoPorPilar: { fisico: 200, mental: 200, espiritual: 200 },
    recompensaTipo: 'medalha_digital',
    visibilidade: 'membros',
    qtdParticipantes: 87,
    progressoPct: 73,
    acoes: [
      { acaoRef: 'correr' },
      { acaoRef: 'caminhar' },
      { acaoRef: 'ler' },
      { acaoRef: 'meditar' },
      { acaoRef: 'gratidao-diaria' },
    ],
  },
  {
    id: 'desconexao-rota-do-sol',
    nome: 'Desconexão Rota do Sol',
    descricao:
      'Julho de presença: pool espiritual de 600 pontos entre meditação, ' +
      'gratidão, desconexão e respiração.',
    modelo: 'B',
    dataInicio: '2025-07-01T00:00:00-03:00',
    dataFim: '2025-07-31T23:59:59-03:00',
    status: 'encerrado',
    patrocinioId: PARCERIA_SECRETARIA_ID,
    metaTotalPontos: 600,
    recompensaTipo: 'medalha_digital',
    visibilidade: 'membros',
    qtdParticipantes: 44,
    progressoPct: 86,
    acoes: [
      { acaoRef: 'meditar' },
      { acaoRef: 'gratidao-diaria' },
      { acaoRef: 'desconexao-digital' },
      { acaoRef: 'respiracao-consciente' },
    ],
  },
];

/**
 * Popula os 5 desafios canônicos + junção `acoes` no clube CPS (Emulator).
 * Garante pré-requisitos (clube + catálogo). Idempotente: docIds fixos;
 * rerun regrava specs e reconta o agregado (converge sempre).
 */
export async function seedDesafios(
  db: admin.firestore.Firestore
): Promise<void> {
  assertEmulatorOnly();

  // Pré-requisitos: clube canônico (S101-T1) + catálogo de 16 (RN-114)
  await seedClubes(db);
  await seedCatalogoAcoes(db);

  const now = FieldValue.serverTimestamp();
  const clubeRef = db.collection('clubes').doc(CLUBE_CPS_SLUG);

  for (const spec of DESAFIOS_SEED) {
    const desafioRef = clubeRef.collection('desafios').doc(spec.id);
    const snap = await desafioRef.get();

    const data: Record<string, unknown> = {
      id: spec.id,
      tenantId: CORRIDA_PERFEITA_TENANT_ID,
      // E15 higiene (S105-hig · decisão 7): autor = dono do clube pai
      // (generaliza o dono hoje implícito no path; Creator Studio futuro).
      autorId: FELIPE_MARTINS_UID,
      nome: spec.nome,
      descricao: spec.descricao,
      modelo: spec.modelo,
      dataInicio: Timestamp.fromDate(new Date(spec.dataInicio)),
      dataFim: Timestamp.fromDate(new Date(spec.dataFim)),
      status: spec.status,
      recompensaTipo: spec.recompensaTipo,
      visibilidade: spec.visibilidade,
      // ∑ canônicos do protótipo — escrita privilegiada (Admin SDK), como a
      // Function de progresso fará quando registros existirem (E13)
      qtdParticipantes: spec.qtdParticipantes,
      progressoPct: spec.progressoPct,
      atualizadoEm: now,
    };
    if (spec.patrocinioId) data['patrocinioId'] = spec.patrocinioId;
    if (spec.eventoVinculadoId) {
      data['eventoVinculadoId'] = spec.eventoVinculadoId;
    }
    if (spec.metaTotalPontos !== undefined) {
      data['metaTotalPontos'] = spec.metaTotalPontos;
    }
    if (spec.minimoPorPilar) data['minimoPorPilar'] = spec.minimoPorPilar;
    if (spec.progressoPorPilar) {
      data['progressoPorPilar'] = spec.progressoPorPilar;
    }
    if (!snap.exists) data['criadoEm'] = now;

    await desafioRef.set(data, { merge: true });

    // Junção N:N — docId = id da ação no catálogo global
    const batch = db.batch();
    for (const acao of spec.acoes) {
      const acaoData: Record<string, unknown> = { acaoRef: acao.acaoRef };
      if (acao.meta !== undefined) acaoData['meta'] = acao.meta;
      batch.set(desafioRef.collection('acoes').doc(acao.acaoRef), acaoData);
    }
    await batch.commit();
  }

  // Agregado ∑ do clube pela MESMA rotina da Function — nunca chumbado
  await recontarDesafiosAtivos(db, CLUBE_CPS_SLUG);

  console.log(
    `[seed] desafios: ${DESAFIOS_SEED.length} desafios canônicos ` +
      `(${QTD_DESAFIOS_ATIVOS_SEED} ativos) no clube ${CLUBE_CPS_SLUG}`
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
  seedDesafios(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
