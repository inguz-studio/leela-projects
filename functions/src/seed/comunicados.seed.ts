// =============================================================================
// functions/src/seed/comunicados.seed.ts
//
// Seed dos 7 comunicados canônicos do clube Corrida Perfeita Sul
// (LEELA-S108-T1 — HANDOFF-05 §"7 Comunicados mock").
// NÃO executar em produção (guard assertEmulatorOnly local).
//
// Distribuição real do HANDOFF: 3 enviados · 3 agendados (2 + 1 trigger de
// novo membro) · 1 rascunho. (Os cabeçalhos do HANDOFF dizem "4 enviados",
// mas listam 3 — seguimos a LISTA, que é a fonte dos slugs canônicos usados
// pelas telas S108-T2/S109-T2.)
//
// Enviados ficam há 12d/7d/12d no passado — FORA da janela deslizante de
// 7 dias do RN-133: o seed não consome cota de push do clube canônico.
// Campos de Function (status='enviado', enviadoEm, alcance, aberturasPct)
// são escritos via Admin SDK — mesmo caminho privilegiado da Function de
// envio (cliente segue bloqueado pelas Rules).
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type {
  CanalComunicado,
  OrigemComunicado,
  Segmento,
  StatusComunicado,
} from '@leela/core';
import {
  CLUBE_CPS_SLUG,
  CORRIDA_PERFEITA_TENANT_ID,
  seedClubes,
} from './clubes.seed';

/** Totais canônicos (para teste) */
export const TOTAL_COMUNICADOS_SEED = 7;
export const COMUNICADOS_ENVIADOS_SEED = 3;
export const COMUNICADOS_AGENDADOS_SEED = 3;
export const COMUNICADOS_RASCUNHO_SEED = 1;

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Guard anti-produção (padrão F5 — review S1600): seed SÓ roda no Emulator.
 */
function assertEmulatorOnly(): void {
  const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
  const projectId =
    process.env['GCLOUD_PROJECT'] ?? process.env['GOOGLE_CLOUD_PROJECT'] ?? '';

  if (!emulatorHost && !projectId.startsWith('demo-')) {
    throw new Error(
      '[seed] BLOQUEADO: seedComunicados só roda no Emulator. ' +
        'Defina FIRESTORE_EMULATOR_HOST (ou use um projectId demo-*). ' +
        'NUNCA execute este seed contra produção.'
    );
  }
}

interface ComunicadoSeedSpec {
  id: string;
  titulo: string;
  conteudo: string;
  canal: CanalComunicado[];
  origem: OrigemComunicado;
  status: StatusComunicado;
  segmento: Segmento;
  /** Dias atrás do envio (status enviado) */
  enviadoDiasAtras?: number;
  /** Dias no futuro do disparo (status agendado) */
  agendadoDiasFrente?: number;
  alcance?: number;
  aberturasPct?: number;
}

/** Specs canônicas — HANDOFF-05. */
const COMUNICADOS_SEED: readonly ComunicadoSeedSpec[] = [
  {
    id: 'parceria-acate-treino',
    titulo: 'Parceria ACATE Run Club: treino conjunto na Lagoa · domingo 8h',
    conteudo:
      'Membros do Corrida Perfeita Sul e do ACATE Run Club treinam juntos ' +
      'este domingo. Encontro às 8h na Lagoa da Conceição. Traga seu tênis ' +
      'e disposição — conversa e networking garantidos depois.',
    canal: ['push', 'email'],
    origem: 'manual',
    status: 'enviado',
    segmento: {
      tipo: 'por_desafio',
      referencia: 'marcha-mental',
      tamanhoEstimado: 31,
    },
    enviadoDiasAtras: 12,
    alcance: 31,
    aberturasPct: 71,
  },
  {
    id: 'proximos-desafios',
    titulo: 'Próximos desafios do trimestre',
    conteudo:
      'Preparação Meia Floripa até 26 Abr, Morro da Cruz 30 dias em Abril, ' +
      'Marcha Mental em Março. Cada um com seu mix de pilares. Confira no ' +
      'painel de Desafios e escolha seu foco deste trimestre.',
    canal: ['email'],
    origem: 'manual',
    status: 'enviado',
    segmento: { tipo: 'todos', tamanhoEstimado: 120 },
    enviadoDiasAtras: 7,
    alcance: 120,
    aberturasPct: 54,
  },
  {
    id: 'cupom-amigos',
    titulo: 'Cupom para amigos · AMIGOCPS',
    conteudo:
      'Convide um amigo! Use o cupom AMIGOCPS na inscrição da Meia Floripa ' +
      '2026 e seu amigo ganha −10% no valor. Parceria do clube com a ' +
      'Castelo Produções. Oferta limitada a 50 usos.',
    canal: ['push'],
    origem: 'manual',
    status: 'enviado',
    segmento: { tipo: 'todos', tamanhoEstimado: 120 },
    enviadoDiasAtras: 12,
    alcance: 120,
    aberturasPct: 58,
  },
  {
    id: 'sessao-mobilidade',
    titulo: 'Lembrete · Sessão de mobilidade no sábado 7h',
    conteudo:
      'Bom dia, galera! Este sábado tem sessão de mobilidade e aquecimento ' +
      'funcional na Lagoa. Encontro às 7h em frente ao Posto da Lagoa. ' +
      'Traga esteira ou toalha.',
    canal: ['push'],
    origem: 'automatizada',
    status: 'agendado',
    segmento: { tipo: 'todos', tamanhoEstimado: 120 },
    agendadoDiasFrente: 1,
  },
  {
    id: 'boas-vindas-helena',
    titulo: 'Boas-vindas, Helena!',
    conteudo:
      'Oi Helena! Bem-vinda ao Corrida Perfeita Sul. Esta é sua jornada ' +
      'para uma corrida mais feliz e saudável. Comece explorando os ' +
      'desafios ativos em sua aba de Desafios.',
    canal: ['push'],
    origem: 'automatizada',
    status: 'agendado',
    segmento: {
      tipo: 'por_engajamento',
      referencia: 'novo_membro',
      tamanhoEstimado: 1,
    },
    agendadoDiasFrente: 0, // hoje · 18:00
  },
  {
    id: 'alerta-kit-retirada',
    titulo: 'Alerta · kit pronto para retirada',
    conteudo:
      'Seu kit da Meia Maratona Floripa 2026 está disponível para ' +
      'retirada! Horários: 23 a 26 Abr, 10h às 20h, Academia Athletico ' +
      'Beira-Mar. Não esqueça: RG + comprovante de inscrição.',
    canal: ['push', 'email'],
    origem: 'automatizada',
    status: 'agendado',
    segmento: {
      tipo: 'por_desafio',
      referencia: 'preparacao-meia-floripa',
      tamanhoEstimado: 48,
    },
    agendadoDiasFrente: 3,
  },
  {
    id: 'dica-ritmo-longa',
    titulo: 'Dica da semana: como ajustar o ritmo na longa',
    conteudo:
      'Ao treinar para a meia, o ritmo da longa não é o ritmo de prova. ' +
      'É ritmo confortável, que permite conversar. [em desenvolvimento — ' +
      'adicionar dicas de Camila e André]',
    canal: ['email'],
    origem: 'manual',
    status: 'rascunho',
    segmento: {
      tipo: 'por_desafio',
      referencia: 'preparacao-meia-floripa',
      tamanhoEstimado: 48,
    },
  },
];

/**
 * Popula os 7 comunicados canônicos no clube CPS (Emulator).
 * Idempotente: docIds fixos; datas relativas a `agora` regravadas em rerun
 * (mantêm a fotografia canônica "há Nd / em Nd").
 */
export async function seedComunicados(
  db: admin.firestore.Firestore,
  agora: Date = new Date()
): Promise<void> {
  assertEmulatorOnly();

  await seedClubes(db); // pré-requisito: clube canônico + tenant ativo

  const now = FieldValue.serverTimestamp();
  const comunicadosRef = db
    .collection('clubes')
    .doc(CLUBE_CPS_SLUG)
    .collection('comunicados');

  for (const spec of COMUNICADOS_SEED) {
    const ref = comunicadosRef.doc(spec.id);
    const snap = await ref.get();

    const data: Record<string, unknown> = {
      id: spec.id,
      tenantId: CORRIDA_PERFEITA_TENANT_ID,
      titulo: spec.titulo,
      conteudo: spec.conteudo,
      canal: spec.canal,
      origem: spec.origem,
      status: spec.status,
      segmento: spec.segmento,
      alcance: spec.alcance ?? 0,
      atualizadoEm: now,
    };
    if (spec.enviadoDiasAtras !== undefined) {
      data['enviadoEm'] = Timestamp.fromDate(
        new Date(agora.getTime() - spec.enviadoDiasAtras * DIA_MS)
      );
    }
    if (spec.agendadoDiasFrente !== undefined) {
      data['agendadoPara'] = Timestamp.fromDate(
        new Date(agora.getTime() + spec.agendadoDiasFrente * DIA_MS)
      );
    }
    if (spec.aberturasPct !== undefined) {
      data['aberturasPct'] = spec.aberturasPct;
    }
    if (!snap.exists) data['criadoEm'] = now;

    await ref.set(data, { merge: true });
  }

  console.log(
    `[seed] comunicados: ${TOTAL_COMUNICADOS_SEED} comunicados canônicos ` +
      `(${COMUNICADOS_ENVIADOS_SEED} enviados · ${COMUNICADOS_AGENDADOS_SEED} ` +
      `agendados · ${COMUNICADOS_RASCUNHO_SEED} rascunho) no clube ${CLUBE_CPS_SLUG}`
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
  seedComunicados(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
