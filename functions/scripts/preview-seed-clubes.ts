// =============================================================================
// functions/scripts/preview-seed-clubes.ts — dados de CLUBES + satélites do
// PREVIEW LOCAL, no tenant da Marina (Castelo Produções) — LOTE LEELA-R8-SEED.
//
// Por que este arquivo existe: o login default do preview é
// `marina@demo-leela.dev` (tenant `castelo-producoes`). O único clube semeado
// pelos seeds canônicos vive no tenant `corrida-perfeita` (Felipe) — então a
// área /clubes da Marina nascia VAZIA, e várias áreas satélites do sistema web
// (campanhas do evento, fila de reembolsos, repasses, log de comunicação,
// estoque/aprovisionamento, assessorias E18) não tinham NENHUM dado. Este seed
// enche esses buracos SÓ onde estão vazios, respeitando os shapes canônicos e
// os invariantes (agregados ∑ pelas MESMAS rotinas das Functions; máquinas de
// estado válidas; tenantId coerente — ADR-009).
//
// ADITIVO e IDEMPOTENTE: docIds fixos + set/merge; `criadoEm` só na criação;
// agregados via recontagem (recontarMembrosAtivos/recontarDesafiosAtivos/
// registrarConversao/recomputarSaldoRepasse) — nunca chumbados. Emulator-only.
//
// Fora de functions/src de propósito (infra de preview): não entra em
// build/deploy/type-check/vitest de produção. Roda via tsx.
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { derivarStatus } from '@leela/core';

import { assertEmulatorOnly } from '../src/seed/emulator-guard';
import { CASTELO_TENANT_ID, MARINA_CASTELO_UID } from '../src/seed/tenants.seed';
import { MEIA_FLORIPA_ID } from '../src/seed/eventos.seed';
import { recontarMembrosAtivos } from '../src/clubs/membrosAggregates';
import { recontarDesafiosAtivos } from '../src/clubs/desafiosAggregates';
import { registrarConversao } from '../src/clubs/onConversao';
import { recomputarSaldoRepasse } from '../src/finance/updateSaldoRepasse';

type Db = admin.firestore.Firestore;

const DIA_MS = 24 * 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

const ts = (d: Date): Timestamp => Timestamp.fromDate(d);

/** set(merge) preservando criadoEm existente (padrão F8 dos seeds). */
async function upsert(
  ref: admin.firestore.DocumentReference,
  data: Record<string, unknown>,
  criadoEm?: Timestamp
): Promise<void> {
  const snap = await ref.get();
  const payload: Record<string, unknown> = {
    ...data,
    atualizadoEm: FieldValue.serverTimestamp(),
  };
  if (!snap.exists) {
    payload['criadoEm'] = criadoEm ?? FieldValue.serverTimestamp();
  }
  await ref.set(payload, { merge: true });
}

// IDs canônicos deste seed (fixos → idempotência)
const CLUBE_A_SLUG = 'floripa-run-coletivo';
const ASSESSORIA_CLUBE_SLUG = 'ritmo-forte-assessoria';
const ASSESSORIA_UID = 'uid-ritmo-forte';
const ASSESSORIA_DOC = '51888000000199'; // CNPJ fictício (14 dígitos) = docId

// ---------------------------------------------------------------------------
// 1. Clube A — "Floripa Run Coletivo" (ativo, do tenant da Marina)
// ---------------------------------------------------------------------------

interface MembroSpec {
  id: string;
  atletaNome: string;
  papel: 'owner' | 'admin' | 'membro';
  entrouVia: 'link' | 'codigo' | 'convite';
  entrouDiasAtras: number;
  ultimaAtividadeDiasAtras: number | null;
}

// 14 membros, cobrindo os 3 status da RN-102 (novo < 7d · inativo ≥ 30d de
// última atividade · resto ativo). Nomes BR fictícios, sem PII real.
const CLUBE_A_MEMBROS: readonly MembroSpec[] = [
  { id: 'membro-marina-castelo', atletaNome: 'Marina Castelo', papel: 'owner', entrouVia: 'link', entrouDiasAtras: 720, ultimaAtividadeDiasAtras: 1 },
  { id: 'membro-eduardo-nunes', atletaNome: 'Eduardo Nunes', papel: 'admin', entrouVia: 'convite', entrouDiasAtras: 400, ultimaAtividadeDiasAtras: 2 },
  { id: 'membro-priscila-amaral', atletaNome: 'Priscila Amaral', papel: 'admin', entrouVia: 'convite', entrouDiasAtras: 300, ultimaAtividadeDiasAtras: 4 },
  { id: 'membro-thiago-berto', atletaNome: 'Thiago Berto', papel: 'membro', entrouVia: 'codigo', entrouDiasAtras: 180, ultimaAtividadeDiasAtras: 3 },
  { id: 'membro-larissa-couto', atletaNome: 'Larissa Couto', papel: 'membro', entrouVia: 'codigo', entrouDiasAtras: 150, ultimaAtividadeDiasAtras: 6 },
  { id: 'membro-rodrigo-pena', atletaNome: 'Rodrigo Pena', papel: 'membro', entrouVia: 'link', entrouDiasAtras: 120, ultimaAtividadeDiasAtras: 8 },
  { id: 'membro-bianca-rosa', atletaNome: 'Bianca Rosa', papel: 'membro', entrouVia: 'codigo', entrouDiasAtras: 95, ultimaAtividadeDiasAtras: 5 },
  { id: 'membro-gabriel-lins', atletaNome: 'Gabriel Lins', papel: 'membro', entrouVia: 'convite', entrouDiasAtras: 80, ultimaAtividadeDiasAtras: 12 },
  { id: 'membro-natalia-fraga', atletaNome: 'Natália Fraga', papel: 'membro', entrouVia: 'codigo', entrouDiasAtras: 60, ultimaAtividadeDiasAtras: 9 },
  { id: 'membro-vinicius-arruda', atletaNome: 'Vinícius Arruda', papel: 'membro', entrouVia: 'link', entrouDiasAtras: 45, ultimaAtividadeDiasAtras: 15 },
  { id: 'membro-carolina-viana', atletaNome: 'Carolina Viana', papel: 'membro', entrouVia: 'codigo', entrouDiasAtras: 30, ultimaAtividadeDiasAtras: 7 },
  { id: 'membro-felipe-drumond', atletaNome: 'Felipe Drumond', papel: 'membro', entrouVia: 'convite', entrouDiasAtras: 20, ultimaAtividadeDiasAtras: 18 },
  { id: 'membro-sabrina-mota', atletaNome: 'Sabrina Mota', papel: 'membro', entrouVia: 'link', entrouDiasAtras: 3, ultimaAtividadeDiasAtras: null }, // novo
  { id: 'membro-anderson-goes', atletaNome: 'Anderson Góes', papel: 'membro', entrouVia: 'codigo', entrouDiasAtras: 200, ultimaAtividadeDiasAtras: 55 }, // inativo
];

async function seedMembrosDoClube(
  db: Db,
  clubeSlug: string,
  membros: readonly MembroSpec[],
  agora: Date
): Promise<void> {
  const col = db.collection('clubes').doc(clubeSlug).collection('membros');
  for (const m of membros) {
    const ref = col.doc(m.id);
    const snap = await ref.get();
    let entrouEm: Date;
    let ultimaAtividadeEm: Date | null;
    if (snap.exists) {
      entrouEm = (snap.get('entrouEm') as Timestamp).toDate();
      const ua = snap.get('ultimaAtividadeEm') as Timestamp | undefined;
      ultimaAtividadeEm = ua ? ua.toDate() : null;
    } else {
      entrouEm = new Date(agora.getTime() - m.entrouDiasAtras * DIA_MS);
      ultimaAtividadeEm =
        m.ultimaAtividadeDiasAtras === null
          ? null
          : new Date(agora.getTime() - m.ultimaAtividadeDiasAtras * DIA_MS);
    }
    const data: Record<string, unknown> = {
      id: m.id,
      tenantId: CASTELO_TENANT_ID,
      atletaId: `uid-${m.id.replace('membro-', '')}`,
      atletaNome: m.atletaNome,
      papel: m.papel,
      entrouVia: m.entrouVia,
      entrouEm: ts(entrouEm),
      status: derivarStatus(entrouEm, ultimaAtividadeEm, agora),
    };
    if (ultimaAtividadeEm) data['ultimaAtividadeEm'] = ts(ultimaAtividadeEm);
    await ref.set(data, { merge: true });
  }
  await recontarMembrosAtivos(db, clubeSlug);
}

interface DesafioSpec {
  id: string;
  nome: string;
  descricao: string;
  modelo: 'A' | 'B' | 'C';
  dataInicioISO: string;
  dataFimISO: string;
  status: 'rascunho' | 'ativo' | 'encerrado';
  metaTotalPontos?: number;
  minimoPorPilar?: Record<string, number>;
  recompensaTipo: 'medalha_digital' | 'cupom' | 'medalha_fisica' | 'custom';
  visibilidade: 'membros' | 'convite' | 'publico';
  qtdParticipantes: number;
  progressoPct: number;
  progressoPorPilar?: Record<string, { atual: number; meta: number }>;
  eventoVinculadoId?: string;
  acoes: readonly { acaoRef: string; meta?: number }[];
}

// 2 desafios ATIVOS com board consistente (progressoPorPilar coerente com a
// meta) — um Modelo C atrelado à Meia Floripa, um Modelo A de subida.
const CLUBE_A_DESAFIOS: readonly DesafioSpec[] = [
  {
    id: 'rumo-meia-floripa',
    nome: 'Rumo à Meia Floripa 2026',
    descricao:
      '8 semanas de base equilibrada para a Meia Maratona Floripa 2026: ' +
      'volume, força e cabeça no lugar.',
    modelo: 'C',
    dataInicioISO: '2026-03-01T00:00:00-03:00',
    dataFimISO: '2026-04-26T23:59:59-03:00',
    status: 'ativo',
    metaTotalPontos: 1800,
    minimoPorPilar: { fisico: 300, mental: 250, espiritual: 200 },
    recompensaTipo: 'cupom',
    visibilidade: 'membros',
    qtdParticipantes: 34,
    progressoPct: 58,
    progressoPorPilar: {
      fisico: { atual: 430, meta: 700 },
      mental: { atual: 300, meta: 550 },
      espiritual: { atual: 210, meta: 550 },
    },
    eventoVinculadoId: MEIA_FLORIPA_ID,
    acoes: [
      { acaoRef: 'correr', meta: 80 },
      { acaoRef: 'pedalar', meta: 60 },
      { acaoRef: 'musculacao', meta: 24 },
      { acaoRef: 'dormir-7h', meta: 56 },
      { acaoRef: 'meditar', meta: 240 },
      { acaoRef: 'ler', meta: 200 },
    ],
  },
  {
    id: 'subidas-do-morro',
    nome: 'Subidas do Morro da Cruz',
    descricao: 'Suba o Morro da Cruz 12 vezes no mês — ganho de força e fôlego.',
    modelo: 'A',
    dataInicioISO: '2026-04-01T00:00:00-03:00',
    dataFimISO: '2026-04-30T23:59:59-03:00',
    status: 'ativo',
    recompensaTipo: 'medalha_digital',
    visibilidade: 'membros',
    qtdParticipantes: 19,
    progressoPct: 41,
    acoes: [{ acaoRef: 'caminhar', meta: 12 }],
  },
];

async function seedDesafiosDoClube(
  db: Db,
  clubeSlug: string,
  desafios: readonly DesafioSpec[]
): Promise<void> {
  const clubeRef = db.collection('clubes').doc(clubeSlug);
  const now = FieldValue.serverTimestamp();
  for (const d of desafios) {
    const ref = clubeRef.collection('desafios').doc(d.id);
    const snap = await ref.get();
    const data: Record<string, unknown> = {
      id: d.id,
      tenantId: CASTELO_TENANT_ID,
      autorId: MARINA_CASTELO_UID,
      nome: d.nome,
      descricao: d.descricao,
      modelo: d.modelo,
      dataInicio: ts(new Date(d.dataInicioISO)),
      dataFim: ts(new Date(d.dataFimISO)),
      status: d.status,
      recompensaTipo: d.recompensaTipo,
      visibilidade: d.visibilidade,
      qtdParticipantes: d.qtdParticipantes,
      progressoPct: d.progressoPct,
      atualizadoEm: now,
    };
    if (d.metaTotalPontos !== undefined) data['metaTotalPontos'] = d.metaTotalPontos;
    if (d.minimoPorPilar) data['minimoPorPilar'] = d.minimoPorPilar;
    if (d.progressoPorPilar) data['progressoPorPilar'] = d.progressoPorPilar;
    if (d.eventoVinculadoId) data['eventoVinculadoId'] = d.eventoVinculadoId;
    if (!snap.exists) data['criadoEm'] = now;
    await ref.set(data, { merge: true });

    const batch = db.batch();
    for (const a of d.acoes) {
      const acaoData: Record<string, unknown> = { acaoRef: a.acaoRef };
      if (a.meta !== undefined) acaoData['meta'] = a.meta;
      batch.set(ref.collection('acoes').doc(a.acaoRef), acaoData);
    }
    await batch.commit();
  }
  await recontarDesafiosAtivos(db, clubeSlug);
}

interface ComunicadoSpec {
  id: string;
  titulo: string;
  conteudo: string;
  canal: ('push' | 'email')[];
  origem: 'manual' | 'automatizada';
  status: 'rascunho' | 'agendado' | 'enviado';
  segmento: { tipo: string; referencia?: string; tamanhoEstimado?: number };
  enviadoDiasAtras?: number;
  agendadoDiasFrente?: number;
  alcance?: number;
  aberturasPct?: number;
}

const CLUBE_A_COMUNICADOS: readonly ComunicadoSpec[] = [
  {
    id: 'treino-longo-domingo',
    titulo: 'Treino longo de domingo · 7h na Beira-Mar',
    conteudo:
      'Domingo tem longão! Encontro às 7h no início da Beira-Mar Norte. ' +
      'Leve gel e água. Fecha com café da manhã coletivo.',
    canal: ['push', 'email'],
    origem: 'manual',
    status: 'enviado',
    segmento: { tipo: 'todos', tamanhoEstimado: 14 },
    enviadoDiasAtras: 9,
    alcance: 14,
    aberturasPct: 79,
  },
  {
    id: 'inscricoes-meia-abertas',
    titulo: 'Inscrições da Meia Floripa 2026 abertas',
    conteudo:
      'A Meia Maratona Floripa 2026 já está com inscrições abertas e o ' +
      'clube tem cupom próprio. Fale com a coordenação para o código.',
    canal: ['email'],
    origem: 'manual',
    status: 'enviado',
    segmento: { tipo: 'por_desafio', referencia: 'rumo-meia-floripa', tamanhoEstimado: 34 },
    enviadoDiasAtras: 4,
    alcance: 34,
    aberturasPct: 66,
  },
  {
    id: 'dica-nutricao-rascunho',
    titulo: 'Dica de nutrição para a longa',
    conteudo:
      'Antes da longa, carboidrato leve e nada de novidade no estômago. ' +
      '[rascunho — completar com o roteiro da nutricionista parceira]',
    canal: ['email'],
    origem: 'manual',
    status: 'rascunho',
    segmento: { tipo: 'todos', tamanhoEstimado: 14 },
  },
];

async function seedComunicadosDoClube(
  db: Db,
  clubeSlug: string,
  comunicados: readonly ComunicadoSpec[],
  agora: Date
): Promise<void> {
  const col = db.collection('clubes').doc(clubeSlug).collection('comunicados');
  const now = FieldValue.serverTimestamp();
  for (const c of comunicados) {
    const ref = col.doc(c.id);
    const snap = await ref.get();
    const data: Record<string, unknown> = {
      id: c.id,
      tenantId: CASTELO_TENANT_ID,
      titulo: c.titulo,
      conteudo: c.conteudo,
      canal: c.canal,
      origem: c.origem,
      status: c.status,
      segmento: c.segmento,
      alcance: c.alcance ?? 0,
      atualizadoEm: now,
    };
    if (c.enviadoDiasAtras !== undefined) {
      data['enviadoEm'] = ts(new Date(agora.getTime() - c.enviadoDiasAtras * DIA_MS));
    }
    if (c.agendadoDiasFrente !== undefined) {
      data['agendadoPara'] = ts(new Date(agora.getTime() + c.agendadoDiasFrente * DIA_MS));
    }
    if (c.aberturasPct !== undefined) data['aberturasPct'] = c.aberturasPct;
    if (!snap.exists) data['criadoEm'] = now;
    await ref.set(data, { merge: true });
  }
}

async function seedParceriasDoClube(db: Db, clubeSlug: string, agora: Date): Promise<void> {
  const col = db.collection('clubes').doc(clubeSlug).collection('parcerias');

  // 1 parceria de evento afiliado ATIVA — recebe conversões atribuídas.
  const afiliadoId = 'parceria-meia-floripa-frc';
  await upsert(col.doc(afiliadoId), {
    id: afiliadoId,
    tenantId: CASTELO_TENANT_ID,
    tipo: 'evento_afiliado',
    status: 'ativa',
    eventoId: MEIA_FLORIPA_ID,
    eventoNome: 'Meia Maratona Floripa 2026',
    organizadorId: MARINA_CASTELO_UID,
    programaAfiliacaoRef: `eventos/${MEIA_FLORIPA_ID}/programaAfiliacao/atual`,
    comissaoPct: 8,
    cupom: 'FLORIPARUN10',
    linkMaster: 'beh.ro/mfl26?c=frc',
    janelaAtribuicaoDias: 7,
    termosEspelho: {
      criterioLiberacao: 'Após 28 Abr 2026',
      prazoRepasseDiasUteis: 10,
      tetoMensal: null,
    },
    conversoes: 0,
    valorAReceber: 0,
  });

  // Conversões atribuídas (dentro da janela de 7 dias) — idempotentes por
  // conversaoId; registrarConversao reconta ∑ conversoes/valorAReceber.
  const comissoes = [66, 66, 52.8, 66, 39.6, 66, 52.8, 66, 66, 52.8, 39.6, 66];
  for (let i = 0; i < comissoes.length; i++) {
    const convertidoEm = new Date(agora.getTime() - (i * 2 + 1) * DIA_MS);
    const clicadoEm = new Date(convertidoEm.getTime() - 2 * DIA_MS); // dentro dos 7d
    await registrarConversao(db, {
      clubId: clubeSlug,
      parceriaId: afiliadoId,
      conversaoId: `conv-frc-${String(i + 1).padStart(3, '0')}`,
      valorComissao: comissoes[i] as number,
      clicadoEm,
      convertidoEm,
    });
  }

  // 1 patrocinador ATIVO (financeiro).
  await upsert(col.doc('parceria-loja-runmais'), {
    id: 'parceria-loja-runmais',
    tenantId: CASTELO_TENANT_ID,
    tipo: 'patrocinador',
    status: 'ativa',
    nome: 'Run+ Store',
    modeloComercial: 'financeiro',
    valorAnual: 9600,
    contrapartida:
      'Logo nas camisetas do clube · 10% de desconto para membros na loja ' +
      'física · brinde nos treinos longos mensais',
  });

  console.log(`[seed-clubes] parcerias de ${clubeSlug}: 1 afiliada (12 conversões) + 1 patrocinador`);
}

async function seedClubeA(db: Db, agora: Date): Promise<void> {
  const clubeRef = db.collection('clubes').doc(CLUBE_A_SLUG);
  const snap = await clubeRef.get();
  const now = FieldValue.serverTimestamp();
  const data: Record<string, unknown> = {
    id: CLUBE_A_SLUG,
    tenantId: CASTELO_TENANT_ID,
    nome: 'Floripa Run Coletivo',
    descricao:
      'Clube de corrida de rua da Castelo Produções na Beira-Mar Norte. ' +
      'Treinos coletivos 3x/semana e preparação para as provas da casa.',
    slug: CLUBE_A_SLUG,
    categoria: 'Assessoria esportiva',
    modalidade: 'Corrida de rua',
    localizacao: { cidade: 'Florianópolis', estado: 'SC', online: false },
    ownerId: MARINA_CASTELO_UID,
    codigoConvite: 'FRC24',
    visibilidade: 'publica',
    aprovacaoManual: false,
    modeloEntrada: 'gratuito',
    atualizadoEm: now,
  };
  if (!snap.exists) {
    data['criadoEm'] = ts(new Date('2024-02-10T12:00:00-03:00'));
    data['qtdMembrosAtivos'] = 0;
    data['qtdDesafiosAtivos'] = 0;
  }
  await clubeRef.set(data, { merge: true });

  await seedMembrosDoClube(db, CLUBE_A_SLUG, CLUBE_A_MEMBROS, agora);
  await seedDesafiosDoClube(db, CLUBE_A_SLUG, CLUBE_A_DESAFIOS);
  await seedComunicadosDoClube(db, CLUBE_A_SLUG, CLUBE_A_COMUNICADOS, agora);
  await seedParceriasDoClube(db, CLUBE_A_SLUG, agora);

  console.log(
    `[seed-clubes] Clube A "${CLUBE_A_SLUG}": ${CLUBE_A_MEMBROS.length} membros · ` +
      `${CLUBE_A_DESAFIOS.length} desafios ativos · ${CLUBE_A_COMUNICADOS.length} comunicados`
  );
}

// ---------------------------------------------------------------------------
// 2. Assessoria parceira E18 (ativa) — parceirosAssessoria + clube-companheiro
//    + cupom com atribuição (escopo club_parceiro) + condição de desconto.
// ---------------------------------------------------------------------------

const CUPOM_ASSESSORIA_CODIGO = 'RITMOFORTE10';

async function seedAssessoriaE18(db: Db): Promise<void> {
  const parceriaRef = db
    .collection('tenants')
    .doc(CASTELO_TENANT_ID)
    .collection('parceirosAssessoria')
    .doc(ASSESSORIA_DOC);
  const clubeRef = db.collection('clubes').doc(ASSESSORIA_CLUBE_SLUG);
  const cupomRef = db
    .collection('eventos')
    .doc(MEIA_FLORIPA_ID)
    .collection('cupons')
    .doc(CUPOM_ASSESSORIA_CODIGO);
  const now = FieldValue.serverTimestamp();

  // Clube-companheiro da assessoria (RN-360: assessoria É um clube) — entra
  // na área /clubes da Marina como "clube parceiro" (ownerId ≠ Marina).
  {
    const snap = await clubeRef.get();
    const data: Record<string, unknown> = {
      id: ASSESSORIA_CLUBE_SLUG,
      tenantId: CASTELO_TENANT_ID,
      nome: 'Ritmo Forte Assessoria',
      descricao: 'Assessoria parceira da Castelo Produções em provas de rua.',
      slug: ASSESSORIA_CLUBE_SLUG,
      categoria: 'Assessoria esportiva',
      modalidade: 'Corrida de rua',
      localizacao: { cidade: 'São José', estado: 'SC', online: false },
      ownerId: ASSESSORIA_UID,
      codigoConvite: 'RF7Q2',
      visibilidade: 'privada',
      aprovacaoManual: false,
      modeloEntrada: 'gratuito',
      ehAssessoriaParceira: true,
      documentoMascarado: `***${ASSESSORIA_DOC.slice(-4)}`,
      parceiroDeTenant: CASTELO_TENANT_ID,
      atualizadoEm: now,
    };
    if (!snap.exists) {
      data['criadoEm'] = now;
      data['qtdMembrosAtivos'] = 0;
      data['qtdDesafiosAtivos'] = 0;
    }
    await clubeRef.set(data, { merge: true });
  }

  // Alguns membros no clube-companheiro para não nascer vazio.
  const membrosAssessoria: readonly MembroSpec[] = [
    { id: 'membro-ritmo-owner', atletaNome: 'Ricardo Ferraz', papel: 'owner', entrouVia: 'convite', entrouDiasAtras: 210, ultimaAtividadeDiasAtras: 1 },
    { id: 'membro-ritmo-ana', atletaNome: 'Ana Beatriz Mendes', papel: 'admin', entrouVia: 'convite', entrouDiasAtras: 120, ultimaAtividadeDiasAtras: 3 },
    { id: 'membro-ritmo-caio', atletaNome: 'Caio Bastos', papel: 'membro', entrouVia: 'codigo', entrouDiasAtras: 70, ultimaAtividadeDiasAtras: 6 },
    { id: 'membro-ritmo-julia', atletaNome: 'Júlia Rangel', papel: 'membro', entrouVia: 'link', entrouDiasAtras: 5, ultimaAtividadeDiasAtras: null },
  ];
  await seedMembrosDoClube(db, ASSESSORIA_CLUBE_SLUG, membrosAssessoria, new Date());

  // Cupom com ATRIBUIÇÃO ao clube parceiro (ADR-012) — fonte da verdade do
  // desconto; a condição na parceria é um espelho/refêrencia.
  {
    const snap = await cupomRef.get();
    const cupom: Record<string, unknown> = {
      id: CUPOM_ASSESSORIA_CODIGO,
      tenantId: CASTELO_TENANT_ID,
      codigo: CUPOM_ASSESSORIA_CODIGO,
      tipo: 'percentual',
      valor: 10,
      tetoUso: null,
      inicioEm: ts(new Date('2026-01-01T00:00:00-03:00')),
      fimEm: ts(new Date('2026-04-26T23:59:59-03:00')),
      escopo: 'club_parceiro',
      clubeRef: ASSESSORIA_CLUBE_SLUG,
      parceriaRef: parceriaRef.path,
      atualizadoEm: now,
    };
    if (!snap.exists) {
      cupom['usos'] = 0;
      cupom['criadoEm'] = now;
    }
    await cupomRef.set(cupom, { merge: true });
  }

  // Parceria de assessoria ATIVA (vínculo imediato) com condição de desconto.
  {
    const snap = await parceriaRef.get();
    const data: Record<string, unknown> = {
      id: ASSESSORIA_DOC,
      tenantId: CASTELO_TENANT_ID,
      nome: 'Ritmo Forte Assessoria',
      documento: { tipo: 'cnpj', valor: ASSESSORIA_DOC },
      clubeRef: ASSESSORIA_CLUBE_SLUG,
      responsavelEmail: 'ritmoforte@demo-leela.dev',
      responsavelUid: ASSESSORIA_UID,
      status: 'ativa',
      criadoPor: MARINA_CASTELO_UID,
      condicaoDesconto: {
        cupomRef: cupomRef.path,
        eventoId: MEIA_FLORIPA_ID,
        codigo: CUPOM_ASSESSORIA_CODIGO,
        tipo: 'percentual',
        valor: 10,
      },
      atualizadoEm: now,
    };
    if (!snap.exists) data['criadoEm'] = now;
    await parceriaRef.set(data, { merge: true });
  }

  console.log(
    `[seed-clubes] Assessoria E18 "${ASSESSORIA_CLUBE_SLUG}": parceria ativa + ` +
      `cupom ${CUPOM_ASSESSORIA_CODIGO} (club_parceiro) + condição de desconto`
  );
}

// ---------------------------------------------------------------------------
// 3. Campanhas do evento Meia Floripa — todos os estados incl. 'vencido' (D17)
// ---------------------------------------------------------------------------

interface CampanhaSpec {
  id: string;
  titulo: string;
  conteudo: string;
  canal: ('push' | 'email')[];
  origem: 'manual' | 'automatizada';
  status: 'rascunho' | 'agendado' | 'enviado' | 'vencido';
  segmento: { tipo: string; referencia?: string; tamanhoEstimado?: number };
  enviadoDiasAtras?: number;
  agendadoDiasFrente?: number;
  /** Para 'vencido': dias no PASSADO em que estava agendada (≥ 10min = vencida) */
  vencidaDiasAtras?: number;
  alcance?: number;
}

const CAMPANHAS_MEIA: readonly CampanhaSpec[] = [
  {
    id: 'kit-pronto-retirada',
    titulo: 'Alerta · kit pronto para retirada',
    conteudo:
      'Seu kit da Meia Maratona Floripa 2026 já pode ser retirado: 23 a 26 ' +
      'Abr, 10h às 20h, Academia Athletico Beira-Mar. Leve RG + comprovante.',
    canal: ['push', 'email'],
    origem: 'manual',
    status: 'enviado',
    segmento: { tipo: 'por_kit', referencia: 'kit_ouro', tamanhoEstimado: 48 },
    enviadoDiasAtras: 12,
    alcance: 48,
  },
  {
    id: 'cupom-amigos',
    titulo: 'Cupom para amigos · AMIGOMEIA',
    conteudo:
      'Convide um amigo! Com o cupom AMIGOMEIA a inscrição sai com −10%. ' +
      'Oferta limitada.',
    canal: ['email'],
    origem: 'manual',
    status: 'agendado',
    segmento: { tipo: 'todos_inscritos', tamanhoEstimado: 431 },
    agendadoDiasFrente: 3,
  },
  {
    id: 'boas-vindas-inscrito',
    titulo: 'Boas-vindas à Meia Floripa 2026!',
    conteudo:
      'Sua inscrição está confirmada. Em breve você recebe o cronograma de ' +
      'retirada de kit e as orientações de largada.',
    canal: ['push'],
    origem: 'automatizada',
    status: 'rascunho',
    segmento: { tipo: 'por_status', referencia: 'confirmado' },
  },
  {
    id: 'aviso-lote-final',
    titulo: 'Últimas 48h do lote atual',
    conteudo:
      'O lote atual da 21k encerra em 48h. Depois disso o valor sobe. ' +
      'Garanta sua vaga agora.',
    canal: ['push', 'email'],
    origem: 'manual',
    status: 'vencido',
    segmento: { tipo: 'por_modalidade', referencia: '21k', tamanhoEstimado: 120 },
    vencidaDiasAtras: 2, // agendada há 2 dias e nunca disparou → terminal 'vencido'
    alcance: 0,
  },
];

async function seedCampanhasMeia(db: Db, agora: Date): Promise<void> {
  const col = db.collection('eventos').doc(MEIA_FLORIPA_ID).collection('campanhas');
  const now = FieldValue.serverTimestamp();
  for (const c of CAMPANHAS_MEIA) {
    const ref = col.doc(c.id);
    const snap = await ref.get();
    const data: Record<string, unknown> = {
      id: c.id,
      tenantId: CASTELO_TENANT_ID,
      titulo: c.titulo,
      conteudo: c.conteudo,
      canal: c.canal,
      origem: c.origem,
      status: c.status,
      segmento: c.segmento,
      alcance: c.alcance ?? 0,
      atualizadoEm: now,
    };
    if (c.status === 'enviado' && c.enviadoDiasAtras !== undefined) {
      data['enviadoEm'] = ts(new Date(agora.getTime() - c.enviadoDiasAtras * DIA_MS));
    }
    if (c.status === 'agendado' && c.agendadoDiasFrente !== undefined) {
      data['agendadoPara'] = ts(new Date(agora.getTime() + c.agendadoDiasFrente * DIA_MS));
    }
    if (c.status === 'vencido' && c.vencidaDiasAtras !== undefined) {
      // 'vencido' exige agendadoPara (no passado) + vencidoEm; alcance 0; sem enviadoEm.
      const agendadoPara = new Date(agora.getTime() - c.vencidaDiasAtras * DIA_MS);
      data['agendadoPara'] = ts(agendadoPara);
      // detectada ~2 ciclos de cron após a janela (RN-136, tolerância 10min)
      data['vencidoEm'] = ts(new Date(agendadoPara.getTime() + 10 * MIN_MS));
    }
    if (!snap.exists) data['criadoEm'] = now;
    await ref.set(data, { merge: true });
  }
  console.log(
    `[seed-clubes] campanhas Meia Floripa: ${CAMPANHAS_MEIA.length} ` +
      '(1 enviada · 1 agendada · 1 rascunho automatizada · 1 VENCIDA — decisão 17)'
  );
}

// ---------------------------------------------------------------------------
// 4. Automações do evento Meia Floripa (gatilhos)
// ---------------------------------------------------------------------------

async function seedAutomacoesMeia(db: Db): Promise<void> {
  const col = db.collection('eventos').doc(MEIA_FLORIPA_ID).collection('automacoes');
  const now = FieldValue.serverTimestamp();
  const automacoes: readonly {
    id: string;
    gatilho: 'novo_inscrito' | 'kit_disponivel' | 'vespera_evento' | 'pos_evento';
    templateRef: string;
    canal: ('push' | 'email')[];
    ativa: boolean;
    offsetHoras?: number;
  }[] = [
    { id: 'auto-novo-inscrito', gatilho: 'novo_inscrito', templateRef: 'boas-vindas-inscrito', canal: ['email'], ativa: true },
    { id: 'auto-vespera', gatilho: 'vespera_evento', templateRef: 'boas-vindas-inscrito', canal: ['push'], ativa: false, offsetHoras: 24 },
  ];
  for (const a of automacoes) {
    const ref = col.doc(a.id);
    const snap = await ref.get();
    const data: Record<string, unknown> = {
      id: a.id,
      tenantId: CASTELO_TENANT_ID,
      gatilho: a.gatilho,
      templateRef: a.templateRef,
      canal: a.canal,
      ativa: a.ativa,
      atualizadoEm: now,
    };
    if (a.offsetHoras !== undefined) data['offsetHoras'] = a.offsetHoras;
    if (!snap.exists) {
      data['disparos'] = 0;
      data['criadoEm'] = now;
    }
    await ref.set(data, { merge: true });
  }
  console.log('[seed-clubes] automações Meia Floripa: 2 (novo_inscrito ativa · véspera pausada)');
}

// ---------------------------------------------------------------------------
// 5. Log de comunicação do evento (comunicacoes + comunicacoesResumo)
// ---------------------------------------------------------------------------

async function seedComunicacoesMeia(db: Db, agora: Date): Promise<void> {
  const eventoRef = db.collection('eventos').doc(MEIA_FLORIPA_ID);
  const col = eventoRef.collection('comunicacoes');

  interface LogSpec {
    ref: string;
    tipo: 'ingresso' | 'campanha' | 'transacional';
    chave: string;
    canal: 'push' | 'email';
    status: 'enfileirado' | 'enviado' | 'entregue' | 'aberto' | 'falhou';
    assunto: string;
    horasAtras: number;
  }
  const logs: readonly LogSpec[] = [
    { ref: 'insc-0001', tipo: 'campanha', chave: 'kit-pronto-retirada', canal: 'push', status: 'aberto', assunto: 'Kit pronto para retirada', horasAtras: 30 },
    { ref: 'insc-0002', tipo: 'campanha', chave: 'kit-pronto-retirada', canal: 'email', status: 'entregue', assunto: 'Kit pronto para retirada', horasAtras: 30 },
    { ref: 'insc-0003', tipo: 'ingresso', chave: 'ingresso', canal: 'email', status: 'enviado', assunto: 'Seu ingresso da Meia Floripa 2026', horasAtras: 20 },
    { ref: 'insc-0004', tipo: 'transacional', chave: 'confirmacao', canal: 'email', status: 'entregue', assunto: 'Inscrição confirmada', horasAtras: 48 },
    { ref: 'insc-0005', tipo: 'campanha', chave: 'kit-pronto-retirada', canal: 'push', status: 'falhou', assunto: 'Kit pronto para retirada', horasAtras: 30 },
    { ref: 'insc-0006', tipo: 'ingresso', chave: 'ingresso', canal: 'push', status: 'enfileirado', assunto: 'Seu ingresso da Meia Floripa 2026', horasAtras: 1 },
  ];

  const porStatus: Record<string, number> = { enfileirado: 0, enviado: 0, entregue: 0, aberto: 0, falhou: 0 };
  const porCanal: Record<string, number> = { push: 0, email: 0 };
  const porTipo: Record<string, number> = { ingresso: 0, campanha: 0, transacional: 0 };

  for (const l of logs) {
    const docId = `${l.ref}_${l.chave}_${l.canal}`;
    const enfileiradoEm = new Date(agora.getTime() - l.horasAtras * HORA_MS);
    const data: Record<string, unknown> = {
      id: docId,
      tenantId: CASTELO_TENANT_ID,
      eventoId: MEIA_FLORIPA_ID,
      destinatario: { tipo: 'inscrito', ref: l.ref },
      canal: l.canal,
      tipo: l.tipo,
      chave: l.chave,
      status: l.status,
      assunto: l.assunto,
      enfileiradoEm: ts(enfileiradoEm),
    };
    if (l.tipo === 'campanha') data['campanhaRef'] = l.chave;
    // Carimbos ↔ status (coerência exigida pelo parse)
    const enviadoEm = new Date(enfileiradoEm.getTime() + 2 * MIN_MS);
    if (['enviado', 'entregue', 'aberto'].includes(l.status)) data['enviadoEm'] = ts(enviadoEm);
    if (['entregue', 'aberto'].includes(l.status)) {
      data['entregueEm'] = ts(new Date(enviadoEm.getTime() + 3 * MIN_MS));
    }
    if (l.status === 'aberto') {
      data['abertoEm'] = ts(new Date(enviadoEm.getTime() + 30 * MIN_MS));
    }
    if (l.status === 'falhou') {
      data['falhouEm'] = ts(new Date(enfileiradoEm.getTime() + 2 * MIN_MS));
      data['falhaMotivo'] = 'push_token_invalido';
    }
    await col.doc(docId).set(data, { merge: true });

    porStatus[l.status] = (porStatus[l.status] ?? 0) + 1;
    porCanal[l.canal] = (porCanal[l.canal] ?? 0) + 1;
    porTipo[l.tipo] = (porTipo[l.tipo] ?? 0) + 1;
  }

  // Resumo agregado (todas as chaves de enum presentes — parse exige)
  await eventoRef.collection('comunicacoesResumo').doc('current').set(
    {
      tenantId: CASTELO_TENANT_ID,
      total: logs.length,
      porStatus,
      porCanal,
      porTipo,
      atualizadoEm: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`[seed-clubes] log de comunicação Meia Floripa: ${logs.length} eventos + resumo`);
}

// ---------------------------------------------------------------------------
// 6. Fila de reembolsos do evento (decidíveis) — eventos/{id}/reembolsos
// ---------------------------------------------------------------------------

async function seedReembolsosMeia(db: Db, agora: Date): Promise<void> {
  const col = db.collection('eventos').doc(MEIA_FLORIPA_ID).collection('reembolsos');
  const now = FieldValue.serverTimestamp();

  interface ReembolsoSpec {
    inscritoId: string;
    estado: 'em_analise' | 'aprovado' | 'recusado' | 'estornado';
    origem: 'organizador' | 'atleta';
    valor: number;
    motivo: string;
    diasAtras: number;
    motivoDecisao?: string;
    refundId?: string;
  }
  // 3 em_analise (decidíveis) + 1 estornado + 1 recusado.
  const specs: readonly ReembolsoSpec[] = [
    { inscritoId: 'insc-0007', estado: 'em_analise', origem: 'atleta', valor: 490, motivo: 'Lesão no joelho, não vou conseguir correr a prova.', diasAtras: 2 },
    { inscritoId: 'insc-0008', estado: 'em_analise', origem: 'atleta', valor: 250, motivo: 'Viagem de trabalho remarcada para a data da prova.', diasAtras: 1 },
    { inscritoId: 'insc-0009', estado: 'em_analise', origem: 'organizador', valor: 320, motivo: 'Inscrição duplicada — atleta pediu o estorno de uma delas.', diasAtras: 3 },
    { inscritoId: 'insc-0010', estado: 'estornado', origem: 'atleta', valor: 250, motivo: 'Desistência dentro do prazo de arrependimento.', diasAtras: 9, refundId: 'ref_demo_0010' },
    { inscritoId: 'insc-0011', estado: 'recusado', origem: 'atleta', valor: 490, motivo: 'Pedido fora da janela de reembolso.', diasAtras: 12, motivoDecisao: 'Solicitação após o corte de 48h da prova (RN-339).' },
  ];

  for (const s of specs) {
    const criadoEm = new Date(agora.getTime() - s.diasAtras * DIA_MS);
    const solicitadoRota = s.estado === 'em_analise' ? 'em_analise' : s.estado === 'recusado' ? 'em_analise' : s.estado === 'aprovado' ? 'em_analise' : 'aprovado_auto';
    const papelSolicitante = s.origem === 'organizador' ? 'tenant_owner' : 'atleta';
    const uidSolicitante = s.origem === 'organizador' ? MARINA_CASTELO_UID : `atleta-${s.inscritoId}`;
    const transicoes: Record<string, unknown>[] = [
      { de: 'solicitado', para: solicitadoRota, em: ts(criadoEm), por: uidSolicitante, papel: papelSolicitante },
    ];
    if (s.estado === 'estornado') {
      transicoes.push({ de: 'aprovado_auto', para: 'estornado', em: ts(new Date(criadoEm.getTime() + 6 * HORA_MS)), por: 'system', papel: 'system' });
    }
    if (s.estado === 'recusado') {
      transicoes.push({ de: 'em_analise', para: 'recusado', em: ts(new Date(criadoEm.getTime() + 12 * HORA_MS)), por: MARINA_CASTELO_UID, papel: 'tenant_owner' });
    }
    const data: Record<string, unknown> = {
      id: s.inscritoId,
      tenantId: CASTELO_TENANT_ID,
      eventoId: MEIA_FLORIPA_ID,
      pedidoId: `pedido-${s.inscritoId}`,
      inscritoId: s.inscritoId,
      motivo: s.motivo,
      estado: s.estado,
      origem: s.origem,
      valorSolicitado: s.valor,
      transicoes,
      criadoEm: ts(criadoEm),
      atualizadoEm: now,
    };
    if (s.estado === 'estornado') {
      data['valorEstornado'] = s.valor;
      if (s.refundId) data['refundId'] = s.refundId;
    }
    if (s.estado === 'recusado') {
      data['decididoPor'] = MARINA_CASTELO_UID;
      if (s.motivoDecisao) data['motivoDecisao'] = s.motivoDecisao;
    }
    await col.doc(s.inscritoId).set(data, { merge: true });
  }
  console.log('[seed-clubes] reembolsos Meia Floripa: 5 (3 em análise decidíveis · 1 estornado · 1 recusado)');
}

// ---------------------------------------------------------------------------
// 7. Repasses do tenant Castelo — dadosBancarios + repasses + saldo (recomputado)
// ---------------------------------------------------------------------------

async function seedRepassesCastelo(db: Db, agora: Date): Promise<void> {
  const tRef = db.collection('tenants').doc(CASTELO_TENANT_ID);

  // Dados bancários MASCARADOS (única versão legível pelo cliente — RN-354).
  await tRef.collection('dadosBancarios').doc('current').set(
    {
      tenantId: CASTELO_TENANT_ID,
      banco: '260 — Nu Pagamentos',
      agencia: '0001',
      contaMascarada: '****4417',
      tipo: 'corrente',
      pixMascarado: '***@castelo***.com',
      titular: 'Castelo Produções LTDA',
      cpfCnpjMascarado: '**.***.***/0001-**',
      atualizadoEm: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const snapshot = {
    tenantId: CASTELO_TENANT_ID,
    banco: '260 — Nu Pagamentos',
    agencia: '0001',
    contaMascarada: '****4417',
    tipo: 'corrente' as const,
    pixMascarado: '***@castelo***.com',
    titular: 'Castelo Produções LTDA',
    cpfCnpjMascarado: '**.***.***/0001-**',
  };

  interface RepasseSpec {
    id: string;
    eventoId?: string;
    valor: number;
    estado: 'solicitado' | 'aprovado' | 'pago';
    diasAtras: number;
    comprovanteNumero?: string;
  }
  const specs: readonly RepasseSpec[] = [
    { id: 'repasse-demo-0001', eventoId: MEIA_FLORIPA_ID, valor: 8200, estado: 'solicitado', diasAtras: 1 },
    { id: 'repasse-demo-0002', eventoId: 'desafio-mtb-costa-lagoa-2026', valor: 5400, estado: 'aprovado', diasAtras: 3 },
    { id: 'repasse-demo-0003', valor: 3100, estado: 'pago', diasAtras: 20, comprovanteNumero: 'REP-2026-0001' },
  ];

  const col = tRef.collection('repasses');
  for (const s of specs) {
    const criadoEm = new Date(agora.getTime() - s.diasAtras * DIA_MS);
    const transicoes: Record<string, unknown>[] = [
      { de: null, para: 'solicitado', em: ts(criadoEm), por: MARINA_CASTELO_UID, papel: 'tenant_owner' },
    ];
    if (s.estado === 'aprovado' || s.estado === 'pago') {
      transicoes.push({ de: 'solicitado', para: 'aprovado', em: ts(new Date(criadoEm.getTime() + 8 * HORA_MS)), por: 'uid-platform-admin', papel: 'platform_admin' });
    }
    if (s.estado === 'pago') {
      transicoes.push({ de: 'aprovado', para: 'pago', em: ts(new Date(criadoEm.getTime() + 30 * HORA_MS)), por: 'uid-platform-admin', papel: 'platform_admin' });
    }
    const data: Record<string, unknown> = {
      id: s.id,
      tenantId: CASTELO_TENANT_ID,
      valor: s.valor,
      estado: s.estado,
      dadosBancariosSnapshot: snapshot,
      transicoes,
      criadoEm: ts(criadoEm),
      atualizadoEm: FieldValue.serverTimestamp(),
    };
    if (s.eventoId !== undefined) data['eventoId'] = s.eventoId;
    if (s.comprovanteNumero !== undefined) data['comprovanteNumero'] = s.comprovanteNumero;
    await col.doc(s.id).set(data, { merge: true });
  }

  // Saldo consolidado pela MESMA rotina da Function (idempotente; a Function
  // onRepasseWrite também dispara e converge no mesmo valor).
  const saldo = await recomputarSaldoRepasse(db, CASTELO_TENANT_ID, agora);
  console.log(
    `[seed-clubes] repasses Castelo: 3 (solicitado · aprovado · pago) + saldo ` +
      `(disponível R$ ${saldo.disponivel} · comprometido R$ ${saldo.comprometido})`
  );
}

// ---------------------------------------------------------------------------
// 8. Estoque / aprovisionamento — SKU em alerta na Meia Floripa
// ---------------------------------------------------------------------------

async function seedEstoqueMeia(db: Db, agora: Date): Promise<void> {
  const col = db.collection('eventos').doc(MEIA_FLORIPA_ID).collection('aprovisionamento');

  // camiseta-tecnica é o único item tamanhado da Meia (P/M/G/GG). qtdVendida
  // casa com os confirmados reais por tamanho → coerente com o que o trigger
  // onInscritoWriteEstoque recomputaria (preserva estoqueFisico).
  interface SkuSpec {
    tamanho: string;
    qtdVendida: number;
    estoqueFisico: number;
    alerta: 'baixa' | 'esgotado';
  }
  const skus: readonly SkuSpec[] = [
    { tamanho: 'M', qtdVendida: 95, estoqueFisico: 100, alerta: 'baixa' }, // saldo 5 → baixa
    { tamanho: 'GG', qtdVendida: 95, estoqueFisico: 90, alerta: 'esgotado' }, // saldo -5 → esgotado
  ];
  for (const s of skus) {
    const id = `camiseta-tecnica__${s.tamanho}`;
    const aEncomendar = Math.max(0, s.qtdVendida - s.estoqueFisico);
    const data: Record<string, unknown> = {
      id,
      tenantId: CASTELO_TENANT_ID,
      itemId: 'camiseta-tecnica',
      tamanho: s.tamanho,
      estado: 'em_estoque',
      qtdVendida: s.qtdVendida,
      estoqueFisico: s.estoqueFisico,
      aEncomendar,
      alerta: s.alerta,
      historico: [
        { estado: 'encomendado', qtd: s.estoqueFisico, em: ts(new Date(agora.getTime() - 20 * DIA_MS)) },
        { estado: 'em_estoque', qtd: s.estoqueFisico, em: ts(new Date(agora.getTime() - 8 * DIA_MS)) },
      ],
      atualizadoEm: FieldValue.serverTimestamp(),
    };
    const snap = await col.doc(id).get();
    if (!snap.exists) data['criadoEm'] = FieldValue.serverTimestamp();
    await col.doc(id).set(data, { merge: true });
  }
  console.log('[seed-clubes] estoque Meia Floripa: 2 SKUs em alerta (camiseta M baixa · GG esgotado)');
}

// ---------------------------------------------------------------------------
// Orquestração
// ---------------------------------------------------------------------------

export async function seedPreviewClubes(
  db: Db,
  agora: Date = new Date()
): Promise<void> {
  assertEmulatorOnly('seedPreviewClubes');

  await seedClubeA(db, agora);
  await seedAssessoriaE18(db);
  await seedCampanhasMeia(db, agora);
  await seedAutomacoesMeia(db);
  await seedComunicacoesMeia(db, agora);
  await seedReembolsosMeia(db, agora);
  await seedRepassesCastelo(db, agora);
  await seedEstoqueMeia(db, agora);

  console.log('[seed-clubes] OK — clubes da Marina + satélites do sistema aplicados.');
}

// ---------------------------------------------------------------------------
// Entry point (execução direta contra o Emulator do preview)
// ---------------------------------------------------------------------------

if (require.main === module) {
  const fsHost = process.env['FIRESTORE_EMULATOR_HOST'];
  if (!fsHost) {
    console.error(
      '[seed-clubes] FIRESTORE_EMULATOR_HOST precisa estar definido ' +
        '(ex.: 127.0.0.1:8180 no preview). Abortando para nunca tocar produção.'
    );
    process.exit(1);
  }
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: process.env['GCLOUD_PROJECT'] ?? 'demo-leela' });
  }
  console.log(`[seed-clubes] Firestore → ${fsHost}`);
  seedPreviewClubes(admin.firestore())
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error('[seed-clubes] ERRO:', err);
      process.exit(1);
    });
}
