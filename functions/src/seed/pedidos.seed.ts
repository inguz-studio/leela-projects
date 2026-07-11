// =============================================================================
// functions/src/seed/pedidos.seed.ts
//
// Seed do kernel `pedidos` + `pagamentos` (ADR-011 · FABLE-A-T2) e
// ENRIQUECIMENTO dos inscritos da Meia Floripa com o bloco `[reg]`
// (dadosPessoais + tamanhos) e o link ao pedido (pedidoRef/ehResponsavel),
// para o slide-in rico (A-T3) renderizar dado REAL, nunca inventado.
//
// Este seed espelha o DONO DA ESCRITA de produção: a Function do checkout
// (S1203-T5) cria pedido + pagamento + enriquece os inscritos no MESMO
// fluxo — por isso o enriquecimento mora AQUI, não em inscritos.seed.ts
// (que permanece a projeção fina S203-T1). ORDEM: rodar seedInscritos
// ANTES (seedInscritos regrava o doc inteiro e apagaria o enriquecimento).
//
// Cobertura de estados (para a UI ver todos os ramos):
//   - pedido em GRUPO pago (cartão parcelado c/ cupom; pix) — ADR-011
//   - AUTO-INSCRIÇÃO paga (pedido de 1, ehResponsavel = true)
//   - pendente COM cobrança criada (pagamento 'pendente', sem conciliação)
//   - pendente SEM cobrança (pagamentoRef null)
//   - cancelado sem cobrança
//   - inscritos kit_prata/kit_basico com `tamanhos` (camiseta-tecnica —
//     único item tamanhado do catálogo canônico, RN-212/223)
//
// Determinístico e idempotente (docIds fixos ped-XXXX/pag-XXXX, valores e
// timestamps derivados do índice). Todos os valores monetários respeitam as
// invariantes de parsePedido/parsePagamento (validado em unit test).
// NÃO executar em produção (assertEmulatorOnly).
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { roundMoney } from '@leela/core';
import {
  GENEROS_INSCRITO,
  type DadosPessoaisInscrito,
} from '../../../packages/core/src/eventos/dadosPessoais';
import { assertEmulatorOnly } from './emulator-guard';
import { MEIA_FLORIPA_ID } from './eventos.seed';
import { gerarInscritosSeed, type InscritoSeed } from './inscritos.seed';

// ---------------------------------------------------------------------------
// Premissas do seed (registradas no report FABLE-A-T2)
// ---------------------------------------------------------------------------

/** Valor unitário da inscrição no lote vigente (slide-in S203: "R$ + Lote") */
export const VALOR_INSCRICAO_MEIA = 189.0;
export const LOTE_NOME_MEIA = 'Lote 2 — Regular';
/** Juros a.m. repassados ao comprador (decisão 2026-07-05) */
const JUROS_AM_PCT = 3.49;
/** Taxa Be Hero do seed (% sobre o valor final) — premissa de preview */
const TAXA_BE_HERO_PCT = 8;
/** Evento 2026-04-27 (eventos.seed) → repasse D+5 = 2026-05-02 (premissa) */
const REPASSE_PREVISTO_MILLIS = Date.UTC(2026, 4, 2, 12, 0, 0);
/** Único item tamanhado do catálogo canônico (kits.seed — RN-212) */
const ITEM_TAMANHADO_ID = 'camiseta-tecnica';
const TAMANHOS_CICLO = ['P', 'M', 'G', 'GG'] as const;
const CIDADES_SC = ['Florianópolis', 'São José', 'Palhoça', 'Biguaçu'] as const;
const BANDEIRAS = ['Visa', 'Mastercard', 'Elo'] as const;

// ---------------------------------------------------------------------------
// Shapes do seed (millis no lugar de Timestamp — conversão só na escrita)
// ---------------------------------------------------------------------------

export interface CartaoSeed {
  bandeira: string;
  ultimos4: string;
  parcelas: number;
  valorParcela: number;
  valorTotalComJuros: number;
}

export interface ConciliacaoSeed {
  idTransacao: string;
  gateway: 'asaas';
  adquirente: string;
  taxaPct: number;
  taxaValor: number;
  repasseOrganizador: number;
  repassePrevistoEmMillis: number;
}

export interface PagamentoSeed {
  id: string;
  tenantId: string;
  eventoId: string;
  pedidoRef: string;
  status: 'pendente' | 'confirmado';
  forma: 'cartao_credito' | 'pix';
  valorBase: number;
  loteNome: string;
  cupom?: { codigo: string; descontoPct: number };
  desconto: number;
  valorFinal: number;
  cartao?: CartaoSeed;
  pagoEmMillis?: number;
  conciliacao?: ConciliacaoSeed;
  criadoEmMillis: number;
}

export interface PedidoSeed {
  id: string;
  tenantId: string;
  eventoId: string;
  responsavel: { atletaId: string; nome: string; email: string };
  inscritoRefs: string[];
  pagamentoRef: string | null;
  valorTotal: number;
  status: 'pago' | 'pendente' | 'cancelado';
  formaPagamento?: 'cartao_credito' | 'pix';
  parcelas?: number;
  criadoEmMillis: number;
}

/** Enriquecimento `[reg]` + link ADR-011 de UM inscrito já seedado */
export interface EnriquecimentoInscritoSeed {
  inscritoId: string;
  pedidoRef: string;
  ehResponsavel: boolean;
  dadosPessoais: DadosPessoaisInscrito;
  tamanhos: Record<string, string>;
  atualizadoEmMillis: number;
}

export interface PedidosSeedData {
  pedidos: PedidoSeed[];
  pagamentos: PagamentoSeed[];
  enriquecimentos: EnriquecimentoInscritoSeed[];
}

// ---------------------------------------------------------------------------
// Definição declarativa dos pedidos (índices 1-based do seed canônico de
// inscritos — statusPorIndice: 20/40 pendentes, 65 cancelado, demais
// confirmados nos índices usados; o unit test trava essa coerência)
// ---------------------------------------------------------------------------

interface DefPedido {
  seq: number;
  /** Índices dos inscritos no seed canônico; o PRIMEIRO é o responsável */
  inscritos: number[];
  status: 'pago' | 'pendente' | 'cancelado';
  forma?: 'cartao_credito' | 'pix';
  parcelas?: number;
  cupom?: { codigo: string; descontoPct: number };
  /** confirmada = pagamento confirmado+conciliado; pendente = cobrança
   *  criada aguardando; nenhuma = pagamentoRef null */
  cobranca: 'confirmada' | 'pendente' | 'nenhuma';
}

const DEFS_PEDIDOS: DefPedido[] = [
  // Grupo de 3 (kit_ouro) — cartão 12×, cupom 10% — o caso-vitrine ADR-011
  { seq: 1, inscritos: [1, 2, 3], status: 'pago', forma: 'cartao_credito', parcelas: 12, cupom: { codigo: 'HEROI10', descontoPct: 10 }, cobranca: 'confirmada' },
  // Auto-inscrição pix (pedido de 1 — caso particular do ADR-011)
  { seq: 2, inscritos: [4], status: 'pago', forma: 'pix', cobranca: 'confirmada' },
  // Grupo de 2 — cartão à vista (1×)
  { seq: 3, inscritos: [5, 6], status: 'pago', forma: 'cartao_credito', parcelas: 1, cobranca: 'confirmada' },
  // Grupo de 3 kit_prata (camiseta tamanhada → tamanhos no [reg])
  { seq: 4, inscritos: [50, 51, 52], status: 'pago', forma: 'pix', cobranca: 'confirmada' },
  // Auto-inscrição kit_prata — cartão 3×, cupom 5%
  { seq: 5, inscritos: [53], status: 'pago', forma: 'cartao_credito', parcelas: 3, cupom: { codigo: 'CORRA5', descontoPct: 5 }, cobranca: 'confirmada' },
  // Grupo de 2 kit_prata — cartão 6×
  { seq: 6, inscritos: [54, 55], status: 'pago', forma: 'cartao_credito', parcelas: 6, cobranca: 'confirmada' },
  // Grupo de 2 kit_basico — pix
  { seq: 7, inscritos: [301, 302], status: 'pago', forma: 'pix', cobranca: 'confirmada' },
  // Auto-inscrição kit_basico — cartão 2×
  { seq: 8, inscritos: [303], status: 'pago', forma: 'cartao_credito', parcelas: 2, cobranca: 'confirmada' },
  // Pendente COM cobrança criada (pix aguardando webhook) — inscrito 20 é
  // 'pendente' no seed canônico (i % 20 === 0)
  { seq: 9, inscritos: [20], status: 'pendente', forma: 'pix', cobranca: 'pendente' },
  // Pendente SEM cobrança (pagamentoRef null) — inscrito 40 é 'pendente'
  { seq: 10, inscritos: [40], status: 'pendente', cobranca: 'nenhuma' },
  // Cancelado sem cobrança — inscrito 65 é 'cancelado' (i % 65 === 0)
  { seq: 11, inscritos: [65], status: 'cancelado', cobranca: 'nenhuma' },
];

// ---------------------------------------------------------------------------
// Geradores determinísticos
// ---------------------------------------------------------------------------

const HORA_MS = 60 * 60 * 1000;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** CPF determinístico VÁLIDO (dígitos verificadores módulo 11) por índice */
export function cpfDeterministico(i: number): string {
  const base = String(120_000_000 + i * 7_919).slice(-9);
  const dv = (digitos: string): number => {
    const corte = digitos.length;
    let soma = 0;
    for (let k = 0; k < corte; k++) {
      soma += Number(digitos[k]) * (corte + 1 - k);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const dv1 = dv(base);
  const dv2 = dv(base + String(dv1));
  const cpf = `${base}${dv1}${dv2}`;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

/** Bloco `[reg]` determinístico e coerente por inscrito do seed canônico */
function gerarDadosPessoais(inscrito: InscritoSeed, i: number): DadosPessoaisInscrito {
  const fone8 = String(10_000_000 + i * 137).slice(-8);
  const foneEmerg7 = String(1_000_000 + i * 211).slice(-7);
  const genero = GENEROS_INSCRITO[i % GENEROS_INSCRITO.length] as DadosPessoaisInscrito['genero'];

  const dados: DadosPessoaisInscrito = {
    cpf: cpfDeterministico(i),
    telefone: `(48) 9${fone8.slice(0, 4)}-${fone8.slice(4)}`,
    nascimento: `${1975 + (i % 30)}-${pad2(1 + (i % 12))}-${pad2(1 + (i % 28))}`,
    genero,
    cidade: CIDADES_SC[i % CIDADES_SC.length] as string,
    uf: 'SC',
    contatoEmergencia: {
      nome: `Contato de ${inscrito.atletaNome}`,
      telefone: `(48) 3${foneEmerg7.slice(0, 3)}-${foneEmerg7.slice(3)}`,
    },
  };
  // Dado sensível (LGPD): só em ~1/5 dos enriquecidos, como no mundo real
  if (i % 5 === 0) {
    dados.restricoesMedicas = 'Rinite alérgica — informar posto médico';
  }
  return dados;
}

/** Tamanhos por item tamanhado do kit (RN-223) — camiseta em prata/básico */
function gerarTamanhos(inscrito: InscritoSeed, i: number): Record<string, string> {
  if (inscrito.kit !== 'kit_prata' && inscrito.kit !== 'kit_basico') return {};
  return { [ITEM_TAMANHADO_ID]: TAMANHOS_CICLO[i % TAMANHOS_CICLO.length] as string };
}

/** Parcelamento coerente com as invariantes de parsePagamento (juros Price) */
function parcelamento(valorFinal: number, parcelas: number, seq: number): CartaoSeed {
  const fator = parcelas > 1 ? Math.pow(1 + JUROS_AM_PCT / 100, parcelas) : 1;
  const valorTotalComJuros = roundMoney(valorFinal * fator);
  return {
    bandeira: BANDEIRAS[seq % BANDEIRAS.length] as string,
    ultimos4: String(4_000 + seq * 97).slice(-4),
    parcelas,
    valorParcela: roundMoney(valorTotalComJuros / parcelas),
    valorTotalComJuros,
  };
}

/** Conciliação coerente: repasse = valorFinal − taxa (cent-exato) */
function conciliar(valorFinal: number, seq: number): ConciliacaoSeed {
  const taxaValor = roundMoney(valorFinal * (TAXA_BE_HERO_PCT / 100));
  return {
    idTransacao: `asaas_tx_meia_${String(seq).padStart(4, '0')}`,
    gateway: 'asaas',
    adquirente: 'Asaas',
    taxaPct: TAXA_BE_HERO_PCT,
    taxaValor,
    repasseOrganizador: roundMoney(valorFinal - taxaValor),
    repassePrevistoEmMillis: REPASSE_PREVISTO_MILLIS,
  };
}

/**
 * Gera pedidos + pagamentos + enriquecimentos determinísticos, coerentes
 * com o seed canônico de inscritos (nomes, kits, status). @pure
 */
export function gerarPedidosSeed(): PedidosSeedData {
  const inscritos = gerarInscritosSeed();
  const porIndice = (i: number): InscritoSeed => {
    const inscrito = inscritos[i - 1];
    if (!inscrito) throw new Error(`pedidos.seed: índice ${i} fora do seed canônico`);
    return inscrito;
  };

  const pedidos: PedidoSeed[] = [];
  const pagamentos: PagamentoSeed[] = [];
  const enriquecimentos: EnriquecimentoInscritoSeed[] = [];

  for (const def of DEFS_PEDIDOS) {
    const seqStr = String(def.seq).padStart(4, '0');
    const pedidoId = `ped-${seqStr}`;
    const membros = def.inscritos.map(porIndice);
    const responsavel = membros[0] as InscritoSeed;

    // Pedido nasce quando o ÚLTIMO inscrito do grupo entra no checkout
    const criadoEmMillis = Math.max(...membros.map((m) => m.criadoEmMillis));

    const valorBase = roundMoney(def.inscritos.length * VALOR_INSCRICAO_MEIA);
    const desconto = def.cupom
      ? roundMoney(valorBase * (def.cupom.descontoPct / 100))
      : 0;
    const valorFinal = roundMoney(valorBase - desconto);

    let pagamentoRef: string | null = null;
    if (def.cobranca !== 'nenhuma') {
      const pagamentoId = `pag-${seqStr}`;
      pagamentoRef = pagamentoId;
      const forma = def.forma as 'cartao_credito' | 'pix';
      const pagamento: PagamentoSeed = {
        id: pagamentoId,
        tenantId: responsavel.tenantId,
        eventoId: MEIA_FLORIPA_ID,
        pedidoRef: pedidoId,
        status: def.cobranca === 'confirmada' ? 'confirmado' : 'pendente',
        forma,
        valorBase,
        loteNome: LOTE_NOME_MEIA,
        desconto,
        valorFinal,
        criadoEmMillis,
      };
      if (def.cupom) pagamento.cupom = def.cupom;
      if (forma === 'cartao_credito') {
        pagamento.cartao = parcelamento(valorFinal, def.parcelas ?? 1, def.seq);
      }
      if (def.cobranca === 'confirmada') {
        pagamento.pagoEmMillis = criadoEmMillis + 2 * HORA_MS;
        pagamento.conciliacao = conciliar(valorFinal, def.seq);
      }
      pagamentos.push(pagamento);
    }

    const pedido: PedidoSeed = {
      id: pedidoId,
      tenantId: responsavel.tenantId,
      eventoId: MEIA_FLORIPA_ID,
      responsavel: {
        atletaId: responsavel.atletaId,
        nome: responsavel.atletaNome,
        // 🔁 premissa de seed: e-mail derivado do atletaId (destino do
        // e-mail do pedido — ADR-011)
        email: `${responsavel.atletaId}@atleta.leela.dev`,
      },
      inscritoRefs: membros.map((m) => m.id),
      pagamentoRef,
      // Premissa: valorTotal do pedido = valor APÓS cupom (o que o
      // organizador enxerga — espelha pagamento.valorFinal)
      valorTotal: valorFinal,
      status: def.status,
      criadoEmMillis,
    };
    // Espelhos de listagem só PÓS-CONFIRMAÇÃO (contrato de pedido.ts)
    if (def.cobranca === 'confirmada' && def.forma) {
      pedido.formaPagamento = def.forma;
      if (def.forma === 'cartao_credito') pedido.parcelas = def.parcelas ?? 1;
    }
    pedidos.push(pedido);

    def.inscritos.forEach((i, pos) => {
      const inscrito = porIndice(i);
      enriquecimentos.push({
        inscritoId: inscrito.id,
        pedidoRef: pedidoId,
        ehResponsavel: pos === 0,
        dadosPessoais: gerarDadosPessoais(inscrito, i),
        tamanhos: gerarTamanhos(inscrito, i),
        atualizadoEmMillis: criadoEmMillis + HORA_MS,
      });
    });
  }

  return { pedidos, pagamentos, enriquecimentos };
}

// ---------------------------------------------------------------------------
// Escrita no Emulator
// ---------------------------------------------------------------------------

/** Remove chaves undefined (Firestore rejeita undefined em set) */
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/**
 * Popula `pedidos` + `pagamentos` e enriquece os inscritos da Meia com
 * `[reg]` + link ADR-011. Idempotente. RODAR APÓS seedInscritos (que
 * regrava o doc inteiro do inscrito).
 */
export async function seedPedidos(db: admin.firestore.Firestore): Promise<void> {
  assertEmulatorOnly('seedPedidos');

  const { pedidos, pagamentos, enriquecimentos } = gerarPedidosSeed();
  const batch = db.batch();

  for (const pedido of pedidos) {
    const { criadoEmMillis, ...doc } = pedido;
    const ts = Timestamp.fromMillis(criadoEmMillis);
    batch.set(
      db.collection('pedidos').doc(pedido.id),
      compact({ ...doc, criadoEm: ts, atualizadoEm: ts })
    );
  }

  for (const pagamento of pagamentos) {
    const { criadoEmMillis, pagoEmMillis, conciliacao, ...doc } = pagamento;
    const ts = Timestamp.fromMillis(criadoEmMillis);
    const pagoEm =
      pagoEmMillis !== undefined ? Timestamp.fromMillis(pagoEmMillis) : undefined;

    let conciliacaoDoc: Record<string, unknown> | undefined;
    if (conciliacao !== undefined) {
      const { repassePrevistoEmMillis, ...c } = conciliacao;
      conciliacaoDoc = {
        ...c,
        repassePrevistoEm: Timestamp.fromMillis(repassePrevistoEmMillis),
      };
    }

    batch.set(
      db.collection('pagamentos').doc(pagamento.id),
      compact({
        ...doc,
        pagoEm,
        conciliacao: conciliacaoDoc,
        criadoEm: ts,
        atualizadoEm: pagoEm ?? ts,
      })
    );
  }

  const inscritosCol = db
    .collection('eventos')
    .doc(MEIA_FLORIPA_ID)
    .collection('inscritos');
  for (const e of enriquecimentos) {
    batch.set(
      inscritosCol.doc(e.inscritoId),
      {
        pedidoRef: e.pedidoRef,
        ehResponsavel: e.ehResponsavel,
        dadosPessoais: e.dadosPessoais,
        tamanhos: e.tamanhos,
        atualizadoEm: Timestamp.fromMillis(e.atualizadoEmMillis),
      },
      { merge: true }
    );
  }

  await batch.commit();

  console.log(
    `[seed] pedidos: ${pedidos.length} pedidos · ${pagamentos.length} pagamentos · ` +
      `${enriquecimentos.length} inscritos enriquecidos ([reg]+pedidoRef — ADR-011)`
  );
}

// ---------------------------------------------------------------------------
// Entry point (execução direta) — mesmo contrato dos demais seeds
// ---------------------------------------------------------------------------
if (require.main === module) {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] =
      process.env['FIRESTORE_EMULATOR_HOST'] ?? 'localhost:8080';
    admin.initializeApp({ projectId: 'demo-leela' });
  }
  seedPedidos(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
