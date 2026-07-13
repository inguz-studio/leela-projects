// =============================================================================
// functions/src/seed/campanhas.seed.ts
//
// Seed das campanhas canônicas da Meia Maratona Floripa 2026
// (LEELA-S401-T1 · E06 — HANDOFF-05, comunicados ADAPTADOS ao evento).
// NÃO executar em produção (guard assertEmulatorOnly local).
//
// Distribuição canônica: 1 enviada ("kit pronto para retirada" → alcance 48)
// · 1 agendada ("Cupom para amigos · AMIGOCPS") · 1 rascunho ("Boas-vindas",
// origem automatizada — template para as Automações da Onda 3; a Function
// de gatilho foi CORTADA da V1, o doc é só conteúdo).
//
// A enviada fica 12d no passado — FORA da janela deslizante de 7 dias do
// RN-133: o seed não consome cota de push do evento canônico.
// Campos de Function (status='enviado', enviadoEm, alcance) são escritos
// via Admin SDK — mesmo caminho privilegiado da Function `enviarCampanha`
// (cliente segue bloqueado pelas Rules). SEM aberturasPct (corte 4).
// =============================================================================

/* eslint-disable no-console */

import type * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type {
  CanalCampanha,
  OrigemCampanha,
  SegmentoCampanha,
  StatusCampanha,
} from '@leela/core';
import { COLECAO_CAMPANHAS } from '@leela/core';
import { CASTELO_TENANT_ID } from './tenants.seed';
import { MEIA_FLORIPA_ID, seedEventos } from './eventos.seed';

/** Totais canônicos (para teste) */
export const TOTAL_CAMPANHAS_SEED = 3;
export const CAMPANHAS_ENVIADAS_SEED = 1;
export const CAMPANHAS_AGENDADAS_SEED = 1;
export const CAMPANHAS_RASCUNHO_SEED = 1;

/** Alcance canônico da campanha de kit (HANDOFF-05: "48 inscritos"). */
export const ALCANCE_KIT_PRONTO_SEED = 48;

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
      '[seed] BLOQUEADO: seedCampanhas só roda no Emulator. ' +
        'Defina FIRESTORE_EMULATOR_HOST (ou use um projectId demo-*). ' +
        'NUNCA execute este seed contra produção.'
    );
  }
}

interface CampanhaSeedSpec {
  id: string;
  titulo: string;
  conteudo: string;
  canal: CanalCampanha[];
  origem: OrigemCampanha;
  status: StatusCampanha;
  segmento: SegmentoCampanha;
  /** Dias atrás do envio (status enviado) */
  enviadoDiasAtras?: number;
  /** Dias no futuro do disparo (status agendado) */
  agendadoDiasFrente?: number;
  alcance?: number;
}

/** Specs canônicas — HANDOFF-05 adaptadas ao evento (E06/S401). */
const CAMPANHAS_SEED: readonly CampanhaSeedSpec[] = [
  {
    id: 'kit-pronto-retirada',
    titulo: 'Alerta · kit pronto para retirada',
    conteudo:
      'Seu kit da Meia Maratona Floripa 2026 está disponível para ' +
      'retirada! Horários: 23 a 26 Abr, 10h às 20h, Academia Athletico ' +
      'Beira-Mar. Não esqueça: RG + comprovante de inscrição.',
    canal: ['push', 'email'],
    origem: 'manual',
    status: 'enviado',
    segmento: {
      tipo: 'por_kit',
      referencia: 'kit_ouro',
      tamanhoEstimado: ALCANCE_KIT_PRONTO_SEED,
    },
    enviadoDiasAtras: 12, // fora da janela RN-133 — não consome cota
    alcance: ALCANCE_KIT_PRONTO_SEED,
  },
  {
    id: 'cupom-amigos',
    titulo: 'Cupom para amigos · AMIGOCPS',
    conteudo:
      'Convide um amigo! Use o cupom AMIGOCPS na inscrição da Meia Floripa ' +
      '2026 e seu amigo ganha −10% no valor. Oferta limitada a 50 usos.',
    canal: ['email'],
    origem: 'manual',
    status: 'agendado',
    segmento: { tipo: 'todos_inscritos', tamanhoEstimado: 425 },
    agendadoDiasFrente: 3,
  },
  {
    id: 'boas-vindas-inscrito',
    titulo: 'Boas-vindas à Meia Floripa 2026!',
    conteudo:
      'Sua inscrição está confirmada! Nos próximos dias você recebe o ' +
      'cronograma de retirada de kit e as orientações de largada. ' +
      '[template das Automações — gatilho novo_inscrito entra na Onda 3]',
    canal: ['push'],
    origem: 'automatizada',
    status: 'rascunho',
    segmento: { tipo: 'por_status', referencia: 'confirmado' },
  },
];

/**
 * Popula as 3 campanhas canônicas do evento Meia Floripa (Emulator).
 * Idempotente: docIds fixos; datas relativas a `agora` regravadas em rerun
 * (mantêm a fotografia canônica "há Nd / em Nd").
 */
export async function seedCampanhas(
  db: admin.firestore.Firestore,
  agora: Date = new Date()
): Promise<void> {
  assertEmulatorOnly();

  await seedEventos(db); // pré-requisito: evento canônico + tenant ativo

  const now = FieldValue.serverTimestamp();
  const campanhasRef = db
    .collection('eventos')
    .doc(MEIA_FLORIPA_ID)
    .collection(COLECAO_CAMPANHAS);

  for (const spec of CAMPANHAS_SEED) {
    const ref = campanhasRef.doc(spec.id);
    const snap = await ref.get();

    const data: Record<string, unknown> = {
      id: spec.id,
      tenantId: CASTELO_TENANT_ID,
      titulo: spec.titulo,
      conteudo: spec.conteudo,
      canal: spec.canal,
      origem: spec.origem,
      status: spec.status,
      segmento: spec.segmento,
      alcance: spec.alcance ?? 0,
      atualizadoEm: now,
    };
    if (!snap.exists) {
      data['criadoEm'] = now;
    }
    if (spec.status === 'enviado' && spec.enviadoDiasAtras !== undefined) {
      data['enviadoEm'] = Timestamp.fromDate(
        new Date(agora.getTime() - spec.enviadoDiasAtras * DIA_MS)
      );
    }
    if (spec.status === 'agendado' && spec.agendadoDiasFrente !== undefined) {
      data['agendadoPara'] = Timestamp.fromDate(
        new Date(agora.getTime() + spec.agendadoDiasFrente * DIA_MS)
      );
    }

    await ref.set(data, { merge: true });
  }

  console.log(
    `[seed] campanhas: ${TOTAL_CAMPANHAS_SEED} canônicas na Meia Floripa ` +
      `(${CAMPANHAS_ENVIADAS_SEED} enviada · ${CAMPANHAS_AGENDADAS_SEED} ` +
      `agendada · ${CAMPANHAS_RASCUNHO_SEED} rascunho)`
  );
}
