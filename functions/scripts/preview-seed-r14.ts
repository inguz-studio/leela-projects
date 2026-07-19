// =============================================================================
// functions/scripts/preview-seed-r14.ts — seed ADITIVO do lote R14-EVENTOS
//
// Objetivo (brief R14): a listagem pública `/` precisa mostrar eventos em
// ESTADOS DISTINTOS e simultâneos — inscrições abertas, esgotado e inscrições
// encerradas — sob o RELÓGIO REAL do preview (o :3200 do Vitor não usa
// LEELA_CLOCK). Os eventos extra pré-existentes têm janelas de lote FIXAS
// (dez/2025–abr/2026, desenhadas p/ LEELA_CLOCK=2026-03-15) e por isso derivam
// TODOS 'encerrado' hoje (jul/2026). Aqui adicionamos eventos NOVOS com janelas
// RELATIVAS ao `agora` real → cada estado aparece limpo, sem tocar nenhum doc
// existente (meia-floripa-2026 e os extras ficam intactos).
//
// Estados cobertos:
//   - ABERTO (lote 1 vigente)         → Corrida Raiz da Ilha / Desafio MTB Volta
//   - ABERTO (lote 2 vigente, L1 fim) → Meia Maratona da Serra (hand-off ADR-012)
//   - ESGOTADO (lote cobre agora, 100%)→ Night Run Neon
//   - ENCERRADO (janelas terminaram)  → Travessia da Costa
//
// Capas: NÃO seedamos `imagemUrl` — a landing resolve a capa mock rica app-side
// (lib/coverEvento.ts, decisão RN-153 do R7/R12). Escolha determinística pelo
// tema (nome) → cada evento mostra a capa coerente.
//
// Aditivo + idempotente: docIds fixos com prefixo `r14-`, set/merge, criadoEm só
// na criação. Emulator-only (guard por FIRESTORE_EMULATOR_HOST). Fora de
// functions/src → não entra em build/deploy/type-check de produção.
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';

import { CASTELO_TENANT_ID, MARINA_CASTELO_UID } from '../src/seed/tenants.seed';

type Db = admin.firestore.Firestore;

const DIA_MS = 24 * 60 * 60 * 1000;
const ts = (d: Date): admin.firestore.Timestamp =>
  admin.firestore.Timestamp.fromDate(d);

/** set(merge) preservando criadoEm existente (padrão dos seeds). */
async function upsert(
  ref: admin.firestore.DocumentReference,
  data: Record<string, unknown>,
): Promise<void> {
  const snap = await ref.get();
  const payload: Record<string, unknown> = {
    ...data,
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (!snap.exists) {
    payload['criadoEm'] = admin.firestore.FieldValue.serverTimestamp();
  }
  await ref.set(payload, { merge: true });
}

// ---------------------------------------------------------------------------
// Modelo do seed (janelas de lote em dias RELATIVOS a `agora`)
// ---------------------------------------------------------------------------

type EstadoEsperado = 'aberto' | 'esgotado' | 'encerrado';

interface LoteSpec {
  ordem: number;
  nome: string;
  /** Início/fim em dias relativos a `agora` (negativo = passado). */
  inicioDias: number;
  fimDias: number;
  quantidadeLimite: number;
  vendidos: number;
  /** Fator sobre o preço-base da modalidade. */
  fator: number;
}

interface EventoR14 {
  id: string;
  nome: string;
  local: string;
  modalidades: string[];
  modalidadeEsporte: string;
  usaChip: boolean;
  dataDias: number;
  capacidade: number;
  qtdInscritos: number;
  receitaConfirmada: number;
  /** Preço-base (lote 1) por modalidade — chave = modalidade exata. */
  precosBase: Record<string, number>;
  lotes: LoteSpec[];
  estadoEsperado: EstadoEsperado;
  seo: { titulo: string; descricao: string };
}

const EVENTOS_R14: readonly EventoR14[] = [
  {
    // ABERTO — lote 1 vigente com vagas
    id: 'r14-corrida-raiz-ilha-2026',
    nome: 'Corrida Raiz da Ilha 2026',
    local: 'Lagoa da Conceição, Florianópolis/SC',
    modalidades: ['5k', '10k'],
    modalidadeEsporte: 'Corrida de rua',
    usaChip: false,
    dataDias: 60,
    capacidade: 600,
    qtdInscritos: 120,
    receitaConfirmada: 8400,
    precosBase: { '5k': 55, '10k': 75 },
    lotes: [
      { ordem: 1, nome: 'Lote 1', inicioDias: -12, fimDias: 34, quantidadeLimite: 300, vendidos: 60, fator: 1 },
      { ordem: 2, nome: 'Lote 2', inicioDias: 34, fimDias: 58, quantidadeLimite: 300, vendidos: 0, fator: 1.3 },
    ],
    estadoEsperado: 'aberto',
    seo: {
      titulo: 'Corrida Raiz da Ilha 2026 — inscrições abertas',
      descricao: '5k e 10k na Lagoa da Conceição. Lote 1 promocional aberto.',
    },
  },
  {
    // ABERTO — lote 1 encerrado (esgotado + janela passada), lote 2 vigente
    id: 'r14-meia-serra-2026',
    nome: 'Meia Maratona da Serra 2026',
    local: 'Rancho Queimado/SC',
    modalidades: ['21k'],
    modalidadeEsporte: 'Corrida de rua',
    usaChip: true,
    dataDias: 75,
    capacidade: 400,
    qtdInscritos: 200,
    receitaConfirmada: 21600,
    precosBase: { '21k': 90 },
    lotes: [
      { ordem: 1, nome: 'Lote 1', inicioDias: -46, fimDias: -12, quantidadeLimite: 120, vendidos: 120, fator: 1 },
      { ordem: 2, nome: 'Lote 2', inicioDias: -12, fimDias: 50, quantidadeLimite: 250, vendidos: 80, fator: 1.25 },
    ],
    estadoEsperado: 'aberto',
    seo: {
      titulo: 'Meia Maratona da Serra 2026 — Lote 2 aberto',
      descricao: '21k na serra catarinense. Lote 1 esgotado; Lote 2 em vigência.',
    },
  },
  {
    // ABERTO — MTB, lote 1 vigente (variedade de capa)
    id: 'r14-mtb-volta-ilha-2026',
    nome: 'Desafio MTB Volta da Ilha 2026',
    local: 'Costa da Lagoa, Florianópolis/SC',
    modalidades: ['MTB 50km'],
    modalidadeEsporte: 'Mountain bike',
    usaChip: true,
    dataDias: 50,
    capacidade: 200,
    qtdInscritos: 40,
    receitaConfirmada: 4800,
    precosBase: { 'MTB 50km': 120 },
    lotes: [
      { ordem: 1, nome: 'Lote 1', inicioDias: -6, fimDias: 40, quantidadeLimite: 200, vendidos: 40, fator: 1 },
      { ordem: 2, nome: 'Lote 2', inicioDias: 40, fimDias: 48, quantidadeLimite: 200, vendidos: 0, fator: 1.35 },
    ],
    estadoEsperado: 'aberto',
    seo: {
      titulo: 'Desafio MTB Volta da Ilha 2026 — inscrições abertas',
      descricao: 'MTB 50km pela Costa da Lagoa. Lote 1 aberto, vagas limitadas.',
    },
  },
  {
    // ESGOTADO — lote único cobre agora, 100% vendido
    id: 'r14-night-run-neon-2026',
    nome: 'Night Run Neon Floripa 2026',
    local: 'Av. Beira-Mar Norte, Florianópolis/SC',
    modalidades: ['5k'],
    modalidadeEsporte: 'Corrida de rua',
    usaChip: true,
    dataDias: 30,
    capacidade: 150,
    qtdInscritos: 150,
    receitaConfirmada: 9000,
    precosBase: { '5k': 60 },
    lotes: [
      { ordem: 1, nome: 'Lote único', inicioDias: -15, fimDias: 25, quantidadeLimite: 150, vendidos: 150, fator: 1 },
    ],
    estadoEsperado: 'esgotado',
    seo: {
      titulo: 'Night Run Neon Floripa 2026 — esgotado',
      descricao: '5k noturno na Beira-Mar. Vagas esgotadas.',
    },
  },
  {
    // ENCERRADO — evento futuro, porém venda fechada (janela do lote terminou)
    id: 'r14-travessia-costa-2026',
    nome: 'Travessia da Costa 2026',
    local: 'Costa da Lagoa, Florianópolis/SC',
    modalidades: ['12k'],
    modalidadeEsporte: 'Trail run',
    usaChip: false,
    dataDias: 18,
    capacidade: 200,
    qtdInscritos: 130,
    receitaConfirmada: 9100,
    precosBase: { '12k': 70 },
    lotes: [
      { ordem: 1, nome: 'Lote único', inicioDias: -40, fimDias: -3, quantidadeLimite: 200, vendidos: 130, fator: 1 },
    ],
    estadoEsperado: 'encerrado',
    seo: {
      titulo: 'Travessia da Costa 2026 — inscrições encerradas',
      descricao: '12k de trail pela Costa da Lagoa. Inscrições encerradas.',
    },
  },
];

/** loteId determinístico e seguro p/ docId (modalidade com espaço → hífen). */
function loteId(modalidade: string, ordem: number): string {
  const slug = modalidade.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug}-lote-${ordem}`;
}

/** Seções da paginaVendas (só as com dado real neste seed). */
const SECOES: readonly { id: string; canal: 'essenciais' | 'landing' | 'sistema'; ativa: boolean; travada: boolean }[] = [
  { id: 'hero', canal: 'essenciais', ativa: true, travada: false },
  { id: 'sobre', canal: 'essenciais', ativa: true, travada: false },
  { id: 'percursos', canal: 'essenciais', ativa: true, travada: false },
  { id: 'lotes', canal: 'essenciais', ativa: true, travada: false },
  { id: 'kits', canal: 'essenciais', ativa: true, travada: false },
  { id: 'checkout', canal: 'sistema', ativa: true, travada: true },
];

export async function seedPreviewR14(db: Db, agora: Date = new Date()): Promise<Record<EstadoEsperado, number>> {
  const contagem: Record<EstadoEsperado, number> = { aberto: 0, esgotado: 0, encerrado: 0 };

  for (const e of EVENTOS_R14) {
    const eventoRef = db.collection('eventos').doc(e.id);
    const dataProva = new Date(agora.getTime() + e.dataDias * DIA_MS);

    // 1. Doc do evento (sem imagemUrl — capa resolvida app-side na landing).
    await upsert(eventoRef, {
      id: e.id,
      tenantId: CASTELO_TENANT_ID,
      organizadorId: MARINA_CASTELO_UID,
      nome: e.nome,
      data: ts(dataProva),
      local: e.local,
      modalidades: e.modalidades,
      modalidadeEsporte: e.modalidadeEsporte,
      slug: e.id,
      status: 'publicado',
      usaChip: e.usaChip,
      capacidade: e.capacidade,
      qtdInscritos: e.qtdInscritos,
      receitaConfirmada: e.receitaConfirmada,
    });

    // 2. Lotes por modalidade × janelas relativas.
    for (const [modalidade, base] of Object.entries(e.precosBase)) {
      for (const l of e.lotes) {
        const id = loteId(modalidade, l.ordem);
        await upsert(eventoRef.collection('lotes').doc(id), {
          id,
          tenantId: CASTELO_TENANT_ID,
          modalidade,
          ordem: l.ordem,
          nome: l.nome,
          inicioEm: ts(new Date(agora.getTime() + l.inicioDias * DIA_MS)),
          fimEm: ts(new Date(agora.getTime() + l.fimDias * DIA_MS)),
          quantidadeLimite: l.quantidadeLimite,
          preco: Math.round(base * l.fator),
          vendidos: l.vendidos,
        });
      }
    }

    // 3. Kit básico (gratuito) por evento — a página de vendas não nasce vazia.
    await upsert(eventoRef.collection('kits').doc('kit_basico'), {
      id: 'kit_basico',
      tenantId: CASTELO_TENANT_ID,
      nome: 'Kit básico',
      preco: 0,
      capacidade: e.capacidade,
      modalidades: e.modalidades,
    });

    // 4. paginaVendas/config publicada (mesmo shape do seed canônico).
    await upsert(eventoRef.collection('paginaVendas').doc('config'), {
      id: 'config',
      tenantId: CASTELO_TENANT_ID,
      eventoId: e.id,
      secoes: SECOES.map((s) => ({ ...s })),
      seo: {
        titulo: e.seo.titulo,
        descricao: e.seo.descricao,
        slugAmigavel: `{DOMINIO_LEELA}/${e.id}`,
      },
      publicada: true,
      publicadaEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    contagem[e.estadoEsperado] += 1;
  }

  return contagem;
}

// ---------------------------------------------------------------------------
// Runner direto (emulator-only)
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const fsHost = process.env['FIRESTORE_EMULATOR_HOST'];
  if (!fsHost) {
    throw new Error(
      '[seed-r14] FIRESTORE_EMULATOR_HOST precisa estar definido (ex.: localhost:8180). ' +
        'Abortando para nunca tocar produção.',
    );
  }
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'demo-leela' });
  }
  const db = admin.firestore();
  console.log(`[seed-r14] Firestore → ${fsHost} (projeto demo-leela)`);

  const agora = new Date();
  const contagem = await seedPreviewR14(db, agora);
  console.log(
    `[seed-r14] OK — ${EVENTOS_R14.length} eventos R14 aplicados (aditivo/idempotente): ` +
      `aberto=${contagem.aberto} · esgotado=${contagem.esgotado} · encerrado=${contagem.encerrado} ` +
      `(agora=${agora.toISOString()})`,
  );
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error('[seed-r14] ERRO:', err);
      process.exit(1);
    });
}
