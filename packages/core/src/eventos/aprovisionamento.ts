// =============================================================================
// packages/core/src/eventos/aprovisionamento.ts
//
// Aprovisionamento de kit POR SKU (item tamanhado × tamanho) — domínio puro
// (LEELA-S210-T2/T3 · E03 · FABLE-D). Subcoleção:
//   `eventos/{eventoId}/aprovisionamento/{sku}` — docId = `itemId__tamanho`.
//
// RN-224: "a encomendar por SKU" = Σ inscritos confirmados que exigem
//         (item, tamanho) − estoque físico do SKU; agregado por Function
//         (onWrite de inscrito confirmado), NUNCA varrido no cliente.
// RN-225: item tem modelo de estoque `sob_encomenda` | `estoque_proprio`
//         (vive no ItemKit — ver kit.ts; o SKU não o denormaliza).
// RN-226: estado de aprovisionamento `estimativa → encomendado → em_estoque`;
//         cada transição registra quantidade e data (`historico[]`).
//
// DECISÕES DE MODELO (Kleppmann — integridade primeiro):
//   - SKU existe SÓ para item TAMANHADO (aceite S210-T3: "para cada (item
//     tamanhado, tamanho) do kit"). Item único (sacochila) não tem SKU.
//   - `qtdVendida`/`aEncomendar`/`alerta` são ∑ DERIVADOS — escrita EXCLUSIVA
//     da Function `agregarEstoque` (full recompute idempotente). `estado`/
//     `estoqueFisico`/`historico` são estado OPERACIONAL — mudam SÓ pela
//     Function `transicaoAprovisionamento` (máquina de estados valida).
//   - `estoqueFisico` nasce 0 e é DECLARADO pela transição `em_estoque`
//     (qtd recebida). Edição manual de saldo segue FORA do escopo (E03 §kits).
//   - Alertas (baixa/esgotado) só fazem sentido com estoque DECLARADO
//     (estado `em_estoque`): antes disso `sob_encomenda` vende sem estoque
//     por definição (RN-225) e `estoque_proprio` ainda não informou saldo —
//     alertar "esgotado" seria número fabricado.
// =============================================================================

import type { Timestamp } from '../index';
import type { ItemKit } from './kit';

// ---------------------------------------------------------------------------
// Constantes de coleção
// ---------------------------------------------------------------------------

/** Nome da subcoleção de aprovisionamento por SKU (S210-T2) */
export const COLECAO_APROVISIONAMENTO = 'aprovisionamento';

// ---------------------------------------------------------------------------
// Chave de SKU — `itemId__tamanho` (S210-T2)
// ---------------------------------------------------------------------------

/** Separador canônico do docId de SKU (S210-T2: `itemId__tamanho`) */
export const SEPARADOR_SKU = '__';

/**
 * docId canônico do SKU (item × tamanho). Fail-fast: itemId/tamanho vazios ou
 * contendo o separador tornariam a chave ambígua/não-parseável — integridade
 * de chave antes de integridade de valor. @pure
 */
export function skuId(itemId: string, tamanho: string): string {
  if (itemId.length === 0 || itemId.includes(SEPARADOR_SKU)) {
    throw new Error(
      `skuId: itemId "${itemId}" inválido (não-vazio, sem "${SEPARADOR_SKU}")`
    );
  }
  if (tamanho.length === 0 || tamanho.includes(SEPARADOR_SKU)) {
    throw new Error(
      `skuId: tamanho "${tamanho}" inválido (não-vazio, sem "${SEPARADOR_SKU}")`
    );
  }
  return `${itemId}${SEPARADOR_SKU}${tamanho}`;
}

/**
 * Decompõe um docId de SKU em (itemId, tamanho). Inverso exato de `skuId`
 * (round-trip garantido) — lança em chave malformada. @pure
 */
export function parseSkuId(sku: string): { itemId: string; tamanho: string } {
  const partes = sku.split(SEPARADOR_SKU);
  if (partes.length !== 2 || partes[0]!.length === 0 || partes[1]!.length === 0) {
    throw new Error(
      `parseSkuId: "${sku}" fora do padrão itemId${SEPARADOR_SKU}tamanho (S210-T2)`
    );
  }
  return { itemId: partes[0]!, tamanho: partes[1]! };
}

/**
 * SKUs declarados de um item: item TAMANHADO × cada tamanho disponível
 * (RN-223/S210-T1). Item único (não tamanhado) não gera SKU — o
 * aprovisionamento por tamanho só existe onde tamanho existe (S210-T3).
 * Tamanhos duplicados colapsam (mesma chave). @pure
 */
export function skusDeclaradosDoItem(
  item: Pick<ItemKit, 'id' | 'tamanhado' | 'tamanhosDisponiveis'>
): string[] {
  if (!item.tamanhado) return [];
  const skus = new Set<string>();
  for (const tamanho of item.tamanhosDisponiveis) {
    skus.add(skuId(item.id, tamanho));
  }
  return [...skus];
}

// ---------------------------------------------------------------------------
// Máquina de estados (RN-226)
// ---------------------------------------------------------------------------

/** Estado de aprovisionamento do SKU (RN-226) */
export type EstadoAprovisionamento = 'estimativa' | 'encomendado' | 'em_estoque';

/** Lista canônica de estados — única fonte para validação/UI */
export const ESTADOS_APROVISIONAMENTO: readonly EstadoAprovisionamento[] = [
  'estimativa',
  'encomendado',
  'em_estoque',
];

/** Type guard de EstadoAprovisionamento (RN-226) */
export function isEstadoAprovisionamento(
  value: unknown
): value is EstadoAprovisionamento {
  return (
    typeof value === 'string' &&
    (ESTADOS_APROVISIONAMENTO as readonly string[]).includes(value)
  );
}

/**
 * Matriz CANÔNICA de transição (RN-226 — espelha o padrão de
 * TRANSICOES_STATUS_INSCRITO/PEDIDO/PAGAMENTO): LINEAR e sem regressão,
 * exatamente como o aceite declara (`estimativa → encomendado → em_estoque`).
 * Sem atalho estimativa→em_estoque e sem volta — replay da mesma transição é
 * REJEITADO pela própria matriz (idempotência por máquina de estados).
 * Functions que mudam estado DEVEM consultar esta matriz.
 */
export const TRANSICOES_APROVISIONAMENTO: Readonly<
  Record<EstadoAprovisionamento, readonly EstadoAprovisionamento[]>
> = {
  estimativa: ['encomendado'],
  encomendado: ['em_estoque'],
  em_estoque: [],
};

/** Transição de aprovisionamento permitida? (`em_estoque` é terminal) @pure */
export function podeTransicionarAprovisionamento(
  de: EstadoAprovisionamento,
  para: EstadoAprovisionamento
): boolean {
  return TRANSICOES_APROVISIONAMENTO[de].includes(para);
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/** Registro de transição da máquina de estados (RN-226: quantidade + data) */
export interface TransicaoAprovisionamento {
  /** Estado ALCANÇADO pela transição */
  estado: EstadoAprovisionamento;
  /** Quantidade registrada na transição (encomendada/recebida) */
  qtd: number;
  /** Data da transição */
  em: Timestamp;
}

/** Nível de alerta de estoque do SKU — derivado, nunca escrito por cliente */
export type AlertaEstoqueSku = 'baixa' | 'esgotado';

/**
 * Aprovisionamento por SKU (RN-224/225/226).
 * Subcoleção: `eventos/{eventoId}/aprovisionamento/{sku}`.
 * Escrita EXCLUSIVA de Function (Rules: write false para todo cliente):
 * ∑ derivados pela `agregarEstoque`; estado/estoque pela
 * `transicaoAprovisionamento` (callable do organizador).
 */
export interface Aprovisionamento {
  /** docId = `itemId__tamanho` (S210-T2) */
  id: string;
  /** Propagado do evento pai — isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /** Decomposição da chave (redundante com o id — validada no parse) */
  itemId: string;
  tamanho: string;
  /** RN-226 — estado da máquina (`estimativa` é o estado inicial) */
  estado: EstadoAprovisionamento;
  /** ∑ inscritos CONFIRMADOS que exigem (item, tamanho) — RN-224 */
  qtdVendida: number;
  /** Saldo físico declarado pela transição `em_estoque` (0 até lá) */
  estoqueFisico: number;
  /** ∑ derivado — RN-224: max(0, qtdVendida − estoqueFisico) */
  aEncomendar: number;
  /** Alerta derivado (ver `alertaAprovisionamento`) — null = sem alerta */
  alerta: AlertaEstoqueSku | null;
  /** Trilha da máquina de estados (RN-226) — append-only pela Function */
  historico: TransicaoAprovisionamento[];
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

// ---------------------------------------------------------------------------
// Derivações puras (RN-224 + alertas)
// ---------------------------------------------------------------------------

/**
 * RN-224: "a encomendar" = Σ vendido − estoque físico, nunca negativo
 * (estoque sobrando não gera encomenda negativa — aceite S210-T3). @pure
 */
export function computeAEncomendar(
  qtdVendida: number,
  estoqueFisico: number
): number {
  return Math.max(0, qtdVendida - estoqueFisico);
}

/** Saldo físico do SKU (estoque declarado − vendido). @pure */
export function saldoFisicoSku(
  aprov: Pick<Aprovisionamento, 'estoqueFisico' | 'qtdVendida'>
): number {
  return aprov.estoqueFisico - aprov.qtdVendida;
}

/**
 * Limiar DEFAULT do alerta "baixa" (unidades restantes). O produto ainda não
 * define o limite configurável (E03 §Estoque fala "abaixo do limite" sem
 * fixá-lo) — este default é parâmetro da derivação, sobreponível pela UI,
 * NÃO uma regra de negócio congelada.
 */
export const LIMIAR_BAIXA_SKU_DEFAULT = 10;

/**
 * Alerta derivado do SKU — só com estoque DECLARADO (estado `em_estoque`):
 *   - `esgotado`: saldo físico ≤ 0 (vendido alcançou/passou o estoque);
 *   - `baixa`:    0 < saldo ≤ limiar;
 *   - null:       saldo confortável OU estado anterior a `em_estoque`
 *     (sob_encomenda vende SEM estoque por definição — RN-225 — e
 *     estoque_proprio ainda não declarou saldo: alerta aqui seria fabricado).
 * @pure
 */
export function alertaAprovisionamento(
  aprov: Pick<Aprovisionamento, 'estado' | 'estoqueFisico' | 'qtdVendida'>,
  limiarBaixa: number = LIMIAR_BAIXA_SKU_DEFAULT
): AlertaEstoqueSku | null {
  if (aprov.estado !== 'em_estoque') return null;
  const saldo = saldoFisicoSku(aprov);
  if (saldo <= 0) return 'esgotado';
  if (saldo <= limiarBaixa) return 'baixa';
  return null;
}

// ---------------------------------------------------------------------------
// Parsing defensivo
// ---------------------------------------------------------------------------

/** Quantidade de estoque válida: inteiro ≥ 0 (contagem física, nunca fração). */
export function qtdEstoqueValida(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Parsing defensivo de um doc Firestore em `Aprovisionamento` (fail-fast).
 * É movimentação de estoque — mesma severidade do parse de dinheiro:
 * chave↔campos incoerentes, ∑ que não bate com RN-224 ou estado fora do enum
 * indicam escrita fora das Functions donas → lança, nunca conserta em
 * silêncio. @pure
 */
export function parseAprovisionamento(
  id: string,
  data: Record<string, unknown>
): Aprovisionamento {
  const { itemId, tamanho } = parseSkuId(id);

  const tenantId = data['tenantId'];
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`Aprovisionamento ${id}: campo "tenantId" inválido (ADR-009)`);
  }
  if (data['itemId'] !== itemId || data['tamanho'] !== tamanho) {
    throw new Error(
      `Aprovisionamento ${id}: itemId/tamanho não batem com o docId (S210-T2)`
    );
  }

  const estado = data['estado'];
  if (!isEstadoAprovisionamento(estado)) {
    throw new Error(
      `Aprovisionamento ${id}: estado "${String(estado)}" fora do enum (RN-226)`
    );
  }

  const qtdVendida = data['qtdVendida'];
  const estoqueFisico = data['estoqueFisico'];
  const aEncomendar = data['aEncomendar'];
  if (!qtdEstoqueValida(qtdVendida)) {
    throw new Error(`Aprovisionamento ${id}: "qtdVendida" deve ser inteiro ≥ 0`);
  }
  if (!qtdEstoqueValida(estoqueFisico)) {
    throw new Error(`Aprovisionamento ${id}: "estoqueFisico" deve ser inteiro ≥ 0`);
  }
  if (aEncomendar !== computeAEncomendar(qtdVendida, estoqueFisico)) {
    throw new Error(
      `Aprovisionamento ${id}: aEncomendar=${String(aEncomendar)} não bate com ` +
        `RN-224 (max(0, ${qtdVendida} − ${estoqueFisico}))`
    );
  }

  const alerta = data['alerta'];
  if (alerta !== null && alerta !== 'baixa' && alerta !== 'esgotado') {
    throw new Error(
      `Aprovisionamento ${id}: alerta "${String(alerta)}" fora do enum derivado`
    );
  }

  const historicoRaw = data['historico'];
  if (!Array.isArray(historicoRaw)) {
    throw new Error(`Aprovisionamento ${id}: "historico" deve ser lista (RN-226)`);
  }
  const historico: TransicaoAprovisionamento[] = historicoRaw.map((t, idx) => {
    if (t === null || typeof t !== 'object' || Array.isArray(t)) {
      throw new Error(`Aprovisionamento ${id}: historico[${idx}] inválido`);
    }
    const entrada = t as Record<string, unknown>;
    if (!isEstadoAprovisionamento(entrada['estado'])) {
      throw new Error(
        `Aprovisionamento ${id}: historico[${idx}].estado fora do enum (RN-226)`
      );
    }
    if (!qtdEstoqueValida(entrada['qtd'])) {
      throw new Error(
        `Aprovisionamento ${id}: historico[${idx}].qtd deve ser inteiro ≥ 0`
      );
    }
    return {
      estado: entrada['estado'],
      qtd: entrada['qtd'],
      em: entrada['em'] as Timestamp,
    };
  });

  return {
    id,
    tenantId,
    itemId,
    tamanho,
    estado,
    qtdVendida,
    estoqueFisico,
    aEncomendar,
    alerta: alerta as AlertaEstoqueSku | null,
    historico,
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };
}
