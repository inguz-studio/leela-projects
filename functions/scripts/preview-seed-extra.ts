// =============================================================================
// functions/scripts/preview-seed-extra.ts — dados EXTRAS do PREVIEW LOCAL
//
// Enriquecimento ADITIVO por cima dos seeds canônicos (functions/src/seed/*),
// que são mocks de teste e NÃO podem mudar. Tudo aqui é infra de preview:
// fora de functions/src (não entra em build/deploy/type-check de produção).
//
// O que este seed adiciona (schema EXISTENTE apenas — nenhum campo novo):
//   Eventos (Castelo/Marina) — 6 novos, cobrindo os estados do domínio:
//     publicado normal · publicado ESGOTADO (ocupação 100% → badge/alerta)
//     · rascunho com prova próxima (alerta de publicação) · encerrado
//     · MTB/ciclismo · retiro/wellness (thumbs por modalidade da Visão geral).
//     ("cancelado"/"reembolsado" NÃO existem no domínio — StatusEvento/
//      StatusInscrito são enums fechados; ver evento.ts/inscrito.ts.)
//   Inscritos — pendente/cancelado/confirmado + carimbos de entrega/check-in
//     (chipNumero/kitEntregueEm/checkinEm) em parte dos 453 canônicos da
//     Meia Floripa e nos eventos novos → Distribuição/Estoque/balcão vivos.
//   Kits — subcoleções dos eventos novos com docId ALINHADO ao enum
//     KitInscrito (kit_basico…), para o join Kit.id === inscrito.kit do
//     Estoque funcionar (os kits canônicos usam hífen e não casam).
//   Financeiro — recomputarFinanceiroEvento() em todos os eventos do tenant
//     (mesma rotina da Function; taxa sai do termo do tenant).
//   Clube CPS — +6 membros (novo/ativo/inativo), +1 desafio rascunho,
//     +2 comunicados (enviado c/ métricas + rascunho), +1 parceria inativa.
//   Plataforma — +3 tenants (ativo/ativo/suspenso) com termos comerciais
//     variados + saúde do tenant Castelo + rollups macro recomputados.
//
// Idempotente: docIds fixos, set/merge, criadoEm só na criação; agregados
// via as MESMAS rotinas de recontagem das Functions. Emulator-only.
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { derivarStatus, COLECAO_PERFIS } from '@leela/core';

import { assertEmulatorOnly } from '../src/seed/emulator-guard';
import { CASTELO_TENANT_ID, MARINA_CASTELO_UID } from '../src/seed/tenants.seed';
import { MEIA_FLORIPA_ID } from '../src/seed/eventos.seed';
import { gerarInscritosSeed } from '../src/seed/inscritos.seed';
import {
  CLUBE_CPS_SLUG,
  CORRIDA_PERFEITA_TENANT_ID,
} from '../src/seed/clubes.seed';
import { recontarMembrosAtivos } from '../src/clubs/membrosAggregates';
import { recontarDesafiosAtivos } from '../src/clubs/desafiosAggregates';
import { recomputarFinanceiroEvento } from '../src/eventos/agregarFinanceiro';
import { syncItemUsadoEm } from '../src/eventos/itemKitIndex';
import { recomputePlatformRollupsCore } from '../src/platform/rollups';

type Db = admin.firestore.Firestore;

const DIA_MS = 24 * 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;

const ts = (d: Date): admin.firestore.Timestamp =>
  admin.firestore.Timestamp.fromDate(d);

/** set(merge) preservando criadoEm existente (padrão F8 dos seeds). */
async function upsert(
  ref: admin.firestore.DocumentReference,
  data: Record<string, unknown>,
  criadoEm?: admin.firestore.Timestamp
): Promise<void> {
  const snap = await ref.get();
  const payload: Record<string, unknown> = {
    ...data,
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (!snap.exists) {
    payload['criadoEm'] = criadoEm ?? admin.firestore.FieldValue.serverTimestamp();
  }
  await ref.set(payload, { merge: true });
}

// Pools de nomes (mesmo estilo do seed canônico — dados fictícios)
const NOMES = [
  'Helena', 'Otávio', 'Isadora', 'Caio', 'Manuela', 'Enzo', 'Lívia', 'Igor',
  'Clara', 'Davi', 'Sofia', 'Murilo', 'Alice', 'Heitor', 'Valentina', 'Theo',
  'Cecília', 'Benício', 'Laura', 'Noah',
] as const;
const SOBRENOMES = [
  'Teixeira', 'Sales', 'Vieira', 'Prado', 'Camargo', 'Siqueira', 'Farias',
  'Bittencourt', 'Guimarães', 'Peixoto', 'Sartori', 'Vasconcelos', 'Dutra',
  'Queiroz', 'Xavier', 'Amaral',
] as const;

function nomeFicticio(i: number): string {
  const nome = NOMES[(i - 1) % NOMES.length] as string;
  const sobrenome = SOBRENOMES[Math.floor((i - 1) / NOMES.length) % SOBRENOMES.length] as string;
  return `${nome} ${sobrenome}`;
}

// ---------------------------------------------------------------------------
// 1. Eventos extras do tenant Castelo (todos da Marina)
// ---------------------------------------------------------------------------

export const INVERNO_ID = 'corrida-inverno-floripa-2026';
export const NOTURNA_ID = 'noturna-beira-mar-2026';
export const TRILHA_ID = 'trilha-pantano-sul-2026';
export const SAO_SILVESTRE_ID = 'sao-silvestre-floripa-2025';
// Modalidades NÃO-corrida: provam os thumbs por modalidade da Visão geral
// (EventRow → thumbVariantDoEvento: 'ciclismo' via /mtb|bike|cicli|pedal/,
// 'yoga'/wellness via /yoga|bem-estar|retiro/). Sem eles, o painel LEELA (100%
// corrida) renderiza todos os thumbs iguais — arbitragem A2.
export const MTB_ID = 'desafio-mtb-costa-lagoa-2026';
export const RETIRO_ID = 'retiro-bem-estar-rio-vermelho-2026';

interface EventoExtra {
  id: string;
  nome: string;
  dataISO?: string;
  /** Dias relativos a `agora` (positivo = futuro) — para estados sensíveis a data */
  dataDiasRelativos?: number;
  local: string;
  modalidades: string[];
  /**
   * MODALIDADE ESPORTIVA (corrida/MTB/trail/bem-estar) — o QUE se pratica,
   * distinto do PERCURSO (distância em `modalidades`). LEELA-R12 · Frente 2:
   * a landing lê este campo do doc; ausente, ela deriva do nome + distâncias.
   */
  modalidadeEsporte: string;
  status: 'rascunho' | 'publicado' | 'ao_vivo' | 'encerrado';
  usaChip: boolean;
  capacidade: number;
  receitaConfirmada: number;
  qtdInscritos: number;
  /**
   * Capa 16/10 do card, path local de `apps/painel/public/seed-images/`. Este
   * campo serve o PAINEL (que resolve o path relativo no próprio public). A
   * LANDING pública NÃO reusa este valor: a guarda RN-153 (`isUrlCapaValida`,
   * @leela/core) só aceita URL http(s), então caminho relativo é descartado e a
   * página do evento cai na CAPA MOCK local da landing
   * (`apps/landing/public/covers/leela-evento-brasa.svg`, resolvida por
   * `resolverCapa` — LEELA-R7). Manter relativo aqui é proposital: seedar URL
   * absoluta de localhost regrediria as miniaturas do painel e seria frágil a
   * porta. Ver outputs/leela-build-2d6ee98d/R7-DOBRAS-HERO-REPORT.md.
   */
  imagemUrl: string;
}

const EVENTOS_EXTRA: readonly EventoExtra[] = [
  {
    // Publicado, prova distante → balcão de entrega FORA DA JANELA
    id: INVERNO_ID,
    nome: 'Corrida de Inverno Floripa 2026',
    dataDiasRelativos: 55,
    local: 'Parque de Coqueiros, Florianópolis/SC',
    modalidades: ['5k', '10k'],
    modalidadeEsporte: 'Corrida de rua',
    status: 'publicado',
    usaChip: false,
    capacidade: 400,
    receitaConfirmada: 23480,
    qtdInscritos: 90,
    imagemUrl: '/seed-images/corrida-rua.jpg',
  },
  {
    // Publicado ESGOTADO: 60/60 → ocupação 100% ≥ LIMIAR_ESGOTANDO →
    // badge "Últimas vagas", KPI eventoEmRisco e alerta warn na Visão geral
    id: NOTURNA_ID,
    nome: 'Noturna da Beira-Mar 2026',
    dataDiasRelativos: 19,
    local: 'Av. Beira-Mar Norte, Florianópolis/SC',
    modalidades: ['5k', '10k'],
    modalidadeEsporte: 'Corrida de rua',
    status: 'publicado',
    usaChip: true,
    capacidade: 60,
    receitaConfirmada: 8940,
    qtdInscritos: 60,
    imagemUrl: '/seed-images/corrida-noturna.jpg',
  },
  {
    // Rascunho com prova a ~10 dias → alerta warn "ainda não foi publicado"
    id: TRILHA_ID,
    nome: 'Trilha do Pântano do Sul 2026',
    dataDiasRelativos: 10,
    local: 'Pântano do Sul, Florianópolis/SC',
    modalidades: ['11k'],
    modalidadeEsporte: 'Trail run',
    status: 'rascunho',
    usaChip: false,
    capacidade: 80,
    receitaConfirmada: 0,
    qtdInscritos: 0,
    imagemUrl: '/seed-images/trilha.jpg',
  },
  {
    // Encerrado (histórico completo: todos com kit entregue + check-in)
    id: SAO_SILVESTRE_ID,
    nome: 'São Silvestre Floripa 2025',
    dataISO: '2025-12-31T17:00:00-03:00',
    local: 'Centro Histórico, Florianópolis/SC',
    modalidades: ['10k'],
    modalidadeEsporte: 'Corrida de rua',
    status: 'encerrado',
    usaChip: true,
    capacidade: 120,
    receitaConfirmada: 5200,
    qtdInscritos: 40,
    imagemUrl: '/seed-images/largada-rua.jpg',
  },
  {
    // Ciclismo (A2): modalidade "MTB" → thumb 'ciclismo' (Bike) na Visão geral.
    // Publicado, ocupação moderada (120/300) → sem risco de esgotamento.
    id: MTB_ID,
    nome: 'Desafio MTB Costa da Lagoa 2026',
    dataDiasRelativos: 40,
    local: 'Costa da Lagoa, Florianópolis/SC',
    modalidades: ['MTB 45km', 'MTB 90km'],
    modalidadeEsporte: 'Mountain bike',
    status: 'publicado',
    usaChip: true,
    capacidade: 300,
    receitaConfirmada: 34800,
    qtdInscritos: 120,
    imagemUrl: '/seed-images/mtb-ciclismo.jpg',
  },
  {
    // Wellness (A2): "Bem-estar/Yoga" → thumb 'yoga' (Flower2) na Visão geral.
    // Publicado, ocupação baixa (28/60) → sem risco de esgotamento.
    id: RETIRO_ID,
    nome: 'Retiro Bem-Estar Rio Vermelho 2026',
    dataDiasRelativos: 25,
    local: 'Praia do Moçambique, Florianópolis/SC',
    modalidades: ['Yoga', 'Bem-estar'],
    modalidadeEsporte: 'Bem-estar',
    status: 'publicado',
    usaChip: false,
    capacidade: 60,
    receitaConfirmada: 9240,
    qtdInscritos: 28,
    imagemUrl: '/seed-images/yoga-retiro.jpg',
  },
];

async function seedEventosExtra(db: Db, agora: Date): Promise<void> {
  for (const e of EVENTOS_EXTRA) {
    const dataProva = e.dataISO
      ? new Date(e.dataISO)
      : new Date(agora.getTime() + (e.dataDiasRelativos ?? 0) * DIA_MS);
    await upsert(db.collection('eventos').doc(e.id), {
      id: e.id,
      tenantId: CASTELO_TENANT_ID,
      organizadorId: MARINA_CASTELO_UID,
      nome: e.nome,
      data: ts(dataProva),
      local: e.local,
      modalidades: e.modalidades,
      modalidadeEsporte: e.modalidadeEsporte,
      slug: e.id,
      status: e.status,
      usaChip: e.usaChip,
      capacidade: e.capacidade,
      qtdInscritos: e.qtdInscritos,
      receitaConfirmada: e.receitaConfirmada,
      imagemUrl: e.imagemUrl,
    });
  }
  console.log(
    '[seed-extra] eventos: +6 (publicado · publicado ESGOTADO · rascunho prova ' +
      'próxima · encerrado · MTB/ciclismo · retiro/wellness) — todos com capa'
  );
}

// ---------------------------------------------------------------------------
// 1c. Kernel de vendas E04 dos eventos extras PUBLICADOS (lotes + paginaVendas)
//
// Follow-up de 2026-07-12 (LEELA-R1): 2 dos eventos publicados do preview
// (Corrida de Inverno + Desafio MTB) nasceram SEM lotes e SEM página de vendas,
// então a landing pública deles renderizava só share/QR e o estado de venda
// derivava 'encerrado' (sem lote ativo). Aqui damos a eles o MESMO shape do
// evento canônico Meia Floripa (functions/src/seed/eventos.seed.ts):
//   - lotes POR MODALIDADE (ADR-012), 3 janelas fixas não-sobrepostas —
//     L1 Promocional ENCERRADO (janela passada + esgotado), L2 VIGENTE
//     (fev–abr/2026, cobre o relógio canônico do preview 2026-03-15), L3 Final
//     FUTURO (abr, até a véspera). Datas FIXAS de 2026 (iguais à Meia) para
//     ficarem coerentes com LEELA_CLOCK=2026-03-15 → pelo menos 1 lote vigente.
//   - paginaVendas/config publicada com as seções que têm dado real neste seed
//     (hero/sobre/percursos/lotes/kits/checkout) → página pública completa.
// `vendidos` entra via Admin SDK (∑ de Function em produção). Preview-only,
// idempotente (docIds fixos + merge). Os demais eventos publicados sem página
// (Noturna/Retiro) seguem SEM seções de propósito: exercitam o hero mínimo (b).
// ---------------------------------------------------------------------------

/** Janelas compartilhadas — MESMAS datas fixas da Meia (vigente em 2026-03-15). */
const JANELAS_LOTES_EXTRA: readonly {
  ordem: number;
  nome: string;
  inicioEm: string;
  fimEm: string;
  fator: number;
  quantidadeLimite: number;
  vendidos: number;
}[] = [
  { ordem: 1, nome: 'Lote Promocional', inicioEm: '2025-12-01T00:00:00-03:00', fimEm: '2026-02-01T00:00:00-03:00', fator: 1, quantidadeLimite: 100, vendidos: 100 },
  { ordem: 2, nome: 'Lote 2', inicioEm: '2026-02-01T00:00:00-03:00', fimEm: '2026-04-01T00:00:00-03:00', fator: 1.25, quantidadeLimite: 200, vendidos: 60 },
  { ordem: 3, nome: 'Lote Final', inicioEm: '2026-04-01T00:00:00-03:00', fimEm: '2026-04-26T23:59:00-03:00', fator: 1.5, quantidadeLimite: 200, vendidos: 0 },
];

interface KernelVendasExtra {
  eventoId: string;
  /** Preço-base (Lote 1) por modalidade — chave = evento.modalidades[] exato. */
  precosBase: Record<string, number>;
  seo: { titulo: string; descricao: string };
}

const KERNEIS_VENDAS_EXTRA: readonly KernelVendasExtra[] = [
  {
    eventoId: INVERNO_ID,
    precosBase: { '5k': 50, '10k': 70 },
    seo: {
      titulo: 'Corrida de Inverno Floripa 2026 — inscrições abertas',
      descricao: '5k e 10k no Parque de Coqueiros. Lotes promocionais por distância.',
    },
  },
  {
    eventoId: MTB_ID,
    precosBase: { 'MTB 45km': 90, 'MTB 90km': 140 },
    seo: {
      titulo: 'Desafio MTB Costa da Lagoa 2026 — inscrições abertas',
      descricao: 'MTB 45km e 90km pela Costa da Lagoa. Lotes por percurso, vagas limitadas.',
    },
  },
];

/** loteId determinístico e seguro p/ docId (modalidade com espaço → hífen). */
function loteIdExtra(modalidade: string, ordem: number): string {
  const slug = modalidade.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug}-lote-${ordem}`;
}

/** Seções da paginaVendas dos eventos extras (só as com dado real neste seed). */
const SECOES_EXTRA: readonly { id: string; canal: 'essenciais' | 'landing' | 'sistema'; ativa: boolean; travada: boolean }[] = [
  { id: 'hero', canal: 'essenciais', ativa: true, travada: false },
  { id: 'sobre', canal: 'essenciais', ativa: true, travada: false },
  { id: 'percursos', canal: 'essenciais', ativa: true, travada: false },
  { id: 'lotes', canal: 'essenciais', ativa: true, travada: false },
  { id: 'kits', canal: 'essenciais', ativa: true, travada: false },
  { id: 'checkout', canal: 'sistema', ativa: true, travada: true },
];

const PAGINA_VENDAS_DOC_ID_EXTRA = 'config';

async function seedKernelVendasExtra(db: Db): Promise<void> {
  for (const kernel of KERNEIS_VENDAS_EXTRA) {
    const eventoRef = db.collection('eventos').doc(kernel.eventoId);

    // Lotes por modalidade × 3 janelas fixas
    for (const [modalidade, base] of Object.entries(kernel.precosBase)) {
      for (const j of JANELAS_LOTES_EXTRA) {
        const id = loteIdExtra(modalidade, j.ordem);
        await upsert(eventoRef.collection('lotes').doc(id), {
          id,
          tenantId: CASTELO_TENANT_ID,
          modalidade,
          ordem: j.ordem,
          nome: j.nome,
          inicioEm: ts(new Date(j.inicioEm)),
          fimEm: ts(new Date(j.fimEm)),
          quantidadeLimite: j.quantidadeLimite,
          preco: Math.round(base * j.fator),
          vendidos: j.vendidos,
        });
      }
    }

    // paginaVendas/config publicada (mesmo shape do seed canônico da Meia)
    await upsert(
      eventoRef.collection('paginaVendas').doc(PAGINA_VENDAS_DOC_ID_EXTRA),
      {
        id: PAGINA_VENDAS_DOC_ID_EXTRA,
        tenantId: CASTELO_TENANT_ID,
        eventoId: kernel.eventoId,
        secoes: SECOES_EXTRA.map((s) => ({ ...s })),
        seo: {
          titulo: kernel.seo.titulo,
          descricao: kernel.seo.descricao,
          slugAmigavel: `{DOMINIO_LEELA}/${kernel.eventoId}`,
        },
        publicada: true,
        publicadaEm: admin.firestore.FieldValue.serverTimestamp(),
      }
    );
  }
  console.log(
    `[seed-extra] kernel de vendas: lotes (3 janelas × modalidade) + paginaVendas ` +
      `em ${KERNEIS_VENDAS_EXTRA.map((k) => k.eventoId).join(', ')} — L2 vigente em 2026-03-15`
  );
}

// ---------------------------------------------------------------------------
// 1b. Capas dos eventos CANÔNICOS (Meia/Maratona) — merge aditivo por cima
//     do seed read-only (functions/src/seed/eventos.seed.ts não muda). Só o
//     campo `imagemUrl` entra; nada mais é tocado. Preview-only.
// ---------------------------------------------------------------------------

const CAPAS_CANONICAS: readonly { id: string; imagemUrl: string }[] = [
  { id: MEIA_FLORIPA_ID, imagemUrl: '/seed-images/meia-maratona.jpg' },
  { id: 'maratona-floripa-2027', imagemUrl: '/seed-images/maratona.jpg' },
];

async function seedCapasCanonicas(db: Db): Promise<void> {
  for (const c of CAPAS_CANONICAS) {
    await db
      .collection('eventos')
      .doc(c.id)
      .set(
        {
          imagemUrl: c.imagemUrl,
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  }
  console.log('[seed-extra] capas canônicas: Meia Maratona + Maratona 2027');
}

// ---------------------------------------------------------------------------
// 2. Kits dos eventos novos — docId ALINHADO ao enum KitInscrito
// ---------------------------------------------------------------------------

interface KitExtra {
  eventoId: string;
  id: string; // = valor do enum KitInscrito → join do Estoque funciona
  nome: string;
  preco: number;
  capacidade: number;
  modalidades: string[];
  /** R9-C (RN-230) — visão de compra no checkout do preview. */
  descricao: string;
  itens: string[];
}

// R9-C: descricao/itens coerentes com o tema de cada evento (imagem NÃO é
// semeada — mock rico é app-side no checkout; imagem real = upload RN-227).
const KITS_EXTRA: readonly KitExtra[] = [
  { eventoId: INVERNO_ID, id: 'kit_basico', nome: 'Kit básico', preco: 0, capacidade: 250, modalidades: ['5k', '10k'],
    descricao: 'O essencial para encarar o frio: camiseta manga longa e número de peitoral.',
    itens: ['Camiseta manga longa Inverno', 'Número de peitoral com chip'] },
  { eventoId: INVERNO_ID, id: 'kit_prata', nome: 'Kit Prata', preco: 45, capacidade: 150, modalidades: ['10k'],
    descricao: 'Para os 10k com conforto térmico completo no amanhecer gelado.',
    itens: ['Camiseta manga longa Inverno', 'Gorro térmico (Decathlon)', 'Número de peitoral com chip'] },
  { eventoId: NOTURNA_ID, id: 'kit_basico', nome: 'Kit básico', preco: 0, capacidade: 40, modalidades: ['5k', '10k'],
    descricao: 'O necessário para correr à noite com segurança.',
    itens: ['Pulseira LED de segurança (Track&Field)', 'Número de peitoral com chip'] },
  { eventoId: NOTURNA_ID, id: 'kit_ouro', nome: 'Kit Ouro Neon', preco: 79, capacidade: 20, modalidades: ['10k'],
    descricao: 'A experiência neon completa da prova noturna, com itens exclusivos.',
    itens: ['Camiseta neon exclusiva', 'Pulseira LED de segurança (Track&Field)', 'Medalha de finisher', 'Número de peitoral com chip'] },
  { eventoId: TRILHA_ID, id: 'kit_basico', nome: 'Kit trilha', preco: 0, capacidade: 80, modalidades: ['11k'],
    descricao: 'Kit enxuto para os 11k de trilha: número, mapa e hidratação nos postos.',
    itens: ['Número de peitoral', 'Mapa do percurso', 'Hidratação nos postos'] },
  { eventoId: SAO_SILVESTRE_ID, id: 'kit_basico', nome: 'Kit básico', preco: 0, capacidade: 100, modalidades: ['10k'],
    descricao: 'O kit da virada: camiseta comemorativa e medalha de finisher.',
    itens: ['Camiseta comemorativa', 'Medalha de finisher', 'Número de peitoral com chip'] },
  { eventoId: SAO_SILVESTRE_ID, id: 'sem_kit', nome: 'Sem kit', preco: -10, capacidade: 20, modalidades: ['10k'],
    descricao: 'Inscrição sem kit, com desconto — vaga garantida e resultado oficial.',
    itens: ['Número de peitoral com chip', 'Cronometragem e resultado oficiais'] },
  // A2 — ciclismo (MTB)
  { eventoId: MTB_ID, id: 'kit_basico', nome: 'Kit básico', preco: 0, capacidade: 200, modalidades: ['MTB 45km', 'MTB 90km'],
    descricao: 'O essencial para pedalar: placa de guidão com chip e hidratação.',
    itens: ['Placa de guidão com chip', 'Hidratação nos postos'] },
  { eventoId: MTB_ID, id: 'kit_prata', nome: 'Kit Prata MTB', preco: 55, capacidade: 100, modalidades: ['MTB 90km'],
    descricao: 'Para os 90km: camisa de ciclismo e apoio mecânico no percurso.',
    itens: ['Camisa de ciclismo do evento', 'Placa de guidão com chip', 'Apoio mecânico no percurso'] },
  // A2 — wellness (retiro)
  { eventoId: RETIRO_ID, id: 'kit_basico', nome: 'Kit básico', preco: 0, capacidade: 40, modalidades: ['Yoga', 'Bem-estar'],
    descricao: 'O necessário para as práticas do fim de semana.',
    itens: ['Credencial de acesso', 'Squeeze do retiro'] },
  { eventoId: RETIRO_ID, id: 'kit_ouro', nome: 'Kit Bem-Estar Plus', preco: 89, capacidade: 20, modalidades: ['Bem-estar'],
    descricao: 'A imersão completa: tapete próprio, kit chá e acesso às sessões guiadas.',
    itens: ['Tapete de yoga do evento', 'Kit chá artesanal', 'Credencial de acesso', 'Sessões guiadas extras'] },
];

interface ItemKitExtra {
  id: string;
  eventoId: string;
  nome: string;
  tamanhado: boolean;
  origem: 'organizador' | 'patrocinador';
  marca?: string;
  exibirLogo: boolean;
  kits: string[];
}

const ITENS_KIT_EXTRA: readonly ItemKitExtra[] = [
  {
    id: 'camiseta-inverno-2026',
    eventoId: INVERNO_ID,
    nome: 'Camiseta manga longa Inverno',
    tamanhado: true,
    origem: 'organizador',
    exibirLogo: false,
    kits: ['kit_basico', 'kit_prata'],
  },
  {
    id: 'gorro-termico-inverno',
    eventoId: INVERNO_ID,
    nome: 'Gorro térmico',
    tamanhado: false,
    origem: 'patrocinador',
    marca: 'Decathlon',
    exibirLogo: true,
    kits: ['kit_prata'],
  },
  {
    id: 'pulseira-led-noturna',
    eventoId: NOTURNA_ID,
    nome: 'Pulseira LED de segurança',
    tamanhado: false,
    origem: 'patrocinador',
    marca: 'Track&Field',
    exibirLogo: true,
    kits: ['kit_basico', 'kit_ouro'],
  },
];

// Exportada (R9-C) para rodada targeted/aditiva do modelo do kit no preview
// sem reexecutar o seed-extra inteiro (financeiro/rollups etc. intactos).
export async function seedKitsExtra(db: Db): Promise<void> {
  for (const kit of KITS_EXTRA) {
    await upsert(
      db.collection('eventos').doc(kit.eventoId).collection('kits').doc(kit.id),
      {
        id: kit.id,
        tenantId: CASTELO_TENANT_ID,
        nome: kit.nome,
        preco: kit.preco,
        capacidade: kit.capacidade,
        modalidades: kit.modalidades,
        // R9-C (RN-230) — visão de compra do checkout
        descricao: kit.descricao,
        itens: kit.itens,
      }
    );
  }
  for (const item of ITENS_KIT_EXTRA) {
    const data: Record<string, unknown> = {
      id: item.id,
      tenantId: CASTELO_TENANT_ID,
      eventoId: item.eventoId,
      nome: item.nome,
      tamanhado: item.tamanhado,
      origem: item.origem,
      exibirLogo: item.exibirLogo,
      kits: item.kits,
    };
    if (item.marca !== undefined) data['marca'] = item.marca;
    await upsert(db.collection('itensKit').doc(item.id), data);
  }
  // Índice inverso "usado em" (RN-215) — mesma rotina da Function
  for (const item of ITENS_KIT_EXTRA) {
    await syncItemUsadoEm(db, item.id);
  }
  console.log(
    `[seed-extra] kits: ${KITS_EXTRA.length} kits + ${ITENS_KIT_EXTRA.length} itens nos eventos novos (docId = enum → Estoque casa)`
  );
}

// ---------------------------------------------------------------------------
// 3. Inscritos dos eventos novos + carimbos de entrega na Meia Floripa
// ---------------------------------------------------------------------------

interface InscritoDoc {
  id: string;
  atletaNome: string;
  kit: string;
  status: 'confirmado' | 'pendente' | 'cancelado';
  modalidade: string;
  criadoEm: Date;
  chipNumero: string | null;
  kitEntregueEm?: Date;
  checkinEm?: Date;
}

async function gravarInscritos(
  db: Db,
  eventoId: string,
  inscritos: readonly InscritoDoc[]
): Promise<void> {
  const col = db.collection('eventos').doc(eventoId).collection('inscritos');
  for (let inicio = 0; inicio < inscritos.length; inicio += 400) {
    const batch = db.batch();
    for (const i of inscritos.slice(inicio, inicio + 400)) {
      const data: Record<string, unknown> = {
        id: i.id,
        tenantId: CASTELO_TENANT_ID,
        atletaId: `atleta-${i.id}`,
        atletaNome: i.atletaNome,
        kit: i.kit,
        chipNumero: i.chipNumero,
        status: i.status,
        modalidade: i.modalidade,
        criadoEm: ts(i.criadoEm),
        atualizadoEm: ts(i.criadoEm),
      };
      if (i.kitEntregueEm) data['kitEntregueEm'] = ts(i.kitEntregueEm);
      if (i.checkinEm) data['checkinEm'] = ts(i.checkinEm);
      batch.set(col.doc(i.id), data);
    }
    await batch.commit();
  }
}

async function seedInscritosExtra(db: Db, agora: Date): Promise<void> {
  // Corrida de Inverno — 90 inscritos recentes: mistura pago (confirmado),
  // pendente (alguns > 24h → alerta na Visão geral) e cancelado. As datas
  // recentes alimentam "inscrições recentes" e o trend 7d vs 7d dos KPIs.
  const inverno: InscritoDoc[] = [];
  for (let i = 1; i <= 90; i++) {
    const seq = String(i).padStart(4, '0');
    const kit = i % 3 === 0 ? 'kit_prata' : 'kit_basico';
    const modalidade = kit === 'kit_prata' ? '10k' : i % 2 === 0 ? '5k' : '10k';
    const status: InscritoDoc['status'] =
      i % 15 === 0 ? 'cancelado' : i % 9 === 0 ? 'pendente' : 'confirmado';
    // 1..50 → últimos ~6 dias; 51..90 → 7..20 dias atrás (janela anterior)
    const criadoEm =
      i <= 50
        ? new Date(agora.getTime() - i * 3 * HORA_MS)
        : new Date(agora.getTime() - 7 * DIA_MS - (i - 50) * 8 * HORA_MS);
    inverno.push({
      id: `insc-w-${seq}`,
      atletaNome: nomeFicticio(i),
      kit,
      status,
      modalidade,
      criadoEm,
      chipNumero: null,
    });
  }
  await gravarInscritos(db, INVERNO_ID, inverno);

  // Noturna — ESGOTADA: 60/60 confirmados (nenhum cancelamento libera vaga)
  const noturna: InscritoDoc[] = [];
  for (let i = 1; i <= 60; i++) {
    const seq = String(i).padStart(4, '0');
    const kit = i <= 20 ? 'kit_ouro' : 'kit_basico';
    const modalidade = kit === 'kit_ouro' ? '10k' : i % 2 === 0 ? '5k' : '10k';
    noturna.push({
      id: `insc-n-${seq}`,
      atletaNome: nomeFicticio(i + 90),
      kit,
      status: 'confirmado',
      modalidade,
      criadoEm: new Date(agora.getTime() - i * 9 * HORA_MS),
      chipNumero: null,
    });
  }
  await gravarInscritos(db, NOTURNA_ID, noturna);

  // São Silvestre 2025 — encerrado: 40 confirmados, TODOS atendidos no dia
  // (chip vinculado + kit entregue + check-in) → Distribuição/Estoque 100%
  const diaProva = new Date('2025-12-31T15:00:00-03:00');
  const aberturaInscricoes = new Date('2025-11-01T09:00:00-03:00');
  const saoSilvestre: InscritoDoc[] = [];
  for (let i = 1; i <= 40; i++) {
    const seq = String(i).padStart(4, '0');
    const atendidoEm = new Date(diaProva.getTime() + i * 2 * 60 * 1000);
    saoSilvestre.push({
      id: `insc-s-${seq}`,
      atletaNome: nomeFicticio(i + 150),
      kit: i > 32 ? 'sem_kit' : 'kit_basico',
      status: 'confirmado',
      modalidade: '10k',
      criadoEm: new Date(aberturaInscricoes.getTime() + i * 11 * HORA_MS),
      chipNumero: `SS-${seq}`,
      kitEntregueEm: atendidoEm,
      checkinEm: atendidoEm,
    });
  }
  await gravarInscritos(db, SAO_SILVESTRE_ID, saoSilvestre);

  // MTB (A2) — 120 inscritos recentes (mesmas regras do Inverno: mix pago/
  // pendente/cancelado, datas nas duas janelas do trend), modalidade MTB.
  const mtb: InscritoDoc[] = [];
  for (let i = 1; i <= 120; i++) {
    const seq = String(i).padStart(4, '0');
    const kit = i % 3 === 0 ? 'kit_prata' : 'kit_basico';
    const modalidade = kit === 'kit_prata' ? 'MTB 90km' : i % 2 === 0 ? 'MTB 45km' : 'MTB 90km';
    const status: InscritoDoc['status'] =
      i % 15 === 0 ? 'cancelado' : i % 9 === 0 ? 'pendente' : 'confirmado';
    const criadoEm =
      i <= 70
        ? new Date(agora.getTime() - i * 2 * HORA_MS)
        : new Date(agora.getTime() - 7 * DIA_MS - (i - 70) * 6 * HORA_MS);
    mtb.push({
      id: `insc-m-${seq}`,
      atletaNome: nomeFicticio(i + 200),
      kit,
      status,
      modalidade,
      criadoEm,
      chipNumero: null,
    });
  }
  await gravarInscritos(db, MTB_ID, mtb);

  // Retiro/wellness (A2) — 28 inscritos, quase todos confirmados, modalidade Yoga.
  const retiro: InscritoDoc[] = [];
  for (let i = 1; i <= 28; i++) {
    const seq = String(i).padStart(4, '0');
    const kit = i % 4 === 0 ? 'kit_ouro' : 'kit_basico';
    const status: InscritoDoc['status'] = i % 14 === 0 ? 'pendente' : 'confirmado';
    retiro.push({
      id: `insc-r-${seq}`,
      atletaNome: nomeFicticio(i + 330),
      kit,
      status,
      modalidade: 'Yoga',
      criadoEm: new Date(agora.getTime() - i * 10 * HORA_MS),
      chipNumero: null,
    });
  }
  await gravarInscritos(db, RETIRO_ID, retiro);

  console.log(
    '[seed-extra] inscritos: +90 (Inverno) · +60 (Noturna esgotada) · +40 ' +
      '(São Silvestre atendidos) · +120 (MTB) · +28 (Retiro)'
  );
}

/** Atleta-demo do balcão: "atendendo (sem chip)", pronto pro roteiro RN-206. */
export const BALCAO_DEMO_INSC_ID = 'insc-0002'; // João Silva (canônico, confirmado)
/** Chip EM USO para provocar o conflito RN-206 no balcão (dono: insc-0001). */
export const BALCAO_DEMO_CHIP_EM_USO = 'CHIP-0001'; // Marina Silva

/**
 * Carimbos de entrega/check-in em ~40% dos confirmados canônicos da Meia
 * Floripa (chip CHIP-{seq} SÓ nos atendidos — n % 5 <= 1, ou seja seq 0001,
 * 0005, 0006, 0010, 0011...) — Distribuição/Estoque com progresso real e
 * balcão com estados "completo" (atendido) e "atendendo" (chip livre).
 *
 * Roteiro do CONFLITO de chip (RN-206), determinístico e VERDADEIRO:
 *   1. Balcão da Meia Floripa → buscar "João Silva" (insc-0002 — confirmado
 *      no seed canônico e FORA do filtro de atendidos, n=2 → chip livre);
 *   2. Passo "Vincular chip" → digitar CHIP-0001 (em uso por Marina Silva,
 *      insc-0001, atendida pelo filtro) → modal RN-206 abre;
 *   3. Confirmar a sobrescrita → reatribuição atômica.
 * NÃO usar CHIP-0002 como exemplo: seq 0002 não é atendido (n % 5 = 2),
 * então CHIP-0002 NÃO existe e vincularia silenciosamente (achado M1 do QA
 * leela-build-2d6ee98d). O reset explícito abaixo garante o estado do
 * João Silva mesmo depois de demos anteriores terem vinculado chip a ele.
 */
async function seedEntregasMeiaFloripa(db: Db, agora: Date): Promise<void> {
  const col = db.collection('eventos').doc(MEIA_FLORIPA_ID).collection('inscritos');
  const canonicos = gerarInscritosSeed();
  const atendidos = canonicos.filter((i, idx) => {
    const n = idx + 1;
    return i.status === 'confirmado' && n % 5 <= 1; // determinístico ~40%
  });

  for (let inicio = 0; inicio < atendidos.length; inicio += 400) {
    const batch = db.batch();
    for (const i of atendidos.slice(inicio, inicio + 400)) {
      const seq = i.id.slice(-4);
      const atendidoEm = new Date(agora.getTime() - (Number(seq) % 48) * HORA_MS);
      batch.set(
        col.doc(i.id),
        {
          chipNumero: `CHIP-${seq}`,
          kitEntregueEm: ts(atendidoEm),
          checkinEm: ts(atendidoEm),
        },
        { merge: true }
      );
    }
    await batch.commit();
  }

  // Atleta-demo do balcão SEMPRE "atendendo (sem chip)": João Silva
  // (insc-0002) fica fora do filtro acima por construção (n=2), mas uma demo
  // anterior pode ter vinculado chip/fechado atendimento nele — o reset
  // devolve o palco ao estado do roteiro (aditivo/idempotente: rerodar o
  // seed re-arma o conflito RN-206 sem tocar em mais ninguém).
  await col.doc(BALCAO_DEMO_INSC_ID).set(
    {
      chipNumero: null,
      kitEntregueEm: admin.firestore.FieldValue.delete(),
      checkinEm: admin.firestore.FieldValue.delete(),
    },
    { merge: true }
  );

  console.log(
    `[seed-extra] entregas: ${atendidos.length} atendidos na Meia Floripa (chip CHIP-{seq} + kit + check-in)`
  );
  console.log(
    `[seed-extra] balcão RN-206: ${BALCAO_DEMO_INSC_ID} (João Silva) resetado para "atendendo (sem chip)" — conflito com ${BALCAO_DEMO_CHIP_EM_USO} (Marina Silva, insc-0001)`
  );
}

/**
 * Atividade recente VIVA da Meia Floripa (LEELA-FID-EVT-T4).
 *
 * Os 453 inscritos canônicos têm `criadoEm` entre Jan e Abr 2026 — no preview
 * (agora ≈ Jul/2026) todos aparecem como "há ~90d", e o feed do Overview
 * (orderBy `criadoEm` desc, limit 6) mostraria só os do fim daquela janela.
 * Este passo injeta um punhado de inscritos GENUINAMENTE recentes (últimos
 * minutos/horas/dias), com nomes diversos e os três estados do feed
 * (confirmado/pendente/cancelado → badges Confirmado/Pendente/Falha),
 * espelhando as linhas de inscrito do mockup `Overview do Evento.html`
 * (Rafael há 12 min, Camila há 34 min, Beatriz há 2h, Diego há 6h…).
 *
 * Aditivo (docIds fixos `insc-rec-NN`, fora dos canônicos `insc-0001…`) e
 * idempotente. Roda ANTES de recomputarFinanceiros → o agregado do evento
 * conta estes inscritos de forma determinística (receitaBruta NÃO muda: nasce
 * de `eventos.receitaConfirmada`, não de contagem × preço — agregarFinanceiro).
 */
interface RecenteMeia {
  nome: string;
  kit: InscritoDoc['kit'];
  status: InscritoDoc['status'];
  modalidade: string;
  /** Idade do registro em minutos (relativa a `agora`). */
  minutosAtras: number;
}

// Nomes diversos (não alfabéticos) — os 4 primeiros espelham o mockup.
const RECENTES_MEIA: readonly RecenteMeia[] = [
  { nome: 'Rafael Guimarães', kit: 'kit_ouro', status: 'confirmado', modalidade: '21k', minutosAtras: 12 },
  { nome: 'Camila Souza', kit: 'kit_prata', status: 'confirmado', modalidade: '10k', minutosAtras: 34 },
  { nome: 'Otávio Vasconcelos', kit: 'kit_basico', status: 'pendente', modalidade: '5k', minutosAtras: 58 },
  { nome: 'Beatriz Lima', kit: 'kit_ouro', status: 'pendente', modalidade: '21k', minutosAtras: 120 },
  { nome: 'Helena Teixeira', kit: 'kit_prata', status: 'confirmado', modalidade: '10k', minutosAtras: 240 },
  { nome: 'Diego Alves', kit: 'kit_prata', status: 'cancelado', modalidade: '10k', minutosAtras: 360 },
  { nome: 'Larissa Prado', kit: 'kit_basico', status: 'confirmado', modalidade: '5k', minutosAtras: 560 },
  { nome: 'Enzo Sartori', kit: 'kit_ouro', status: 'confirmado', modalidade: '21k', minutosAtras: 1560 },
];

async function seedAtividadeRecenteMeia(db: Db, agora: Date): Promise<void> {
  const recentes: InscritoDoc[] = RECENTES_MEIA.map((r, idx) => {
    const seq = String(idx + 1).padStart(2, '0');
    return {
      id: `insc-rec-${seq}`,
      atletaNome: r.nome,
      kit: r.kit,
      status: r.status,
      modalidade: r.modalidade,
      criadoEm: new Date(agora.getTime() - r.minutosAtras * 60 * 1000),
      chipNumero: null,
    };
  });
  await gravarInscritos(db, MEIA_FLORIPA_ID, recentes);
  console.log(
    `[seed-extra] atividade recente: +${recentes.length} inscritos recentes na Meia ` +
      '(12min…26h, nomes diversos, confirmado/pendente/cancelado) — feed do Overview vivo'
  );
}

// ---------------------------------------------------------------------------
// 4. Clube Corrida Perfeita Sul — membros, desafio rascunho, comunicados,
//    parceria inativa
// ---------------------------------------------------------------------------

interface MembroExtra {
  id: string;
  atletaNome: string;
  papel: 'owner' | 'admin' | 'membro';
  entrouVia: 'link' | 'codigo' | 'convite';
  entrouDiasAtras: number;
  ultimaAtividadeDiasAtras: number | null;
}

const MEMBROS_EXTRA: readonly MembroExtra[] = [
  { id: 'membro-helena-souza', atletaNome: 'Helena Souza', papel: 'membro', entrouVia: 'convite', entrouDiasAtras: 1, ultimaAtividadeDiasAtras: 0 },
  { id: 'membro-joao-vitor-castro', atletaNome: 'João Vítor Castro', papel: 'membro', entrouVia: 'link', entrouDiasAtras: 4, ultimaAtividadeDiasAtras: 1 },
  { id: 'membro-diego-fontes', atletaNome: 'Diego Fontes', papel: 'membro', entrouVia: 'codigo', entrouDiasAtras: 300, ultimaAtividadeDiasAtras: 2 },
  { id: 'membro-tatiane-melo', atletaNome: 'Tatiane Melo', papel: 'admin', entrouVia: 'convite', entrouDiasAtras: 150, ultimaAtividadeDiasAtras: 5 },
  { id: 'membro-paula-ribeiro', atletaNome: 'Paula Ribeiro', papel: 'membro', entrouVia: 'codigo', entrouDiasAtras: 60, ultimaAtividadeDiasAtras: 12 },
  { id: 'membro-marcos-lima', atletaNome: 'Marcos Lima', papel: 'membro', entrouVia: 'link', entrouDiasAtras: 400, ultimaAtividadeDiasAtras: 90 },
];

async function seedClubeExtra(db: Db, agora: Date): Promise<void> {
  const clubeRef = db.collection('clubes').doc(CLUBE_CPS_SLUG);

  // Membros (status derivado por data — MESMA função pura da Function, RN-102)
  for (const m of MEMBROS_EXTRA) {
    const ref = clubeRef.collection('membros').doc(m.id);
    const snap = await ref.get();
    let entrouEm: Date;
    let ultimaAtividadeEm: Date | null;
    if (snap.exists) {
      entrouEm = (snap.get('entrouEm') as admin.firestore.Timestamp).toDate();
      const ua = snap.get('ultimaAtividadeEm') as admin.firestore.Timestamp | undefined;
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
      tenantId: CORRIDA_PERFEITA_TENANT_ID,
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
  await recontarMembrosAtivos(db, CLUBE_CPS_SLUG);

  // Desafio RASCUNHO (StatusDesafio inclui 'rascunho'; o seed canônico só
  // tem ativo/encerrado — este completa o terceiro estado da tela)
  const desafioRef = clubeRef.collection('desafios').doc('primavera-em-movimento');
  await upsert(desafioRef, {
    id: 'primavera-em-movimento',
    tenantId: CORRIDA_PERFEITA_TENANT_ID,
    nome: 'Primavera em Movimento',
    descricao:
      'Setembro em ritmo de renovação: pool de pontos entre corrida, ' +
      'pedal e meditação para destravar a temporada de provas.',
    modelo: 'B',
    dataInicio: ts(new Date('2026-09-01T00:00:00-03:00')),
    dataFim: ts(new Date('2026-09-30T23:59:59-03:00')),
    status: 'rascunho',
    metaTotalPontos: 800,
    recompensaTipo: 'medalha_digital',
    visibilidade: 'membros',
    qtdParticipantes: 0,
    progressoPct: 0,
  });
  const acoesBatch = db.batch();
  for (const acaoRef of ['correr', 'pedalar', 'meditar']) {
    acoesBatch.set(desafioRef.collection('acoes').doc(acaoRef), { acaoRef });
  }
  await acoesBatch.commit();
  await recontarDesafiosAtivos(db, CLUBE_CPS_SLUG);

  // Comunicados: +1 enviado com métricas fortes · +1 rascunho
  await upsert(clubeRef.collection('comunicados').doc('resultado-verao-leve'), {
    id: 'resultado-verao-leve',
    tenantId: CORRIDA_PERFEITA_TENANT_ID,
    titulo: 'Resultado do Verão Leve 2026: 87 participantes, 73% da meta',
    conteudo:
      'O Verão Leve 2026 fechou com 87 participantes e 73% da meta coletiva. ' +
      'Medalha digital liberada no app para quem cruzou os três pilares. ' +
      'Obrigado por começarem o ano em movimento!',
    canal: ['push', 'email'],
    origem: 'manual',
    status: 'enviado',
    segmento: { tipo: 'por_desafio', referencia: 'verao-leve-2026', tamanhoEstimado: 87 },
    enviadoEm: ts(new Date(agora.getTime() - 2 * DIA_MS)),
    alcance: 87,
    aberturasPct: 82,
  });
  await upsert(clubeRef.collection('comunicados').doc('checklist-noturna'), {
    id: 'checklist-noturna',
    tenantId: CORRIDA_PERFEITA_TENANT_ID,
    titulo: 'Checklist para provas noturnas',
    conteudo:
      'Correr à noite pede atenção extra: pulseira LED, roupa clara, ' +
      'hidratação antecipada. [rascunho — completar com dicas da Tatiane]',
    canal: ['email'],
    origem: 'manual',
    status: 'rascunho',
    segmento: { tipo: 'todos', tamanhoEstimado: 126 },
    alcance: 0,
  });

  // Parceria patrocinadora INATIVA (desativada) — terceiro StatusParceria
  await upsert(clubeRef.collection('parcerias').doc('parceria-pe-de-vento'), {
    id: 'parceria-pe-de-vento',
    tenantId: CORRIDA_PERFEITA_TENANT_ID,
    tipo: 'patrocinador',
    status: 'inativa',
    nome: 'Pé de Vento Calçados',
    modeloComercial: 'financeiro',
    valorAnual: 6000,
    contrapartida:
      'Desconto de 15% para membros na loja do centro · encerrada em ' +
      'Mai 2026 por decisão comercial da marca',
  });

  console.log(
    '[seed-extra] clube CPS: +6 membros · +1 desafio rascunho · +2 comunicados · +1 parceria inativa'
  );
}

// ---------------------------------------------------------------------------
// 5. Plataforma — tenants extras, termos variados, saúde e rollups
// ---------------------------------------------------------------------------

interface TenantExtra {
  id: string;
  nome: string;
  status: 'pending' | 'ativo' | 'suspenso';
  ownerUid: string;
  tipo: 'produtor' | 'promotor';
  gmvAcumulado: number;
  eventosAtivos: number;
  /** Termos gravados só se `current` não existir (idempotente, sem inflar versão) */
  terms?: {
    platformFeePct: number;
    maxParcelas: number;
    jurosAoMes: number;
    parcelaMinima: number;
    anticipation: { disponivel: boolean; custoPct?: number };
    communityMonthlyEnabled: boolean;
    saasMonthlyFee: number;
  };
}

const TENANTS_EXTRA: readonly TenantExtra[] = [
  {
    id: 'trilhas-do-sul',
    nome: 'Trilhas do Sul Produções',
    status: 'ativo',
    ownerUid: 'uid-ricardo-haro',
    tipo: 'produtor',
    gmvAcumulado: 148200,
    eventosAtivos: 3,
    terms: {
      platformFeePct: 12,
      maxParcelas: 6,
      jurosAoMes: 0,
      parcelaMinima: 20,
      anticipation: { disponivel: true, custoPct: 2.5 },
      communityMonthlyEnabled: false,
      saasMonthlyFee: 199,
    },
  },
  {
    id: 'ritmo-run-assessoria',
    nome: 'Ritmo Run Assessoria',
    status: 'ativo',
    ownerUid: 'uid-ligia-souza',
    tipo: 'promotor',
    gmvAcumulado: 36400,
    eventosAtivos: 1,
    terms: {
      platformFeePct: 8,
      maxParcelas: 10,
      jurosAoMes: 1.2,
      parcelaMinima: 15,
      anticipation: { disponivel: false },
      communityMonthlyEnabled: true,
      saasMonthlyFee: 0,
    },
  },
  {
    id: 'na-passada-eventos',
    nome: 'Na Passada Eventos',
    status: 'suspenso',
    ownerUid: 'uid-comite-acate',
    tipo: 'promotor',
    gmvAcumulado: 12750,
    eventosAtivos: 0,
    terms: {
      platformFeePct: 10.5,
      maxParcelas: 12,
      jurosAoMes: 0,
      parcelaMinima: 10,
      anticipation: { disponivel: false },
      communityMonthlyEnabled: false,
      saasMonthlyFee: 0,
    },
  },
];

const SEED_ADMIN_UID = 'uid-platform-admin';

async function seedPlataformaExtra(db: Db): Promise<void> {
  for (const t of TENANTS_EXTRA) {
    await upsert(db.collection('tenants').doc(t.id), {
      id: t.id,
      nome: t.nome,
      slug: t.id,
      status: t.status,
      ownerUid: t.ownerUid,
      tipo: t.tipo,
      gmvAcumulado: t.gmvAcumulado,
      eventosAtivos: t.eventosAtivos,
    });

    if (t.terms) {
      const termsCol = db.collection('tenants').doc(t.id).collection('commercialTerms');
      const current = await termsCol.doc('current').get();
      if (!current.exists) {
        const payload = {
          platformFeePct: t.terms.platformFeePct,
          installmentRules: {
            maxParcelas: t.terms.maxParcelas,
            jurosAoMes: t.terms.jurosAoMes,
            parcelaMinima: t.terms.parcelaMinima,
          },
          anticipation: t.terms.anticipation,
          communityMonthlyEnabled: t.terms.communityMonthlyEnabled,
          saasMonthlyFee: t.terms.saasMonthlyFee,
          versao: 1,
          atualizadoPor: SEED_ADMIN_UID,
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
        };
        const batch = db.batch();
        batch.set(termsCol.doc('current'), payload);
        batch.set(termsCol.doc('v1'), payload);
        await batch.commit();
      }
    }
  }

  // Saúde do tenant Castelo (∑ display — o seed canônico zera; aqui, depois
  // dele, entram os valores coerentes com os eventos do preview)
  await db.collection('tenants').doc(CASTELO_TENANT_ID).set(
    {
      gmvAcumulado: 167277, // 85.617 + 23.480 + 8.940 + 5.200 + 34.800 (MTB) + 9.240 (retiro)
      eventosAtivos: 5, // meia-floripa · inverno · noturna · MTB · retiro (publicados)
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Rollups macro — MESMA rotina da Function (idempotente, full recompute)
  const rollups = await recomputePlatformRollupsCore(db);
  console.log(
    `[seed-extra] plataforma: +3 tenants c/ termos variados · rollups (GMV R$ ${rollups.gmvTotal} · ${rollups.tenantsAtivos} ativos)`
  );
}

// ---------------------------------------------------------------------------
// 6. Financeiro — recomputação determinística de todos os eventos do Castelo
// ---------------------------------------------------------------------------

async function recomputarFinanceiros(db: Db): Promise<void> {
  const ids = [MEIA_FLORIPA_ID, INVERNO_ID, NOTURNA_ID, TRILHA_ID, SAO_SILVESTRE_ID, MTB_ID, RETIRO_ID];
  for (const id of ids) {
    await recomputarFinanceiroEvento(db, id);
  }
  console.log(`[seed-extra] financeiro: financeiro/current recomputado em ${ids.length} eventos`);
}

// ---------------------------------------------------------------------------
// 7. Conversão do dashboard da Marina — série de PREVIEW (prova visual)
// ---------------------------------------------------------------------------

/**
 * Injeta taxa de conversão + sparkline em `profissionais/{Marina}/dashboard/current`.
 *
 * Por quê aqui (e não no core): `taxaConversaoPct`/`conversaoSparkline` dependem
 * de dado de VISITAS (E12/analytics), que o modelo da Onda 1 ainda não tem — a
 * Function `recomputeProfessionalDashboard` grava, corretamente, `null`/`[]`
 * (decisão nº 7 da Onda 1). Sem esse dado o card "Taxa de conversão" fica "—" e
 * a Sparkline não desenha. Para PROVAR a feature no preview, escrevemos por cima
 * do agregado — SÓ os dois campos de conversão, via merge — a série exata do
 * mockup be-hero (Painel do Organizador: 68,2% + curva ascendente de 13 pontos).
 * Os demais KPIs continuam sendo os do agregado real (fan-out de eventos/clubes).
 *
 * Dois riscos reais (achados no QA vivo 2) e como são vencidos:
 *  1) CLOBBER de fan-out: cada write de evento dispara onEventoWriteDashboard,
 *     que regrava o doc INTEIRO (set sem merge → conversão volta a []). Como os
 *     triggers são assíncronos no Emulator, um straggler pode aterrissar DEPOIS
 *     do nosso merge. Solução: loop write→espera→relê até 2 leituras estáveis
 *     consecutivas (o loop sobrevive a toda a fila de triggers dos eventos, que
 *     é finita — nenhum write de evento acontece após este passo).
 *  2) STALENESS na leitura: getOverview RECOMPUTA o doc quando computadoEm passa
 *     de DASHBOARD_STALE_MS (5 min) — e a recomputação zera a conversão de novo.
 *     Como não há como derivar conversão sem visitas (E12) e functions/src é
 *     read-only, fixamos o doc do PREVIEW como sempre-fresco: computadoEm no
 *     FUTURO → `agora - computadoEm < STALE_MS` é sempre verdade → getOverview
 *     nunca recomputa e a conversão persiste a sessão toda. Seguro: nenhum
 *     consumidor do painel exibe atualizadoEm/computadoEm da Visão geral.
 * Emulator-only e idempotente (rerodar re-injeta os mesmos campos).
 */
const CONVERSAO_SPARKLINE_MOCKUP = [8, 10, 7, 13, 11, 16, 14, 19, 17, 21, 20, 23, 25] as const;
const CONVERSAO_TAXA_MOCKUP = 68.2;
// computadoEm ~10 anos à frente: fixa o dashboard do preview como sempre-fresco
// (getOverview nunca marca stale → nunca recomputa e zera a conversão).
const PREVIEW_COMPUTADO_EM_FUTURO = Date.now() + 10 * 365 * DIA_MS;

async function seedConversaoDashboard(db: Db, _agora: Date): Promise<void> {
  const ref = db
    .collection('profissionais')
    .doc(MARINA_CASTELO_UID)
    .collection('dashboard')
    .doc('current');

  // Settle inicial: a maior parte dos triggers de fan-out já drenou durante os
  // passos 2..6; este respiro cobre o grosso da fila antes do loop de confirmação.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const conversao = {
    taxaConversaoPct: CONVERSAO_TAXA_MOCKUP,
    conversaoSparkline: [...CONVERSAO_SPARKLINE_MOCKUP],
    computadoEm: PREVIEW_COMPUTADO_EM_FUTURO,
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Loop write→relê: escreve a conversão e confirma que persistiu. Se um trigger
  // straggler tiver reescrito o doc (conversaoSparkline vazia), reescreve. Encerra
  // após 2 leituras estáveis consecutivas (ou no teto de iterações).
  let estaveis = 0;
  let escreveuAlgumaVez = false;
  for (let i = 0; i < 12 && estaveis < 2; i++) {
    const snap = await ref.get();
    if (!snap.exists) {
      // Sem o doc base (KPIs do fan-out) ainda — espera o trigger criar.
      await new Promise((resolve) => setTimeout(resolve, 600));
      continue;
    }
    const spark = snap.get('conversaoSparkline') as unknown;
    const temSerie = Array.isArray(spark) && spark.length >= 2;
    if (temSerie && escreveuAlgumaVez) {
      estaveis++;
    } else {
      await ref.set(conversao, { merge: true });
      escreveuAlgumaVez = true;
      estaveis = 0;
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  if (estaveis >= 2) {
    console.log(
      `[seed-extra] conversão: taxaConversaoPct=${CONVERSAO_TAXA_MOCKUP}% + sparkline ` +
        `(${CONVERSAO_SPARKLINE_MOCKUP.length} pts, série do mockup) FIXA no dashboard da Marina`
    );
  } else {
    console.warn(
      '[seed-extra] conversão: não estabilizou após 12 tentativas — verifique ' +
        'a fila de triggers de fan-out do Functions Emulator.'
    );
  }
}

// ---------------------------------------------------------------------------
// 8. Overview da Meia Floripa — fidelidade do drill (LEELA-FID-EVT-T3)
// ---------------------------------------------------------------------------

/**
 * Enriquece o evento CANÔNICO Meia Floripa para o Overview fiel ao mockup:
 *   - `capacidade` = 600 (o seed read-only não tem; base do ratio 453/600=76%);
 *   - `data` = agora + 8 dias → a contagem regressiva do hero fica POSITIVA e
 *     "viva" (o mockup mostra "8 dias"; o seed canônico é 27 Abr 2026, no passado
 *     relativo ao preview). Preview-only, merge aditivo (functions/src intocado).
 */
const MEIA_CAPACIDADE = 600;
const MEIA_DIAS_ATE_PROVA = 8;

async function seedMeiaFloripaFidelidade(db: Db, agora: Date): Promise<void> {
  const dataProva = new Date(agora.getTime() + MEIA_DIAS_ATE_PROVA * DIA_MS);
  // Mantém a hora de largada 06:00 do mockup, no dia +8.
  dataProva.setHours(6, 0, 0, 0);
  await db.collection('eventos').doc(MEIA_FLORIPA_ID).set(
    {
      capacidade: MEIA_CAPACIDADE,
      data: ts(dataProva),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(
    `[seed-extra] meia floripa: capacidade=${MEIA_CAPACIDADE} + data +${MEIA_DIAS_ATE_PROVA}d (hero de contagem regressiva vivo)`
  );
}

// ---------------------------------------------------------------------------
// 9. Analytics do Overview (gap E12) — injeção por cima de financeiro/current
// ---------------------------------------------------------------------------

/**
 * Injeta em `eventos/{meia}/financeiro/current` os campos de analytics que a
 * Onda 1 ainda NÃO computa (dependem de VISITAS/série temporal — gap E12, mesma
 * classe da conversão do dashboard): taxa de conversão, Δ semana, série do ticket
 * e receita por modalidade (valores do mockup, somando os R$ 85.617 confirmados).
 *
 * Por que aqui: `getFinanceiroEvento` lê estes campos OPCIONAIS; ausentes em
 * produção, o Overview degrada (esconde sparkline/conversão/donut). O agregado é
 * reescrito por `recomputarFinanceiroEvento` com set() INTEGRAL a cada write de
 * inscrito (os carimbos de entrega da Meia disparam onInscritoWrite). Por isso
 * este é o ÚLTIMO passo e usa o mesmo loop write→relê-estável da conversão: um
 * straggler de recompute apagaria os campos; reescrevemos até 2 leituras estáveis.
 * Emulator-only e idempotente.
 */
const TICKET_SPARKLINE_MOCKUP = [156, 162, 171, 168, 177, 181, 189] as const;
const OVERVIEW_ANALYTICS = {
  taxaConversaoPct: 42,
  receitaSemana: 12400,
  ticketSparkline: [...TICKET_SPARKLINE_MOCKUP],
  // Soma = 85.617 (espelha o ∑ receitaConfirmada). Chaves = percursos do evento.
  receitaPorModalidade: { '5k': 17124, '10k': 27397, '21k': 41096 },
};

async function seedOverviewAnalytics(db: Db): Promise<void> {
  const ref = db.collection('eventos').doc(MEIA_FLORIPA_ID).collection('financeiro').doc('current');

  await new Promise((resolve) => setTimeout(resolve, 1200));

  let estaveis = 0;
  let escreveu = false;
  for (let i = 0; i < 12 && estaveis < 2; i++) {
    const snap = await ref.get();
    if (!snap.exists) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      continue;
    }
    const spark = snap.get('ticketSparkline') as unknown;
    const persistiu = Array.isArray(spark) && spark.length >= 2;
    if (persistiu && escreveu) {
      estaveis++;
    } else {
      await ref.set(OVERVIEW_ANALYTICS, { merge: true });
      escreveu = true;
      estaveis = 0;
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  if (estaveis >= 2) {
    console.log(
      '[seed-extra] overview analytics: conversão 42% · Δ semana R$ 12.400 · ' +
        'ticket sparkline · receita por modalidade FIXOS em financeiro/current da Meia'
    );
  } else {
    console.warn(
      '[seed-extra] overview analytics: não estabilizou após 12 tentativas — ' +
        'verifique a fila de onInscritoWrite do Functions Emulator.'
    );
  }
}

// ---------------------------------------------------------------------------
// Orquestração
// ---------------------------------------------------------------------------

/** Aplica todos os dados extras do preview (aditivo e idempotente). */
/**
 * Perfil público do organizador (LEELA-R12 · Frente 3) — `perfis/{handle}`.
 * Sem ele, a página `/@{handle}` (calendário/timeline do organizador) só existe
 * após criação manual no painel; aqui damos ao preview um handle REAL do tenant
 * Castelo (Marina) para a review da timeline + patrocinadores ponta a ponta.
 * `indexavel` (RN-161) para render + metadata. `ownerUid`/`tenantId` são
 * privados (nunca saem na projeção — o leitor os usa só server-side). Additivo
 * e idempotente (docId fixo = handle). @handle público = `castelo`.
 */
async function seedPerfilOrganizador(db: Db): Promise<void> {
  await upsert(db.collection(COLECAO_PERFIS).doc('castelo'), {
    handle: 'castelo',
    tipo: 'organizador',
    ownerUid: MARINA_CASTELO_UID,
    tenantId: CASTELO_TENANT_ID,
    nome: 'Castelo Produções',
    bio: 'Corridas, MTB, trail e bem-estar em Florianópolis. Calendário da temporada logo abaixo.',
    visibilidade: 'indexavel',
    linksExternos: [
      { label: 'Instagram', url: 'https://instagram.com/casteloproducoes' },
      { label: 'Site oficial', url: 'https://castelo-producoes.example.com' },
    ],
  });
  console.log('[seed-extra] perfil público: +1 (@castelo — organizador Castelo Produções)');
}

export async function seedPreviewExtra(
  db: Db,
  agora: Date = new Date()
): Promise<void> {
  assertEmulatorOnly('seedPreviewExtra');

  await seedEventosExtra(db, agora);
  await seedPerfilOrganizador(db);
  await seedKernelVendasExtra(db);
  await seedCapasCanonicas(db);
  await seedMeiaFloripaFidelidade(db, agora);
  await seedKitsExtra(db);
  await seedInscritosExtra(db, agora);
  await seedEntregasMeiaFloripa(db, agora);
  await seedAtividadeRecenteMeia(db, agora);
  await seedClubeExtra(db, agora);
  await seedPlataformaExtra(db);
  await recomputarFinanceiros(db);
  // Últimos toques (após os triggers de fan-out/financeiro drenarem):
  await seedConversaoDashboard(db, agora);
  await seedOverviewAnalytics(db);

  console.log('[seed-extra] OK — dados extras do preview aplicados.');
}

// ---------------------------------------------------------------------------
// Entry point (execução direta contra o Emulator do preview)
// ---------------------------------------------------------------------------

if (require.main === module) {
  const fsHost = process.env['FIRESTORE_EMULATOR_HOST'];
  if (!fsHost) {
    console.error(
      '[seed-extra] FIRESTORE_EMULATOR_HOST precisa estar definido ' +
        '(ex.: 127.0.0.1:8180 no preview). Abortando para nunca tocar produção.'
    );
    process.exit(1);
  }
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: process.env['GCLOUD_PROJECT'] ?? 'demo-leela' });
  }
  console.log(`[seed-extra] Firestore → ${fsHost}`);
  seedPreviewExtra(admin.firestore())
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error('[seed-extra] ERRO:', err);
      process.exit(1);
    });
}
