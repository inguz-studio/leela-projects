// =============================================================================
// functions/scripts/mock-campeche-seed.ts — evento "[Mock] - Campeche Run"
//
// Por que existe: o dono não conseguia validar gráficos e telas do painel por
// falta de dado mockado. Este seed cria UM evento rico o bastante para acender
// as telas de verdade — no EMULADOR, nunca em produção (a purga de 10/08
// limpou produção de dado de teste; venda de mentira corromperia os agregados
// honestos de lá).
//
// ADITIVO por cima do `preview-seed.ts` (que continua sendo o seed base do
// mundo da Marina). Roda DEPOIS dele: reusa o tenant `castelo-producoes`, a
// conta `marina@demo-leela.dev` e os termos comerciais já semeados — sem termo
// no tenant, `receitaLiquida` nasce null e o card "Disponível para Repasse"
// fica em "—" (RN-406, sem fallback).
//
// Fora de `functions/src/` de propósito (mesma escolha do preview-seed-extra):
// é ferramenta de preview, não código de produção — não entra em build,
// deploy, type-check nem vitest das Functions.
//
// ── AGREGADOS: RECOMPUTADOS, NUNCA CHUMBADOS ────────────────────────────────
// Todo ∑ sai da MESMA rotina que a Cloud Function usa em produção
// (recomputarFinanceiroEvento / recomputarDemografiaEvento /
// recomputarAprovisionamentoEvento / aplicarWriteInscritoNoCrm /
// recomputarParticipacao / recontarMembrosAtivos). Número inventado à mão é a
// classe de defeito que faz o painel contar uma história que o banco não
// sustenta — e é exatamente o que o dono está tentando conferir aqui.
//
// ── IDEMPOTÊNCIA ────────────────────────────────────────────────────────────
// docIds fixos + set/merge; os instantes derivam da ÂNCORA DO DIA CIVIL (hoje
// ao meio-dia), não de `Date.now()`: rodar o seed 2× no mesmo dia reescreve
// exatamente o mesmo dado, e nunca duplica em dia nenhum.
//
// ── POR QUE AS DATAS SÃO RELATIVAS A HOJE ───────────────────────────────────
// `LEELA_CLOCK=2026-03-15` só é lido pelo checkout SOB o Functions Emulator
// (relogioCheckout.ts) — vigência de lote e preço. O PAINEL roda no relógio
// REAL do navegador. O dataset canônico do preview foi desenhado para
// mar/2026, então hoje ele cai inteiro no passado: a tendência de inscrições
// (7d vs 7d) zera e o feed de atividade recente morre. Este seed ancora em
// HOJE de propósito.
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  derivarStatus,
  roundMoney,
  buildInstallmentOptions,
  DEFAULT_COMMERCIAL_TERMS,
  montarItensDoPedido,
  MOTIVO_CANCELAMENTO_PIX_EXPIRADO,
} from '@leela/core';

import { assertEmulatorOnly } from '../src/seed/emulator-guard';
import { CASTELO_TENANT_ID, MARINA_CASTELO_UID } from '../src/seed/tenants.seed';
import { recomputarFinanceiroEvento } from '../src/eventos/agregarFinanceiro';
import { recomputarDemografiaEvento } from '../src/analytics/agregarDemografia';
import { recomputarAprovisionamentoEvento } from '../src/eventos/agregarEstoque';
import { aplicarWriteInscritoNoCrm } from '../src/crm/agregarClientes';
import { syncItemUsadoEm } from '../src/eventos/itemKitIndex';
import { recontarMembrosAtivos } from '../src/clubs/membrosAggregates';
import { recontarDesafiosAtivos } from '../src/clubs/desafiosAggregates';
import { recomputarParticipacao } from '../src/jornada/onRegistroWrite';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Identidade do mock (docIds FIXOS → idempotência)
// ---------------------------------------------------------------------------

/** Rótulo do dono, preservado sem retoque. */
export const MOCK_EVENTO_NOME = '[Mock] - Campeche Run';
export const MOCK_EVENTO_ID = 'mock-campeche-run';

const MODALIDADES = ['5k', '10k', '21k'] as const;
type Modalidade = (typeof MODALIDADES)[number];

/** Preço de referência por modalidade (premissa do mock — documentada). */
const PRECO_POR_MODALIDADE: Record<Modalidade, number> = {
  '5k': 120,
  '10k': 160,
  '21k': 220,
};

/**
 * Vagas do evento. `capacidade` é campo do EVENTO e é o que acende o bloco
 * Ocupação (VG e Engajamento): sem ele o painel não tem denominador e o
 * gráfico nasce vazio — os eventos canônicos do preview não o trazem, e é por
 * isso que a Ocupação parecia quebrada.
 */
const CAPACIDADE = 360;
/** 336/360 = 93% → acima do limiar de 90%, o alerta de lotação acende. */
const N_INSCRITOS = 336;

const DIA_MS = 24 * 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;

const ITEM_CAMISETA_ID = 'camiseta-campeche';
const TAMANHOS = ['PP', 'P', 'M', 'G', 'GG', 'XG'] as const;

/** Bairros reais do Campeche e do Sul da Ilha (+ resto de Floripa). */
const BAIRROS_FLORIPA = [
  'Campeche', 'Rio Tavares', 'Morro das Pedras', 'Armação do Pântano do Sul',
  'Pântano do Sul', 'Ribeirão da Ilha', 'Lagoa da Conceição', 'Córrego Grande',
  'Itacorubi', 'Trindade', 'Centro', 'Santa Mônica', 'Coqueiros', 'Estreito',
  'Saco dos Limões', 'José Mendes', 'Santo Antônio de Lisboa', 'Ingleses',
] as const;

const NOMES = [
  'Marina', 'Rafael', 'Camila', 'Otávio', 'Beatriz', 'Enzo', 'Helena', 'Diego',
  'Larissa', 'Murilo', 'Sofia', 'Caio', 'Manuela', 'Igor', 'Clara', 'Davi',
  'Alice', 'Heitor', 'Valentina', 'Theo', 'Cecília', 'Benício', 'Laura', 'Noah',
] as const;
const SOBRENOMES = [
  'Bittencourt', 'Sartori', 'Vasconcelos', 'Guimarães', 'Peixoto', 'Dutra',
  'Queiroz', 'Xavier', 'Amaral', 'Teixeira', 'Sales', 'Vieira', 'Prado',
  'Camargo', 'Siqueira', 'Farias',
] as const;

const GENEROS = ['feminino', 'masculino', 'outro'] as const;
/**
 * Faixas etárias povoadas. O cohort idade×sexo é suprimido por k-anonimato
 * (K_MIN_COHORT = 5): célula com 1..4 pessoas apaga a LINHA inteira. 8 faixas
 * × 3 gêneros = 24 células; com ~300 confirmados dá ~12 por célula, folgado
 * acima do k — o cohort desenha inteiro em vez de nascer censurado.
 */
const IDADES_ALVO = [21, 27, 32, 37, 42, 47, 52, 57] as const;

// ---------------------------------------------------------------------------
// Âncora temporal
// ---------------------------------------------------------------------------

/** Hoje ao meio-dia local — reruns no mesmo dia produzem o MESMO dado. */
function ancoraDoDia(): Date {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 12, 0, 0, 0);
}

const ts = (d: Date): Timestamp => Timestamp.fromDate(d);
const pad2 = (n: number): string => String(n).padStart(2, '0');
const isoDia = (d: Date): string =>
  `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;

/** set(merge) preservando `criadoEm` (padrão F8 dos seeds da casa). */
async function upsert(
  ref: admin.firestore.DocumentReference,
  data: Record<string, unknown>,
  criadoEm?: Timestamp
): Promise<void> {
  const snap = await ref.get();
  const payload: Record<string, unknown> = { ...data, atualizadoEm: FieldValue.serverTimestamp() };
  if (!snap.exists) payload['criadoEm'] = criadoEm ?? FieldValue.serverTimestamp();
  await ref.set(payload, { merge: true });
}

/** CPF determinístico VÁLIDO (DV módulo 11) — o parse do [reg] é fail-fast. */
function cpfDeterministico(i: number): string {
  const base = String(310_000_000 + i * 7_919).slice(-9);
  const dv = (digitos: string): number => {
    const corte = digitos.length;
    let soma = 0;
    for (let k = 0; k < corte; k++) soma += Number(digitos[k]) * (corte + 1 - k);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const dv1 = dv(base);
  const dv2 = dv(base + String(dv1));
  const cpf = `${base}${dv1}${dv2}`;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

// ---------------------------------------------------------------------------
// Geração determinística dos inscritos
// ---------------------------------------------------------------------------

type StatusInscrito = 'confirmado' | 'pendente' | 'cancelado' | 'estornado';
type KitId = 'kit_ouro' | 'kit_prata' | 'kit_basico' | 'sem_kit';

interface InscritoMock {
  id: string;
  indice: number;
  nome: string;
  status: StatusInscrito;
  modalidade: Modalidade;
  kit: KitId;
  tamanho: string;
  genero: (typeof GENEROS)[number];
  idade: number;
  bairro: string;
  criadoEm: Date;
  /** Retirou kit / fez check-in (subconjunto determinístico dos confirmados) */
  compareceu: boolean;
}

/**
 * Status determinístico. Os módulos (47/31/17) são propositalmente primos e
 * desalinhados do período 24 do par (faixa etária × gênero): assim os não
 * confirmados se espalham por todas as células do cohort em vez de esvaziar
 * algumas e derrubá-las abaixo do k-anonimato.
 */
function statusPorIndice(i: number): StatusInscrito {
  if (i % 47 === 3) return 'estornado';
  if (i % 31 === 5) return 'cancelado';
  if (i % 17 === 2) return 'pendente';
  return 'confirmado';
}

function kitPorModalidade(m: Modalidade, i: number): KitId {
  if (m === '21k') return i % 3 === 0 ? 'kit_ouro' : 'kit_prata';
  if (m === '10k') return i % 4 === 0 ? 'kit_prata' : 'kit_basico';
  return i % 9 === 0 ? 'sem_kit' : 'kit_basico';
}

function gerarInscritos(ancora: Date): InscritoMock[] {
  const lista: InscritoMock[] = [];
  // Vendas espalhadas em ~120 dias até hoje: a janela de 7d vs 7d que a
  // tendência de inscrições compara nasce povoada dos dois lados.
  const passoMs = Math.round((120 * DIA_MS) / N_INSCRITOS);

  for (let i = 0; i < N_INSCRITOS; i++) {
    const modalidade = MODALIDADES[i % 3] as Modalidade;
    const status = statusPorIndice(i);
    lista.push({
      id: `mock-insc-${String(i + 1).padStart(4, '0')}`,
      indice: i,
      nome: `${NOMES[i % NOMES.length] as string} ${SOBRENOMES[Math.floor(i / NOMES.length) % SOBRENOMES.length] as string}`,
      status,
      modalidade,
      kit: kitPorModalidade(modalidade, i),
      tamanho: TAMANHOS[i % TAMANHOS.length] as string,
      genero: GENEROS[Math.floor(i / IDADES_ALVO.length) % GENEROS.length] as (typeof GENEROS)[number],
      idade: IDADES_ALVO[i % IDADES_ALVO.length] as number,
      bairro: BAIRROS_FLORIPA[i % BAIRROS_FLORIPA.length] as string,
      criadoEm: new Date(ancora.getTime() - (N_INSCRITOS - 1 - i) * passoMs),
      compareceu: status === 'confirmado' && i % 5 <= 1,
    });
  }
  return lista;
}

// ---------------------------------------------------------------------------
// 1. Evento + lotes + kits + itens
// ---------------------------------------------------------------------------

async function seedEvento(db: Db, ancora: Date, dataProva: Date, receita: number): Promise<void> {
  const ref = db.collection('eventos').doc(MOCK_EVENTO_ID);
  await upsert(
    ref,
    {
      id: MOCK_EVENTO_ID,
      tenantId: CASTELO_TENANT_ID,
      organizadorId: MARINA_CASTELO_UID,
      nome: MOCK_EVENTO_NOME,
      data: ts(dataProva),
      local: 'Campeche — Florianópolis/SC',
      modalidades: [...MODALIDADES],
      slug: MOCK_EVENTO_ID,
      status: 'publicado',
      usaChip: true,
      capacidade: CAPACIDADE,
      qtdInscritos: N_INSCRITOS,
      receitaConfirmada: receita,
      janelasEntrega: [
        {
          dia: isoDia(new Date(dataProva.getTime() - 2 * DIA_MS)),
          horaInicio: '10:00',
          horaFim: '20:00',
          local: 'Arena Campeche — Av. Pequeno Príncipe',
        },
        {
          dia: isoDia(new Date(dataProva.getTime() - 1 * DIA_MS)),
          horaInicio: '10:00',
          horaFim: '18:00',
          local: 'Arena Campeche — Av. Pequeno Príncipe',
        },
      ],
      faixaChips: { inicio: 9001, fim: 9400 },
    },
    ts(new Date(ancora.getTime() - 130 * DIA_MS))
  );

  // Lotes por modalidade: L1 encerrado, L2 VIGENTE (cobre hoje), L3 futuro.
  // Janelas relativas a hoje — o painel lê o relógio real, não o LEELA_CLOCK.
  const janelas = [
    { ordem: 1, nome: 'Lote Promocional', ini: -125, fim: -60, fator: 1, limite: 120, vendidos: 120 },
    { ordem: 2, nome: 'Lote 2', ini: -60, fim: 15, fator: 1.2, limite: 160, vendidos: 148 },
    { ordem: 3, nome: 'Lote Final', ini: 15, fim: 44, fator: 1.45, limite: 80, vendidos: 0 },
  ];
  const batch = db.batch();
  for (const m of MODALIDADES) {
    for (const j of janelas) {
      const id = `${m}-lote-${j.ordem}`;
      batch.set(
        ref.collection('lotes').doc(id),
        {
          id,
          tenantId: CASTELO_TENANT_ID,
          modalidade: m,
          ordem: j.ordem,
          nome: j.nome,
          inicioEm: ts(new Date(ancora.getTime() + j.ini * DIA_MS)),
          fimEm: ts(new Date(ancora.getTime() + j.fim * DIA_MS)),
          quantidadeLimite: j.limite,
          preco: Math.round(PRECO_POR_MODALIDADE[m] * j.fator),
          vendidos: Math.round(j.vendidos / 3),
          atualizadoEm: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  }
  await batch.commit();

  // Kits — docId = valor do enum KitInscrito, senão o join do Estoque não casa.
  const kits = [
    { id: 'kit_ouro', nome: 'Kit Ouro Campeche', preco: 95, capacidade: 60, modalidades: ['21k'],
      descricao: 'A experiência completa da prova: camiseta técnica, medalha e sacola.',
      itens: ['Camiseta técnica Campeche Run', 'Medalha de finisher', 'Sacola do evento', 'Número de peitoral com chip'] },
    { id: 'kit_prata', nome: 'Kit Prata', preco: 45, capacidade: 140, modalidades: ['10k', '21k'],
      descricao: 'Camiseta técnica e cronometragem para encarar a orla.',
      itens: ['Camiseta técnica Campeche Run', 'Número de peitoral com chip'] },
    { id: 'kit_basico', nome: 'Kit básico', preco: 0, capacidade: 140, modalidades: ['5k', '10k'],
      descricao: 'O essencial para correr no Campeche.',
      itens: ['Camiseta técnica Campeche Run', 'Número de peitoral com chip'] },
    { id: 'sem_kit', nome: 'Sem kit', preco: -15, capacidade: 20, modalidades: ['5k'],
      descricao: 'Inscrição com desconto, sem kit — vaga e resultado oficial garantidos.',
      itens: ['Número de peitoral com chip', 'Cronometragem oficial'] },
  ];
  for (const k of kits) {
    await upsert(ref.collection('kits').doc(k.id), { ...k, tenantId: CASTELO_TENANT_ID });
  }

  // Item TAMANHADO — é o que gera os SKUs do aprovisionamento (gráfico de
  // camisetas por tamanho no CRM). `tamanhosDisponiveis` = grade unissex
  // legada ⇒ SKU `itemId__tamanho`, casando com `inscrito.tamanhos[itemId]`.
  await upsert(db.collection('itensKit').doc(ITEM_CAMISETA_ID), {
    id: ITEM_CAMISETA_ID,
    tenantId: CASTELO_TENANT_ID,
    eventoId: MOCK_EVENTO_ID,
    nome: 'Camiseta técnica Campeche Run',
    tamanhado: true,
    tamanhosDisponiveis: [...TAMANHOS],
    origem: 'organizador',
    exibirLogo: false,
    kits: ['kit_ouro', 'kit_prata', 'kit_basico'],
  });
  await syncItemUsadoEm(db, ITEM_CAMISETA_ID);

  console.log(`[mock-campeche] evento "${MOCK_EVENTO_NOME}" + 9 lotes + 4 kits + 1 item tamanhado`);
}

// ---------------------------------------------------------------------------
// 2. Inscritos (com [reg] completo — é o que acende a demografia)
// ---------------------------------------------------------------------------

async function seedInscritos(db: Db, inscritos: InscritoMock[], dataProva: Date): Promise<void> {
  const col = db.collection('eventos').doc(MOCK_EVENTO_ID).collection('inscritos');

  for (let ini = 0; ini < inscritos.length; ini += 150) {
    const batch = db.batch();
    for (const p of inscritos.slice(ini, ini + 150)) {
      // Nascimento derivado da DATA DO EVENTO (a demografia calcula idade
      // contra a data civil da prova, não contra hoje) menos 30 dias, para o
      // aniversário já ter passado e a faixa etária ser exata.
      const nasc = new Date(
        Date.UTC(dataProva.getFullYear() - p.idade, dataProva.getMonth(), dataProva.getDate())
      );
      nasc.setUTCDate(nasc.getUTCDate() - 30);

      const doc: Record<string, unknown> = {
        id: p.id,
        tenantId: CASTELO_TENANT_ID,
        atletaId: `mock-atleta-${String(p.indice + 1).padStart(4, '0')}`,
        atletaNome: p.nome,
        kit: p.kit,
        status: p.status,
        modalidade: p.modalidade,
        chipNumero: p.compareceu ? `CHIP-${String(9000 + p.indice)}` : null,
        tamanhos: p.kit === 'sem_kit' ? {} : { [ITEM_CAMISETA_ID]: p.tamanho },
        dadosPessoais: {
          cpf: cpfDeterministico(p.indice + 1),
          telefone: `(48) 9${String(10_000_000 + p.indice * 137).slice(-8, -4)}-${String(10_000_000 + p.indice * 137).slice(-4)}`,
          nascimento: isoDia(nasc),
          genero: p.genero,
          cidade: 'Florianópolis',
          uf: 'SC',
          contatoEmergencia: {
            nome: `Contato de ${p.nome}`,
            telefone: `(48) 3${String(1_000_000 + p.indice * 211).slice(-7, -4)}-${String(1_000_000 + p.indice * 211).slice(-4)}`,
          },
        },
        criadoEm: ts(p.criadoEm),
        atualizadoEm: ts(p.criadoEm),
      };
      if (p.compareceu) {
        const atendido = new Date(p.criadoEm.getTime() + 3 * DIA_MS);
        doc['kitEntregueEm'] = ts(atendido);
        doc['checkinEm'] = ts(atendido);
      }
      batch.set(col.doc(p.id), doc, { merge: true });
    }
    await batch.commit();
  }

  const porStatus = inscritos.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `[mock-campeche] inscritos: ${inscritos.length} ` +
      `(${Object.entries(porStatus).map(([k, v]) => `${k} ${v}`).join(' · ')}) ` +
      `· ${inscritos.filter((p) => p.compareceu).length} com kit retirado + check-in`
  );
}

// ---------------------------------------------------------------------------
// 3. Pedidos + pagamentos: PIX nos 3 estados, cartão parcelado e estorno
// ---------------------------------------------------------------------------

interface DefPedido {
  seq: number;
  /** Índices (0-based) dos inscritos; o primeiro é o responsável */
  inscritos: number[];
  forma: 'pix' | 'cartao_credito';
  parcelas?: number;
  /** Estado comercial que este pedido exercita */
  caso: 'pix_confirmado' | 'pix_pendente' | 'pix_vencido' | 'cartao_confirmado' | 'estornado';
}

/**
 * Cobertura dos estados que o dono pediu. Os índices casam com o status do
 * inscrito gerado (statusPorIndice): pendente em i%17==2, cancelado em
 * i%31==5, estornado em i%47==3 — um pedido vencido apontando para um
 * inscrito confirmado contaria duas histórias diferentes sobre a mesma venda.
 */
const DEFS_PEDIDOS: readonly DefPedido[] = [
  { seq: 1, inscritos: [0, 1, 6], forma: 'cartao_credito', parcelas: 12, caso: 'cartao_confirmado' },
  { seq: 2, inscritos: [9], forma: 'pix', caso: 'pix_confirmado' },
  { seq: 3, inscritos: [12, 13], forma: 'cartao_credito', parcelas: 6, caso: 'cartao_confirmado' },
  { seq: 4, inscritos: [15, 16], forma: 'pix', caso: 'pix_confirmado' },
  { seq: 5, inscritos: [18], forma: 'cartao_credito', parcelas: 3, caso: 'cartao_confirmado' },
  { seq: 6, inscritos: [20, 21, 22], forma: 'pix', caso: 'pix_confirmado' },
  { seq: 7, inscritos: [24], forma: 'cartao_credito', parcelas: 1, caso: 'cartao_confirmado' },
  { seq: 8, inscritos: [27, 28], forma: 'pix', caso: 'pix_confirmado' },
  { seq: 9, inscritos: [30], forma: 'cartao_credito', parcelas: 10, caso: 'cartao_confirmado' },
  { seq: 10, inscritos: [33, 34], forma: 'pix', caso: 'pix_confirmado' },
  // PIX PENDENTE — cobrança criada, dentro do prazo, aguardando o webhook
  { seq: 11, inscritos: [19], forma: 'pix', caso: 'pix_pendente' },
  { seq: 12, inscritos: [36], forma: 'pix', caso: 'pix_pendente' },
  { seq: 13, inscritos: [53], forma: 'pix', caso: 'pix_pendente' },
  // PIX VENCIDO — a cobrança expirou e a varredura cancelou (RN-545)
  { seq: 14, inscritos: [5], forma: 'pix', caso: 'pix_vencido' },
  { seq: 15, inscritos: [67], forma: 'pix', caso: 'pix_vencido' },
  // ESTORNO — dinheiro devolvido ao pagador (FABLE-B)
  { seq: 16, inscritos: [3], forma: 'pix', caso: 'estornado' },
  { seq: 17, inscritos: [50], forma: 'cartao_credito', parcelas: 4, caso: 'estornado' },
];

const BANDEIRAS = ['Visa', 'Mastercard', 'Elo'] as const;
const TAXA_PCT = 8;

async function seedPedidos(db: Db, inscritos: InscritoMock[], ancora: Date): Promise<void> {
  const inscritosCol = db.collection('eventos').doc(MOCK_EVENTO_ID).collection('inscritos');
  const batch = db.batch();
  let reembolsos = 0;

  for (const def of DEFS_PEDIDOS) {
    const seq = String(def.seq).padStart(4, '0');
    const pedidoId = `mock-ped-${seq}`;
    const pagamentoId = `mock-pag-${seq}`;
    const membros = def.inscritos.map((i) => inscritos[i] as InscritoMock);
    const responsavel = membros[0] as InscritoMock;
    const criadoEm = new Date(Math.max(...membros.map((m) => m.criadoEm.getTime())));

    const valorBase = roundMoney(
      membros.reduce((s, m) => s + PRECO_POR_MODALIDADE[m.modalidade], 0)
    );
    const desconto = 0;
    const valorFinal = roundMoney(valorBase - desconto);

    // ── Pagamento ─────────────────────────────────────────────────────────
    const pago = def.caso === 'cartao_confirmado' || def.caso === 'pix_confirmado';
    let statusPagamento: string;
    switch (def.caso) {
      case 'pix_pendente': statusPagamento = 'pendente'; break;
      case 'pix_vencido': statusPagamento = 'cancelado'; break;
      case 'estornado': statusPagamento = 'estornado'; break;
      default: statusPagamento = 'confirmado';
    }

    const pagamento: Record<string, unknown> = {
      id: pagamentoId,
      tenantId: CASTELO_TENANT_ID,
      eventoId: MOCK_EVENTO_ID,
      pedidoRef: pedidoId,
      status: statusPagamento,
      forma: def.forma,
      valorBase,
      loteNome: 'Lote 2',
      desconto,
      valorFinal,
      criadoEm: ts(criadoEm),
      atualizadoEm: ts(criadoEm),
    };

    if (def.forma === 'cartao_credito') {
      const parcelas = def.parcelas ?? 1;
      const opcao = buildInstallmentOptions(valorFinal, {
        maxParcelas: parcelas,
        jurosAoMes: DEFAULT_COMMERCIAL_TERMS.installmentRules.jurosAoMes,
        // O seed precifica um pedido que JÁ existe: o corte por parcela
        // mínima é regra de OFERTA e não pode reescrever histórico.
        parcelaMinima: 0,
      }).find((o) => o.parcelas === parcelas);
      if (opcao === undefined) throw new Error(`[mock-campeche] ${parcelas}x indisponível`);
      pagamento['cartao'] = {
        bandeira: BANDEIRAS[def.seq % BANDEIRAS.length] as string,
        ultimos4: String(5_000 + def.seq * 97).slice(-4),
        parcelas,
        valorParcela: opcao.valorParcela,
        valorTotalComJuros: opcao.valorTotal,
      };
    }

    if (def.caso === 'pix_pendente') {
      // Cobrança PIX viva: vence 30 min depois da criação (RN-157).
      pagamento['pixExpiraEm'] = ts(new Date(ancora.getTime() + 20 * 60 * 1000));
      pagamento['criadoEm'] = ts(new Date(ancora.getTime() - 10 * 60 * 1000));
      pagamento['atualizadoEm'] = ts(new Date(ancora.getTime() - 10 * 60 * 1000));
    }
    if (def.caso === 'pix_vencido') {
      pagamento['pixExpiraEm'] = ts(new Date(criadoEm.getTime() + 30 * 60 * 1000));
      pagamento['canceladoMotivo'] = MOTIVO_CANCELAMENTO_PIX_EXPIRADO;
      pagamento['canceladoEm'] = ts(new Date(criadoEm.getTime() + 35 * 60 * 1000));
    }
    if (pago || def.caso === 'estornado') {
      const pagoEm = new Date(criadoEm.getTime() + 2 * HORA_MS);
      const taxaValor = roundMoney(valorFinal * (TAXA_PCT / 100));
      pagamento['pagoEm'] = ts(pagoEm);
      pagamento['conciliacao'] = {
        idTransacao: `asaas_tx_campeche_${seq}`,
        gateway: 'asaas',
        adquirente: 'Asaas',
        taxaPct: TAXA_PCT,
        taxaValor,
        repasseOrganizador: roundMoney(valorFinal - taxaValor),
        repassePrevistoEm: ts(new Date(pagoEm.getTime() + 5 * DIA_MS)),
      };
      pagamento['atualizadoEm'] = ts(pagoEm);
    }
    if (def.caso === 'estornado') {
      const estornadoEm = new Date(criadoEm.getTime() + 9 * DIA_MS);
      pagamento['estornadoEm'] = ts(estornadoEm);
      pagamento['valorEstornado'] = valorFinal;
    }
    batch.set(db.collection('pagamentos').doc(pagamentoId), pagamento, { merge: true });

    // ── Pedido ────────────────────────────────────────────────────────────
    let statusPedido: string;
    switch (def.caso) {
      case 'pix_pendente': statusPedido = 'pendente'; break;
      case 'pix_vencido': statusPedido = 'cancelado'; break;
      case 'estornado': statusPedido = 'cancelado'; break;
      default: statusPedido = 'pago';
    }

    const pedido: Record<string, unknown> = {
      id: pedidoId,
      tenantId: CASTELO_TENANT_ID,
      eventoId: MOCK_EVENTO_ID,
      responsavel: {
        atletaId: `mock-atleta-${String(responsavel.indice + 1).padStart(4, '0')}`,
        nome: responsavel.nome,
        email: `mock-atleta-${String(responsavel.indice + 1).padStart(4, '0')}@atleta.leela.dev`,
      },
      inscritoRefs: membros.map((m) => m.id),
      itens: montarItensDoPedido(
        membros.map((m) => ({ inscritoRef: m.id, valorBase: PRECO_POR_MODALIDADE[m.modalidade] })),
        desconto
      ),
      pagamentoRef: pagamentoId,
      valorTotal: valorFinal,
      status: statusPedido,
      // Endereço do pagador: é o único lugar do modelo que carrega BAIRRO
      // (aparece na ficha do cliente da área de plataforma).
      endereco: {
        cep: `880${String(30 + (def.seq % 60)).padStart(2, '0')}-${String(100 + def.seq).slice(-3)}`,
        logradouro: `Rua das Ostras, ${String(100 + def.seq * 7)}`,
        bairro: responsavel.bairro,
        cidade: 'Florianópolis',
        uf: 'SC',
        numero: String(100 + def.seq * 7),
      },
      criadoEm: ts(criadoEm),
      atualizadoEm: ts(criadoEm),
    };
    if (pago) {
      pedido['formaPagamento'] = def.forma;
      if (def.forma === 'cartao_credito') pedido['parcelas'] = def.parcelas ?? 1;
    }
    if (def.caso === 'pix_vencido') pedido['canceladoMotivo'] = MOTIVO_CANCELAMENTO_PIX_EXPIRADO;
    batch.set(db.collection('pedidos').doc(pedidoId), pedido, { merge: true });

    // ── Liga o inscrito ao pedido (é o que o slide-in [pag] segue) ────────
    membros.forEach((m, pos) => {
      batch.set(
        inscritosCol.doc(m.id),
        { pedidoRef: pedidoId, ehResponsavel: pos === 0 },
        { merge: true }
      );
    });

    // ── Reembolso concluído (a aba Reembolsos lista por `criadoEm`) ───────
    if (def.caso === 'estornado') {
      reembolsos += 1;
      const solicitadoEm = new Date(criadoEm.getTime() + 7 * DIA_MS);
      const estornadoEm = new Date(criadoEm.getTime() + 9 * DIA_MS);
      batch.set(
        db.collection('eventos').doc(MOCK_EVENTO_ID).collection('reembolsos').doc(responsavel.id),
        {
          id: responsavel.id,
          tenantId: CASTELO_TENANT_ID,
          eventoId: MOCK_EVENTO_ID,
          pedidoId,
          inscritoId: responsavel.id,
          motivo: 'Lesão no treino — não vou conseguir correr a prova.',
          estado: 'estornado',
          origem: 'atleta',
          valorSolicitado: valorFinal,
          valorEstornado: valorFinal,
          refundId: `asaas_refund_campeche_${seq}`,
          transicoes: [
            { de: null, para: 'solicitado', em: ts(solicitadoEm), por: 'atleta' },
            { de: 'solicitado', para: 'aprovado', em: ts(new Date(solicitadoEm.getTime() + DIA_MS)), por: 'organizador' },
            { de: 'aprovado', para: 'estornado', em: ts(estornadoEm), por: 'plataforma' },
          ],
          criadoEm: ts(solicitadoEm),
          atualizadoEm: ts(estornadoEm),
        },
        { merge: true }
      );
    }
  }

  await batch.commit();
  console.log(
    `[mock-campeche] pedidos: ${DEFS_PEDIDOS.length} pedidos + pagamentos ` +
      `(PIX confirmado/pendente/vencido · cartão 1×–12× · ${reembolsos} estornos) + endereços com bairro`
  );
}

// ---------------------------------------------------------------------------
// 4. Clubes do tenant da Marina (Engajamento) + jornada nos 3 pilares
// ---------------------------------------------------------------------------

interface ClubeMock {
  slug: string;
  nome: string;
  descricao: string;
  categoria: string;
  /** Precisa ser string EXATA de MODALIDADES_CLUBE — é o eixo do gráfico */
  modalidade: string;
  codigoConvite: string;
  qtdMembros: number;
}

const CLUBES_MOCK: readonly ClubeMock[] = [
  {
    slug: 'mock-campeche-run-clube',
    nome: 'Campeche Run Clube',
    descricao:
      'Treinos na orla do Campeche três vezes por semana, do iniciante ao ' +
      'sub-90 na meia. Ponto de encontro na Pequeno Príncipe, 6h.',
    categoria: 'Assessoria esportiva',
    modalidade: 'Corrida de rua',
    codigoConvite: 'CMP01',
    qtdMembros: 24,
  },
  {
    slug: 'mock-trilha-sul-da-ilha',
    nome: 'Trilha Sul da Ilha',
    descricao:
      'Trail run pelas trilhas do Sul da Ilha: Lagoinha do Leste, Naufragados ' +
      'e Costa de Dentro. Saídas aos sábados.',
    categoria: 'Grupo de corrida',
    modalidade: 'Trail',
    codigoConvite: 'TRL02',
    qtdMembros: 14,
  },
  {
    slug: 'mock-respira-campeche',
    nome: 'Respira Campeche',
    descricao:
      'Yoga e respiração para quem corre. Prática de mobilidade na segunda ' +
      'e restaurativa na quinta, na Praça do Campeche.',
    categoria: 'Bem-estar',
    modalidade: 'Bem-estar/Yoga',
    codigoConvite: 'RSP03',
    qtdMembros: 9,
  },
];

const DESAFIO_MOCK_ID = 'mock-campeche-360';

async function seedClubes(db: Db, ancora: Date, dataProva: Date): Promise<void> {
  for (const c of CLUBES_MOCK) {
    const clubeRef = db.collection('clubes').doc(c.slug);
    await upsert(
      clubeRef,
      {
        id: c.slug,
        tenantId: CASTELO_TENANT_ID,
        nome: c.nome,
        descricao: c.descricao,
        slug: c.slug,
        categoria: c.categoria,
        modalidade: c.modalidade,
        localizacao: { cidade: 'Florianópolis', estado: 'SC', online: false },
        ownerId: MARINA_CASTELO_UID,
        codigoConvite: c.codigoConvite,
        visibilidade: 'publica',
        aprovacaoManual: false,
        modeloEntrada: 'gratuito',
      },
      ts(new Date(ancora.getTime() - 500 * DIA_MS))
    );

    // Membros — `status` sai de derivarStatus (mesma função pura da Function).
    for (let i = 0; i < c.qtdMembros; i++) {
      const entrouEm = new Date(ancora.getTime() - ((i * 17) % 420) * DIA_MS);
      // Um punhado sem atividade recente para a barra "inativo" existir.
      const diasSemAtividade = i % 11 === 0 ? 120 : i % 3;
      const ultimaAtividadeEm = new Date(ancora.getTime() - diasSemAtividade * DIA_MS);
      const id = `mock-membro-${c.codigoConvite.toLowerCase()}-${String(i + 1).padStart(2, '0')}`;
      await clubeRef.collection('membros').doc(id).set(
        {
          id,
          tenantId: CASTELO_TENANT_ID,
          atletaId: `mock-atleta-clube-${c.codigoConvite.toLowerCase()}-${String(i + 1).padStart(2, '0')}`,
          atletaNome: `${NOMES[(i * 5) % NOMES.length] as string} ${SOBRENOMES[(i * 3) % SOBRENOMES.length] as string}`,
          papel: i === 0 ? 'owner' : i === 1 ? 'admin' : 'membro',
          entrouVia: (['codigo', 'convite', 'link'] as const)[i % 3] as string,
          entrouEm: ts(entrouEm),
          ultimaAtividadeEm: ts(ultimaAtividadeEm),
          status: derivarStatus(entrouEm, ultimaAtividadeEm, ancora),
        },
        { merge: true }
      );
    }
    await recontarMembrosAtivos(db, c.slug);
  }

  // ── Desafio de equilíbrio (modelo C) no clube principal ─────────────────
  // `minimoPorPilar` é o que faz `derivarProgressoPorPilar` produzir o bloco
  // Pilares; sem ele o card nasce "Sem desafio de equilíbrio".
  const clubePrincipal = CLUBES_MOCK[0] as ClubeMock;
  const desafioRef = db
    .collection('clubes').doc(clubePrincipal.slug)
    .collection('desafios').doc(DESAFIO_MOCK_ID);
  await upsert(
    desafioRef,
    {
      id: DESAFIO_MOCK_ID,
      tenantId: CASTELO_TENANT_ID,
      autorId: MARINA_CASTELO_UID,
      nome: 'Campeche 360 — corpo, mente e espírito',
      descricao:
        'Oito semanas de preparação equilibrada para a Campeche Run: rodagem ' +
        'na orla, leitura e respiração. Mínimo em cada pilar para completar.',
      modelo: 'C',
      dataInicio: ts(new Date(ancora.getTime() - 30 * DIA_MS)),
      dataFim: ts(dataProva),
      status: 'ativo',
      eventoVinculadoId: MOCK_EVENTO_ID,
      metaTotalPontos: 1800,
      minimoPorPilar: { fisico: 300, mental: 200, espiritual: 200 },
      recompensaTipo: 'medalha_digital',
      visibilidade: 'membros',
      qtdParticipantes: 0,
      progressoPct: 0,
    },
    ts(new Date(ancora.getTime() - 32 * DIA_MS))
  );

  const acoesDoDesafio = [
    'correr', 'caminhar', 'pedalar', 'musculacao',
    'ler', 'journaling', 'estudar-curso',
    'meditar', 'respiracao-consciente', 'gratidao-diaria',
  ];
  const acoesBatch = db.batch();
  for (const acaoRef of acoesDoDesafio) {
    acoesBatch.set(desafioRef.collection('acoes').doc(acaoRef), { acaoRef });
  }
  await acoesBatch.commit();

  // Segundo desafio ATIVO (o ranking precisa de mais de uma linha)
  const desafio2Ref = db
    .collection('clubes').doc(clubePrincipal.slug)
    .collection('desafios').doc('mock-orla-100k');
  await upsert(
    desafio2Ref,
    {
      id: 'mock-orla-100k',
      tenantId: CASTELO_TENANT_ID,
      autorId: MARINA_CASTELO_UID,
      nome: 'Orla 100k em 30 dias',
      descricao: 'Some 100 km entre Campeche e Joaquina em 30 dias.',
      modelo: 'A',
      dataInicio: ts(new Date(ancora.getTime() - 12 * DIA_MS)),
      dataFim: ts(new Date(ancora.getTime() + 18 * DIA_MS)),
      status: 'ativo',
      eventoVinculadoId: MOCK_EVENTO_ID,
      recompensaTipo: 'medalha_digital',
      visibilidade: 'membros',
      qtdParticipantes: 0,
      progressoPct: 0,
    },
    ts(new Date(ancora.getTime() - 13 * DIA_MS))
  );
  const acoes2 = db.batch();
  acoes2.set(desafio2Ref.collection('acoes').doc('correr'), { acaoRef: 'correr', meta: 100 });
  await acoes2.commit();

  await recontarDesafiosAtivos(db, clubePrincipal.slug);

  // ── Jornada real: participantes + registros nos 3 pilares ───────────────
  // Os agregados (pontos, pontosPorPilar, progressoPct, progressoPorPilar)
  // saem do recompute da Function — nenhum número é chumbado aqui.
  const atletas = Array.from({ length: 9 }, (_, i) => ({
    uid: `mock-atleta-jornada-${String(i + 1).padStart(2, '0')}`,
    nome: `${NOMES[(i * 7) % NOMES.length] as string} ${SOBRENOMES[(i * 5) % SOBRENOMES.length] as string}`,
  }));

  for (const a of atletas) {
    await upsert(db.collection('atletas').doc(a.uid), {
      id: a.uid,
      nome: a.nome,
      email: `${a.uid}@example.com`,
      avatarInit: a.nome.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(),
    });
  }

  for (const [idx, a] of atletas.entries()) {
    for (const desafioId of [DESAFIO_MOCK_ID, 'mock-orla-100k']) {
      if (desafioId === 'mock-orla-100k' && idx >= 6) continue; // 6 no segundo
      const ref = db
        .collection('clubes').doc(clubePrincipal.slug)
        .collection('desafios').doc(desafioId)
        .collection('participantes').doc(a.uid);
      const snap = await ref.get();
      if (!snap.exists) {
        await ref.set({
          atletaId: a.uid,
          clubeId: clubePrincipal.slug,
          desafioId,
          entrouEm: ts(new Date(ancora.getTime() - (25 - idx) * DIA_MS)),
          pontos: 0,
          pontosPorPilar: { fisico: 0, mental: 0, espiritual: 0 },
          diasAtivos: 0,
        });
      }
    }
  }

  // Registros: cada atleta cobre os TRÊS pilares em dias distintos dentro da
  // janela do desafio (o bônus da RN-115 depende disso).
  const acoesPorPilar = [
    { acaoRef: 'correr', pilar: 'fisico', unidade: 'km', quantidade: 8 },
    { acaoRef: 'caminhar', pilar: 'fisico', unidade: 'km', quantidade: 5 },
    { acaoRef: 'musculacao', pilar: 'fisico', unidade: 'sessoes', quantidade: 1 },
    { acaoRef: 'ler', pilar: 'mental', unidade: 'paginas', quantidade: 30 },
    { acaoRef: 'journaling', pilar: 'mental', unidade: 'sessoes', quantidade: 1 },
    { acaoRef: 'meditar', pilar: 'espiritual', unidade: 'min', quantidade: 20 },
    { acaoRef: 'gratidao-diaria', pilar: 'espiritual', unidade: 'dias', quantidade: 1 },
  ] as const;

  let totalRegistros = 0;
  for (const [idx, a] of atletas.entries()) {
    const batch = db.batch();
    // Quem entrou antes registrou mais — o ranking do desafio ganha ordem.
    const rodadas = 4 + ((9 - idx) % 5);
    for (let r = 0; r < rodadas; r++) {
      for (const [k, acao] of acoesPorPilar.entries()) {
        const diasAtras = 28 - (r * 6 + k % 3);
        if (diasAtras < 0) continue;
        const quando = new Date(ancora.getTime() - diasAtras * DIA_MS + k * HORA_MS);
        const id = `mock-reg-${a.uid}-${r}-${k}`;
        batch.set(db.collection('atletas').doc(a.uid).collection('registros').doc(id), {
          id,
          acaoRef: acao.acaoRef,
          pilar: acao.pilar,
          quantidade: acao.quantidade,
          unidade: acao.unidade,
          data: ts(quando),
          origem: r % 3 === 0 ? 'assessoria' : 'manual',
          clubeId: clubePrincipal.slug,
          desafioId: DESAFIO_MOCK_ID,
          criadoEm: ts(quando),
        });
        totalRegistros += 1;
      }
    }
    await batch.commit();
  }

  // Agregação pela MESMA rotina do trigger (recompute idempotente).
  for (const a of atletas) {
    await recomputarParticipacao(db, a.uid, clubePrincipal.slug, DESAFIO_MOCK_ID);
  }

  console.log(
    `[mock-campeche] clubes: ${CLUBES_MOCK.length} clubes da Marina ` +
      `(${CLUBES_MOCK.map((c) => c.modalidade).join(' · ')}) · ` +
      `${CLUBES_MOCK.reduce((s, c) => s + c.qtdMembros, 0)} membros · ` +
      `2 desafios ativos · ${totalRegistros} registros nos 3 pilares`
  );
}

// ---------------------------------------------------------------------------
// 5. Agregados: recompute pelas rotinas das Functions
// ---------------------------------------------------------------------------

/**
 * `receitaPorModalidade` alimenta o DONUT "Receita por modalidade" e NENHUMA
 * Function o escreve (agregarFinanceiro só produz as contagens). Ele precisa
 * ser injetado por cima — e reescrito enquanto um trigger atrasado ainda
 * puder passar por cima com um `set` integral. O laço write→relê é o mesmo
 * padrão do `seedOverviewAnalytics` do preview-seed-extra.
 */
async function injetarReceitaPorModalidade(
  db: Db,
  receitaPorModalidade: Record<string, number>
): Promise<void> {
  const ref = db.collection('eventos').doc(MOCK_EVENTO_ID).collection('financeiro').doc('current');
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    await ref.set({ receitaPorModalidade }, { merge: true });
    await new Promise((r) => setTimeout(r, 700));
    const snap = await ref.get();
    const atual = snap.get('receitaPorModalidade') as Record<string, number> | undefined;
    if (atual !== undefined && Object.keys(atual).length === Object.keys(receitaPorModalidade).length) {
      // Confirma estabilidade: se um trigger straggler apagar, o próximo laço regrava.
      if (tentativa >= 1) return;
    }
  }
}

async function recomputarAgregados(
  db: Db,
  inscritos: InscritoMock[],
  receitaPorModalidade: Record<string, number>
): Promise<void> {
  const financeiro = await recomputarFinanceiroEvento(db, MOCK_EVENTO_ID);
  const demografia = await recomputarDemografiaEvento(db, MOCK_EVENTO_ID);
  const aprov = await recomputarAprovisionamentoEvento(db, MOCK_EVENTO_ID);

  console.log(
    `[mock-campeche] financeiro/current: bruta R$ ${String(financeiro?.receitaBruta ?? 0)} · ` +
      `líquida ${financeiro?.receitaLiquida === null || financeiro?.receitaLiquida === undefined ? 'null (tenant sem termo)' : `R$ ${String(financeiro.receitaLiquida)}`} · ` +
      `porModalidade ${JSON.stringify(financeiro?.inscritos.porModalidade ?? {})}`
  );
  console.log(
    `[mock-campeche] demografia/current: ${String(demografia?.totalConfirmados ?? 0)} confirmados ` +
      `· faixas ${JSON.stringify(demografia?.faixasEtarias ?? {})}`
  );
  console.log(
    `[mock-campeche] aprovisionamento: ${String(aprov?.skus ?? 0)} SKUs de camiseta ` +
      `· vendidos ${JSON.stringify(aprov?.vendidoPorSku ?? {})}`
  );

  await injetarReceitaPorModalidade(db, receitaPorModalidade);
  console.log(
    `[mock-campeche] receitaPorModalidade injetado (o donut não tem Function dona): ${JSON.stringify(receitaPorModalidade)}`
  );

  // CRM: só confirmado/estornado entram (P-E19-6 — perfil de quem comprou).
  const elegiveis = inscritos.filter((p) => p.status === 'confirmado' || p.status === 'estornado');
  const col = db.collection('eventos').doc(MOCK_EVENTO_ID).collection('inscritos');
  let clientes = 0;
  for (const p of elegiveis) {
    const snap = await col.doc(p.id).get();
    if (!snap.exists) continue;
    await aplicarWriteInscritoNoCrm(db, MOCK_EVENTO_ID, p.id, null, snap.data() ?? null);
    clientes += 1;
  }
  console.log(`[mock-campeche] CRM: ${clientes} clientes consolidados em tenants/${CASTELO_TENANT_ID}/crmClientes`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const fsHost = process.env['FIRESTORE_EMULATOR_HOST'];
  if (!fsHost) {
    throw new Error(
      '[mock-campeche] FIRESTORE_EMULATOR_HOST não definido. Este seed é ' +
        'EMULATOR-ONLY e aborta para nunca tocar produção. Use ' +
        '`bash scripts/mock-campeche.sh up`.'
    );
  }
  assertEmulatorOnly('mockCampeche');

  if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-leela' });
  const db = admin.firestore();

  console.log(`[mock-campeche] Firestore → ${fsHost}`);

  const ancora = ancoraDoDia();
  // Prova a 44 dias: o Countdown da Visão geral escolhe o evento futuro mais
  // próximo, e o Lote 2 (que vai até +15d) fica vigente hoje.
  const dataProva = new Date(ancora.getTime() + 44 * DIA_MS);
  dataProva.setHours(7, 0, 0, 0);

  const inscritos = gerarInscritos(ancora);
  const confirmados = inscritos.filter((p) => p.status === 'confirmado');

  // Receita do evento = Σ do preço da modalidade dos CONFIRMADOS. Premissa do
  // mock, coerente com a tabela de preços acima — `receitaBruta` do agregado
  // é espelho deste campo (a Function nunca a deriva de contagem × preço).
  const receita = roundMoney(
    confirmados.reduce((s, p) => s + PRECO_POR_MODALIDADE[p.modalidade], 0)
  );
  const receitaPorModalidade: Record<string, number> = {};
  for (const m of MODALIDADES) {
    receitaPorModalidade[m] = roundMoney(
      confirmados.filter((p) => p.modalidade === m).length * PRECO_POR_MODALIDADE[m]
    );
  }

  await seedEvento(db, ancora, dataProva, receita);
  await seedInscritos(db, inscritos, dataProva);
  await seedPedidos(db, inscritos, ancora);
  await seedClubes(db, ancora, dataProva);
  await recomputarAgregados(db, inscritos, receitaPorModalidade);

  console.log('');
  console.log(`[mock-campeche] OK — "${MOCK_EVENTO_NOME}" pronto.`);
  console.log(`[mock-campeche] evento: /eventos/${MOCK_EVENTO_ID} · prova em ${isoDia(dataProva)} · ${String(N_INSCRITOS)}/${String(CAPACIDADE)} vagas`);
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('[mock-campeche] ERRO:', err);
    process.exit(1);
  });
