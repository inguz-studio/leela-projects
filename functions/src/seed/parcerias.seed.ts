// =============================================================================
// functions/src/seed/parcerias.seed.ts
//
// Seed das parcerias canônicas do clube Corrida Perfeita Sul
// (LEELA-S107-T1 — HANDOFF-05 §"Eventos promovidos" + §"3 Parceiros").
// NÃO executar em produção (guard assertEmulatorOnly local).
//
// 8 parcerias:
//   3 eventos afiliados ATIVOS  — Meia Floripa (10%), Trail Ratones (8%),
//                                 Corrida da Ponte (6%);
//   2 convites PENDENTES        — Maratona Floripa 2027 (12%),
//                                 Desafio Corporativo ACATE (5%);
//   3 patrocinadores ATIVOS     — ACATE (permuta), CDL Wellness
//                                 (financeiro R$ 12.000/ano), Secretaria de
//                                 Esportes (permuta).
//
// Campos 🔁 espelhados (comissaoPct/cupom/linkMaster/janela/termosEspelho)
// e ∑ (conversoes/valorAReceber) são escritos AQUI via Admin SDK — caminho
// privilegiado da Function (RN-120/122: o cliente nunca os escreve; Rules
// negam). Os ∑ canônicos do protótipo são display data: o fluxo real de
// conversão (registrarConversao) reconta a partir da subcoleção quando o
// checkout existir (E12) — rerun deste seed regrava os valores canônicos.
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { ModeloComercial, StatusParceria, TermosEspelho } from '@leela/core';
import {
  CLUBE_CPS_SLUG,
  CORRIDA_PERFEITA_TENANT_ID,
  seedClubes,
} from './clubes.seed';
import {
  PARCERIA_ACATE_ID,
  PARCERIA_CDL_ID,
  PARCERIA_SECRETARIA_ID,
} from './desafios.seed';
import { assertEmulatorOnly as guardEmulatorOnly } from './emulator-guard';

/** Totais canônicos (para teste) */
export const TOTAL_PARCERIAS_SEED = 8;
export const TOTAL_EVENTOS_AFILIADOS_SEED = 5; // 3 ativos + 2 convites
export const TOTAL_PATROCINADORES_SEED = 3;

/**
 * Guard anti-produção (padrão F5 — review S1600): seed SÓ roda no Emulator.
 */
function assertEmulatorOnly(): void {
  // Delegado ao guard COMPARTILHADO de emulator-guard.ts (mesmo contrato
  // F5 + escape nominal de producao da lane DEPLOY-PREVIEW). Antes: copia
  // local identica - consolidada para o escape valer em todos os seeds.
  guardEmulatorOnly('seedParcerias');
}

interface EventoAfiliadoSeedSpec {
  id: string;
  status: StatusParceria;
  eventoId: string;
  /** 🔁 Nome canônico do evento (CONS-4-T2 — HANDOFF-05 §Eventos promovidos) */
  eventoNome: string;
  organizadorId: string;
  comissaoPct: number;
  cupom: string | null;
  linkMaster: string;
  janelaAtribuicaoDias: number;
  termosEspelho: TermosEspelho;
  conversoes: number;
  valorAReceber: number;
}

interface PatrocinadorSeedSpec {
  id: string;
  status: StatusParceria;
  nome: string;
  modeloComercial: ModeloComercial;
  valorAnual?: number;
  contrapartida: string;
}

const EVENTOS_AFILIADOS_SEED: readonly EventoAfiliadoSeedSpec[] = [
  {
    id: 'parceria-meia-floripa-2026',
    status: 'ativa',
    eventoId: 'meia-floripa-2026',
    eventoNome: 'Meia Maratona Floripa 2026',
    organizadorId: 'uid-marina-castelo',
    comissaoPct: 10,
    cupom: 'CORRIDAPERFEITA10',
    linkMaster: 'beh.ro/mfl26?c=cps',
    janelaAtribuicaoDias: 7,
    termosEspelho: {
      criterioLiberacao: 'Após 28 Abr 2026',
      prazoRepasseDiasUteis: 10,
      tetoMensal: null, // sem limite
    },
    conversoes: 28,
    valorAReceber: 528,
  },
  {
    id: 'parceria-trail-ratones-2026',
    status: 'ativa',
    eventoId: 'trail-ratones-2026',
    eventoNome: 'Trail Run Ratones 2026',
    organizadorId: 'uid-ricardo-haro',
    comissaoPct: 8,
    cupom: 'CORRIDAPS15',
    linkMaster: 'beh.ro/ratones26?c=cps',
    janelaAtribuicaoDias: 7,
    termosEspelho: {
      criterioLiberacao: 'Após 15 Mai 2026',
      prazoRepasseDiasUteis: 10,
      tetoMensal: null,
    },
    conversoes: 12,
    valorAReceber: 432,
  },
  {
    id: 'parceria-corrida-ponte-2026',
    status: 'ativa',
    eventoId: 'corrida-ponte-2026',
    eventoNome: 'Corrida da Ponte 2026',
    organizadorId: 'uid-ligia-souza',
    comissaoPct: 6,
    cupom: null, // sem cupom exclusivo
    linkMaster: 'beh.ro/ponte26?c=cps',
    janelaAtribuicaoDias: 7,
    termosEspelho: {
      criterioLiberacao: 'Após 22 Jun 2026',
      prazoRepasseDiasUteis: 10,
      tetoMensal: null,
    },
    conversoes: 7,
    valorAReceber: 168,
  },
  {
    id: 'parceria-maratona-floripa-2027',
    status: 'convite_pendente',
    eventoId: 'maratona-floripa-2027',
    eventoNome: 'Maratona Floripa 2027',
    organizadorId: 'uid-marina-castelo',
    comissaoPct: 12,
    cupom: 'CORRIDAPERFEITA42',
    linkMaster: 'beh.ro/mar27?c=cps',
    janelaAtribuicaoDias: 7,
    termosEspelho: {
      criterioLiberacao: 'Após 25 Abr 2027',
      prazoRepasseDiasUteis: 10,
      tetoMensal: null,
    },
    conversoes: 0,
    valorAReceber: 0,
  },
  {
    id: 'parceria-acate-corporativo-2026',
    status: 'convite_pendente',
    eventoId: 'acate-corporativo-2026',
    eventoNome: 'Desafio Corporativo ACATE 2026',
    organizadorId: 'uid-comite-acate',
    comissaoPct: 5,
    cupom: 'CPSACATE',
    linkMaster: 'beh.ro/acate26?c=cps',
    janelaAtribuicaoDias: 7,
    termosEspelho: {
      criterioLiberacao: 'Após 14 Jun 2026',
      prazoRepasseDiasUteis: 10,
      tetoMensal: null,
    },
    conversoes: 0,
    valorAReceber: 0,
  },
];

const PATROCINADORES_SEED: readonly PatrocinadorSeedSpec[] = [
  {
    id: PARCERIA_ACATE_ID,
    status: 'ativa',
    nome: 'ACATE Run Club',
    modeloComercial: 'permuta',
    contrapartida:
      'Desafio Marcha Mental aberto a membros ACATE · co-branding em ' +
      'campanhas mentais',
  },
  {
    id: PARCERIA_CDL_ID,
    status: 'ativa',
    nome: 'CDL Wellness',
    modeloComercial: 'financeiro',
    valorAnual: 12000,
    contrapartida:
      'Logo em todos os desafios · 1 post mensal no app · presença em ' +
      'eventos do clube',
  },
  {
    id: PARCERIA_SECRETARIA_ID,
    status: 'ativa',
    nome: 'Secretaria de Esportes · Prefeitura de Florianópolis',
    modeloComercial: 'permuta',
    contrapartida:
      'Acesso gratuito a equipamentos públicos em janelas negociadas · ' +
      'clube realiza 2 eventos abertos à cidade por ano',
  },
];

/**
 * Popula as 8 parcerias canônicas no clube CPS (Emulator).
 * Idempotente: docIds fixos; rerun regrava specs (criadoEm preservado).
 */
export async function seedParcerias(
  db: admin.firestore.Firestore
): Promise<void> {
  assertEmulatorOnly();

  await seedClubes(db); // pré-requisito: clube canônico + tenant ativo

  const now = FieldValue.serverTimestamp();
  const parceriasRef = db
    .collection('clubes')
    .doc(CLUBE_CPS_SLUG)
    .collection('parcerias');

  for (const spec of EVENTOS_AFILIADOS_SEED) {
    const ref = parceriasRef.doc(spec.id);
    const snap = await ref.get();
    const data: Record<string, unknown> = {
      id: spec.id,
      tenantId: CORRIDA_PERFEITA_TENANT_ID,
      tipo: 'evento_afiliado',
      status: spec.status,
      eventoId: spec.eventoId,
      eventoNome: spec.eventoNome,
      organizadorId: spec.organizadorId,
      programaAfiliacaoRef: `eventos/${spec.eventoId}/programaAfiliacao/atual`,
      comissaoPct: spec.comissaoPct,
      cupom: spec.cupom,
      linkMaster: spec.linkMaster,
      janelaAtribuicaoDias: spec.janelaAtribuicaoDias,
      termosEspelho: spec.termosEspelho,
      conversoes: spec.conversoes,
      valorAReceber: spec.valorAReceber,
      atualizadoEm: now,
    };
    if (!snap.exists) data['criadoEm'] = now;
    await ref.set(data, { merge: true });
  }

  for (const spec of PATROCINADORES_SEED) {
    const ref = parceriasRef.doc(spec.id);
    const snap = await ref.get();
    const data: Record<string, unknown> = {
      id: spec.id,
      tenantId: CORRIDA_PERFEITA_TENANT_ID,
      tipo: 'patrocinador',
      status: spec.status,
      nome: spec.nome,
      modeloComercial: spec.modeloComercial,
      contrapartida: spec.contrapartida,
      atualizadoEm: now,
    };
    if (spec.valorAnual !== undefined) data['valorAnual'] = spec.valorAnual;
    if (!snap.exists) data['criadoEm'] = now;
    await ref.set(data, { merge: true });
  }

  console.log(
    `[seed] parcerias: ${TOTAL_PARCERIAS_SEED} parcerias canônicas ` +
      `(3 eventos ativos · 2 convites · 3 patrocinadores) no clube ${CLUBE_CPS_SLUG}`
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
  seedParcerias(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
