// =============================================================================
// packages/core/src/eventos/inscrito.ts
//
// Entidade Inscrito — join Atleta ↔ Evento (LEELA-S203-T1 · E03).
// Subcoleção: `eventos/{eventoId}/inscritos/{inscritoId}` — tenant-scoped
// (carrega tenantId coerente com o evento pai — ADR-009 / S1600).
//
// RN-202: kit ∈ {kit_ouro, kit_prata, kit_basico, sem_kit}
// RN-203: chipNumero nulo até a entrega
// RN-204: status ∈ {confirmado, pendente, cancelado}
// RN-205/221/222: kitEntregueEm/checkinEm são carimbos distintos, escritos
//                 SÓ por Function (`registrarEntrega`/`registrarCheckin`).
//
// ADR-011 (FABLE-A-T2): o Inscrito ganha o LINK ao pedido (`pedidoRef` +
// `ehResponsavel`) e o bloco `[reg]` do titular (`dadosPessoais` +
// `tamanhos`). Decisão denorm×join:
//   - `[reg]`/`tamanhos` MORAM aqui (cópia canônica, não denormalização:
//     o pedido NÃO carrega dado pessoal por inscrito — titular próprio é o
//     próprio ADR-011). Dono da escrita = Function do checkout (S1203-T5).
//   - `[pag]` NUNCA se denormaliza: dinheiro muda de estado por webhook e
//     estorno opera POR INSCRITO — espelhar em N docs criaria fan-out de
//     writes financeiros sem ganho de leitura (o slide-in lê 1 inscrito →
//     2 point reads O(1): pedidoRef → pedido → pagamentoRef → pagamento).
// =============================================================================

import type { Timestamp } from '../index';
import type { Pedido } from '../pedidos/pedido';
import {
  parseDadosPessoais,
  parseTamanhos,
  type DadosPessoaisInscrito,
} from './dadosPessoais';
import { isCodigoIngressoValido } from '../tickets/codigoIngresso';

// ---------------------------------------------------------------------------
// Enums de domínio
// ---------------------------------------------------------------------------

/** Kit escolhido pelo inscrito (RN-202; nomenclatura "kit", nunca "tier" — RN-216) */
export type KitInscrito = 'kit_ouro' | 'kit_prata' | 'kit_basico' | 'sem_kit';

/** Lista canônica de kits — única fonte para validação/UI */
export const KITS_INSCRITO: readonly KitInscrito[] = [
  'kit_ouro',
  'kit_prata',
  'kit_basico',
  'sem_kit',
];

/** Type guard de KitInscrito (RN-202) */
export function isKitInscrito(value: unknown): value is KitInscrito {
  return (
    typeof value === 'string' && (KITS_INSCRITO as readonly string[]).includes(value)
  );
}

/**
 * Status da inscrição (RN-204 + RN-337/RN-341 · ADR-011).
 * `estornado` (FABLE-B): inscrição paga cujo valor foi DEVOLVIDO ao pagador —
 * o estorno opera POR INSCRITO dentro do pedido em grupo (ADR-011), nunca
 * sobre o pedido inteiro. É status de escrita EXCLUSIVA da Function
 * `estornarInscricao` (Admin SDK): as Rules mantêm 'estornado' FORA do enum
 * de cliente — cliente não cria/atualiza para ele, e um doc estornado fica
 * CONGELADO para escrita de cliente (o merge preservaria o status fora do
 * enum permitido). Distinto de 'cancelado' (sem dinheiro devolvido).
 */
export type StatusInscrito = 'confirmado' | 'pendente' | 'cancelado' | 'estornado';

/** Lista canônica de status de inscrito */
export const STATUS_INSCRITO: readonly StatusInscrito[] = [
  'confirmado',
  'pendente',
  'cancelado',
  'estornado',
];

/** Type guard de StatusInscrito (RN-204) */
export function isStatusInscrito(value: unknown): value is StatusInscrito {
  return (
    typeof value === 'string' && (STATUS_INSCRITO as readonly string[]).includes(value)
  );
}

/**
 * Matriz CANÔNICA de transição de status do inscrito (espelha o padrão de
 * TRANSICOES_STATUS_PEDIDO/PAGAMENTO — re-review A9):
 *   - `pendente` → confirmado (webhook de pagamento) | cancelado;
 *   - `confirmado` → cancelado | estornado (SÓ inscrição PAGA estorna —
 *     RN-341; a Function `estornarInscricao` é o único escritor do flip);
 *   - `cancelado`/`estornado` são TERMINAIS: inscrição estornada não
 *     ressuscita (o dinheiro já voltou) nem re-estorna (dupliaria refund).
 * Functions que mudam status DEVEM consultar esta matriz — nunca re-derivar
 * transições localmente.
 */
export const TRANSICOES_STATUS_INSCRITO: Readonly<
  Record<StatusInscrito, readonly StatusInscrito[]>
> = {
  pendente: ['confirmado', 'cancelado'],
  confirmado: ['cancelado', 'estornado'],
  cancelado: [],
  estornado: [],
};

/** Transição de status do inscrito permitida? (`estornado` é terminal) @pure */
export function podeTransicionarStatusInscrito(
  de: StatusInscrito,
  para: StatusInscrito
): boolean {
  return TRANSICOES_STATUS_INSCRITO[de].includes(para);
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Inscrito — join Atleta ↔ Evento.
 * Subcoleção: `eventos/{eventoId}/inscritos/{inscritoId}`.
 * Paginação obrigatória na listagem (mock canônico: 453 — HANDOFF-05).
 */
export interface Inscrito {
  id: string;
  /** Propagado do evento pai — isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /** Referência ao atleta (→ atletas/{atletaId}) */
  atletaId: string;
  /** 🔁 Desnormalizado — mantido por Function */
  atletaNome: string;
  /** RN-202 */
  kit: KitInscrito;
  /** RN-203 — null até a entrega do kit no balcão */
  chipNumero: string | null;
  /** RN-204 */
  status: StatusInscrito;
  /** Percurso escolhido (5k/10k/21k…) */
  modalidade: string;
  /**
   * Id EXATO do kit COBRADO no checkout (→ `eventos/{eventoId}/kits/{kitId}`)
   * — fulfillment do balcão (follow-up da review do kit c59dc28 · E12).
   * O enum `kit` (RN-202) colapsa kits custom do organizador em `sem_kit`;
   * este campo preserva o id real para o balcão entregar o kit certo.
   * null = inscrição SEM kit; ausente = doc legado pré-persistência.
   * Escrita SÓ pela Function do checkout (server-side, derivado do id que
   * precificou a linha) — cliente nunca escreve/altera (Rules).
   */
  kitId?: string | null;
  /**
   * ADR-011 — pedido a que a inscrição pertence (→ pedidos/{pedidoId}).
   * null = legado pré-ADR-011 ou inscrição ainda sem pedido (o join `[pag]`
   * cai no fallback `getPedidoDoInscrito` por `inscritoRefs`).
   * Escrita SÓ pela Function do checkout (S1203-T5).
   */
  pedidoRef: string | null;
  /**
   * RN-173 (CK2) — vínculo ao registro global de pessoa (→ pessoas/{id},
   * docId derivado do CPF por HMAC — nunca o CPF em claro). Inscrições do
   * MESMO CPF apontam o MESMO doc (unicidade estrutural). Ausente = doc
   * legado pré-RN-173 (leitura Postel); null = sem vínculo. Escrita SÓ pela
   * Function do checkout.
   */
  pessoaRef?: string | null;
  /**
   * ADR-011 — este inscrito também é o responsável/pagador do pedido
   * (auto-inscrição = pedido de 1 inscrito com ehResponsavel = true).
   * Coerência com `pedido.responsavel` verificável por
   * `pedidoDoInscritoCoerente`. Escrita SÓ pela Function do checkout.
   */
  ehResponsavel: boolean;
  /**
   * RN-223/S209-T1 — tamanho POR ITEM TAMANHADO do kit (`itemId → tamanho`,
   * ex.: `{ "camiseta-tecnica": "M" }`). `{}` = kit sem item tamanhado ou
   * doc legado. Por inscrito, nunca herdado do responsável (ADR-011).
   */
  tamanhos: Record<string, string>;
  /**
   * `[reg]` — dados pessoais do TITULAR coletados no checkout (S1202).
   * ⚠️ PII/LGPD (inclui dado sensível): leitura só do organizador (Rules);
   * escrita SÓ pela Function do checkout; A-T3 mascara CPF/telefone.
   */
  dadosPessoais?: DadosPessoaisInscrito;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  // ── Carimbos de operação — escrita SÓ por Function (RN-205/221/222) ──────
  /** Kit retirado no balcão (retirar = presença — RN-205) */
  kitEntregueEm?: Timestamp;
  /** Presença na largada (kit antecipado seta só este — RN-222) */
  checkinEm?: Timestamp;
  /** Token opaco do ingresso/QR (RN-218/221 — S1206) */
  qrToken?: string;
  /** Emissão do ingresso digital (S1206) */
  ingressoEmitidoEm?: Timestamp;
  /**
   * Código identificador LEGÍVEL do ingresso (RN-396 · S1206-T5) — 6 chars
   * do alfabeto sem ambíguos, ÚNICO POR EVENTO, gravado na MESMA emissão do
   * `qrToken` e idempotente por inscrito. É o que a pessoa dita no balcão e
   * o que a lista do organizador exibe como coluna (RN-397).
   *
   * NÃO é credencial: presença só se prova por assinatura do `qrToken`
   * (RN-218/221/222). Escrita SÓ por Function (emitirIngressos).
   */
  codigoIngresso?: string;
  /**
   * Carimbo do estorno (RN-341/ADR-011 · FABLE-B) — presente SE E SOMENTE SE
   * `status === 'estornado'` (escritos na MESMA transação pela Function
   * `estornarInscricao`). A trilha de auditoria completa (quem/quando/
   * quanto/motivo + refundId do gateway) vive no ledger
   * `pagamentos/{pagamentoId}/estornos/{inscritoId}` — aqui só o carimbo.
   */
  estornadoEm?: Timestamp;
  /**
   * Trilha APPEND-ONLY de transferências de titularidade (RN-345 · S904-T4).
   * Cada entrada registra de-quem→para-quem/quando/por-quem; o pagamento
   * permanece na MESMA inscrição (ADR-011). Escrita EXCLUSIVA da Function
   * `requestTransfer` — cliente forjá-la reescreveria a história do titular.
   * Ausente = inscrição nunca transferida.
   */
  titularHistorico?: TitularHistoricoEntry[];
}

/**
 * Entrada da trilha de titularidade (RN-345 — append-only, nunca editada).
 * O detalhe completo (dados do novo titular, taxa, tipo) vive no doc de
 * `eventos/{eventoId}/transferencias/{transferenciaId}` referenciado.
 */
export interface TitularHistoricoEntry {
  /** Nome do titular ANTERIOR (antes desta transferência). */
  nomeAnterior: string;
  /** Nome do NOVO titular (após esta transferência). */
  nomeNovo: string;
  /** Referência ao doc de transferência (auditoria completa). */
  transferenciaRef: string;
  em: Timestamp;
  /** uid de quem executou (organizador — RN-343). */
  por: string;
}

/**
 * Campos do inscrito com escrita EXCLUSIVA de Cloud Function
 * (espelhados nas Security Rules — o cliente nunca os escreve).
 *
 * FABLE-A-T2 (ADR-011): `pedidoRef`/`ehResponsavel` (link ao pedido) e
 * `dadosPessoais`/`tamanhos` (bloco `[reg]` + RN-223) são escritos pela
 * Function do checkout (S1203-T5) no MESMO fluxo que cria o pedido —
 * cliente não forja vínculo financeiro nem edita PII por escrita direta.
 * As Rules de `inscritos` ESPELHAM os 4 campos (aplicado em 2c01306):
 * `semCamposDeFunctionInscrito`/`camposDeFunctionIntocados` os incluem nas
 * listas `hasAny`, negando escrita direta de cliente no create/update.
 *
 * Follow-up review kit (E12): `kitId` entra na lista — é o id do kit
 * COBRADO (fulfillment), escrito pela Function do checkout junto com o
 * rótulo derivado; adulterá-lo trocaria o kit a entregar sem mudar o
 * valor pago (fraude de balcão). Imutável para cliente após a criação.
 */
export const CAMPOS_FUNCTION_INSCRITO = [
  'kitEntregueEm',
  'checkinEm',
  'qrToken',
  'ingressoEmitidoEm',
  // RN-396 (S1206-T5): o código do ingresso nasce na emissão do servidor e é
  // único por evento. Cliente escrevê-lo permitiria plantar o código de
  // outra pessoa na própria linha e ser chamado no balcão no lugar dela.
  'codigoIngresso',
  'pedidoRef',
  'ehResponsavel',
  'dadosPessoais',
  'tamanhos',
  'kitId',
  // FABLE-B (RN-341): carimbo do estorno — escrito SÓ por `estornarInscricao`
  // na MESMA transação do flip para 'estornado'. Cliente forjá-lo simularia
  // devolução de dinheiro que não aconteceu.
  'estornadoEm',
  // S904-T4 (RN-345): trilha de titularidade — escrita SÓ por
  // `requestTransfer`. Cliente forjá-la reescreveria quem é o titular
  // (e quem corre/retira kit) sem passar pelas guardas de kit/chip/janela.
  'titularHistorico',
  // CK2 (RN-173): vínculo ao registro global de pessoa — só a Function do
  // checkout escreve. Cliente forjá-lo religaria a inscrição a outra
  // identidade (contaminaria CRM/prefill).
  'pessoaRef',
] as const;

// ---------------------------------------------------------------------------
// Derivações puras
// ---------------------------------------------------------------------------

/** Chip já vinculado? (RN-203 — nulo até a entrega) @pure */
export function chipVinculado(inscrito: Pick<Inscrito, 'chipNumero'>): boolean {
  return typeof inscrito.chipNumero === 'string' && inscrito.chipNumero.length > 0;
}

/**
 * Inscrito conta para operação/entrega? (cancelado E estornado ficam fora —
 * inscrição estornada teve o valor devolvido: não retira kit, não corre) @pure
 */
export function inscritoAtivo(inscrito: Pick<Inscrito, 'status'>): boolean {
  return inscrito.status !== 'cancelado' && inscrito.status !== 'estornado';
}

/** Já pertence a um pedido? (false = legado pré-ADR-011) @pure */
export function inscritoTemPedido(
  inscrito: Pick<Inscrito, 'pedidoRef'>
): boolean {
  return inscrito.pedidoRef !== null;
}

/**
 * O link inscrito↔pedido é COERENTE? (ADR-011 — guarda do join `[pag]`)
 * Verifica as três pontas da relação denormalizada:
 *   1. `pedidoRef` aponta para ESTE pedido;
 *   2. o pedido lista o inscrito em `inscritoRefs` (índice inverso);
 *   3. `ehResponsavel` bate com `pedido.responsavel.atletaId`.
 * Falso = dado corrompido → o chamador NÃO renderiza a compra (mostrar o
 * pedido errado é pior que não mostrar). @pure
 */
export function pedidoDoInscritoCoerente(
  inscrito: Pick<Inscrito, 'id' | 'atletaId' | 'pedidoRef' | 'ehResponsavel'>,
  pedido: Pick<Pedido, 'id' | 'inscritoRefs' | 'responsavel'>
): boolean {
  return (
    inscrito.pedidoRef === pedido.id &&
    pedido.inscritoRefs.includes(inscrito.id) &&
    inscrito.ehResponsavel === (pedido.responsavel.atletaId === inscrito.atletaId)
  );
}

/**
 * Parsing defensivo de um doc Firestore em `Inscrito` (fail-fast).
 * @pure
 */
export function parseInscrito(id: string, data: Record<string, unknown>): Inscrito {
  const tenantId = data['tenantId'];
  const atletaId = data['atletaId'];
  const atletaNome = data['atletaNome'];
  const kit = data['kit'];
  const status = data['status'];
  const modalidade = data['modalidade'];
  const chipNumero = data['chipNumero'];
  const pedidoRef = data['pedidoRef'];
  const ehResponsavel = data['ehResponsavel'];

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`Inscrito ${id}: campo "tenantId" inválido (ADR-009)`);
  }
  if (typeof atletaId !== 'string' || atletaId.length === 0) {
    throw new Error(`Inscrito ${id}: campo "atletaId" inválido`);
  }
  if (typeof atletaNome !== 'string' || atletaNome.length === 0) {
    throw new Error(`Inscrito ${id}: campo "atletaNome" inválido`);
  }
  if (!isKitInscrito(kit)) {
    throw new Error(`Inscrito ${id}: kit "${String(kit)}" fora do enum (RN-202)`);
  }
  if (!isStatusInscrito(status)) {
    throw new Error(`Inscrito ${id}: status "${String(status)}" fora do enum (RN-204)`);
  }
  if (chipNumero !== null && chipNumero !== undefined && typeof chipNumero !== 'string') {
    throw new Error(`Inscrito ${id}: chipNumero inválido (RN-203)`);
  }

  // ADR-011: pedidoRef ausente normaliza para null (legado pré-pedido);
  // presente deve ser id não-vazio — link financeiro corrompido lança.
  if (
    pedidoRef !== null &&
    pedidoRef !== undefined &&
    (typeof pedidoRef !== 'string' || pedidoRef.length === 0)
  ) {
    throw new Error(`Inscrito ${id}: "pedidoRef" inválido (string|null — ADR-011)`);
  }
  if (ehResponsavel !== undefined && typeof ehResponsavel !== 'boolean') {
    throw new Error(`Inscrito ${id}: "ehResponsavel" deve ser boolean (ADR-011)`);
  }

  // Fulfillment (E12): kitId presente deve ser id não-vazio ou null (sem
  // kit); ausente = legado. Link de entrega corrompido lança fail-fast.
  const kitId = data['kitId'];
  if (
    kitId !== null &&
    kitId !== undefined &&
    (typeof kitId !== 'string' || kitId.length === 0)
  ) {
    throw new Error(`Inscrito ${id}: "kitId" inválido (string|null — E12)`);
  }

  const contexto = `Inscrito ${id}`;
  const inscrito: Inscrito = {
    id,
    tenantId,
    atletaId,
    atletaNome,
    kit,
    chipNumero: typeof chipNumero === 'string' ? chipNumero : null,
    status,
    modalidade: typeof modalidade === 'string' ? modalidade : '',
    pedidoRef: typeof pedidoRef === 'string' ? pedidoRef : null,
    ehResponsavel: ehResponsavel === true,
    tamanhos: parseTamanhos(contexto, data['tamanhos']),
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };

  // Coerência ADR-011: responsável SEM pedido é impossível — a Function do
  // checkout escreve pedidoRef e ehResponsavel no MESMO batch que cria o
  // pedido. Fail-fast: flag órfã indica vínculo financeiro corrompido.
  if (inscrito.ehResponsavel && inscrito.pedidoRef === null) {
    throw new Error(
      `Inscrito ${id}: ehResponsavel true com pedidoRef null — vínculo ` +
        `ao pedido incoerente (ADR-011: escritos no mesmo batch do checkout)`
    );
  }

  // kitId só entra quando o doc o carrega (ausente = legado, semântica
  // distinta de null = "cobrado sem kit") — exactOptionalPropertyTypes.
  if (kitId !== undefined) {
    inscrito.kitId = typeof kitId === 'string' ? kitId : null;
  }

  // RN-173 (CK2): pessoaRef presente deve ser id não-vazio ou null; ausente
  // = doc legado pré-registro (Postel). Vínculo corrompido lança fail-fast.
  const pessoaRef = data['pessoaRef'];
  if (
    pessoaRef !== undefined &&
    pessoaRef !== null &&
    (typeof pessoaRef !== 'string' || pessoaRef.length === 0)
  ) {
    throw new Error(`Inscrito ${id}: "pessoaRef" inválido (string|null — RN-173)`);
  }
  if (pessoaRef !== undefined) {
    inscrito.pessoaRef = typeof pessoaRef === 'string' ? pessoaRef : null;
  }

  if (data['dadosPessoais'] !== undefined) {
    inscrito.dadosPessoais = parseDadosPessoais(contexto, data['dadosPessoais']);
  }

  if (data['kitEntregueEm'] !== undefined) {
    inscrito.kitEntregueEm = data['kitEntregueEm'] as Timestamp;
  }
  if (data['checkinEm'] !== undefined) {
    inscrito.checkinEm = data['checkinEm'] as Timestamp;
  }
  if (typeof data['qrToken'] === 'string') {
    inscrito.qrToken = data['qrToken'];
  }
  if (data['ingressoEmitidoEm'] !== undefined) {
    inscrito.ingressoEmitidoEm = data['ingressoEmitidoEm'] as Timestamp;
  }
  // RN-396: leitura Postel — doc anterior à emissão simplesmente não tem o
  // campo, e um valor fora do formato canônico é DESCARTADO em vez de
  // propagado: melhor a coluna vazia (aceite S211: "vazio honesto") do que a
  // lista exibir um código que a busca nunca acha.
  if (isCodigoIngressoValido(data['codigoIngresso'])) {
    inscrito.codigoIngresso = data['codigoIngresso'];
  }
  if (data['estornadoEm'] !== undefined) {
    inscrito.estornadoEm = data['estornadoEm'] as Timestamp;
  }
  // S904-T4: trilha de titularidade — quando presente, deve ser lista
  // (fail-fast: trilha corrompida é pior que ausente).
  if (data['titularHistorico'] !== undefined) {
    if (!Array.isArray(data['titularHistorico'])) {
      throw new Error(
        `Inscrito ${id}: "titularHistorico" deve ser lista (RN-345)`
      );
    }
    inscrito.titularHistorico = data['titularHistorico'] as TitularHistoricoEntry[];
  }

  // Coerência do estorno (RN-341/ADR-011 · FABLE-B) — checada no parse porque
  // é DINHEIRO: `estornado` sem carimbo (ou carimbo sem status) indicaria flip
  // fora da Function `estornarInscricao`, que escreve os dois na MESMA
  // transação. E estorno opera POR INSCRITO dentro de um pedido — inscrição
  // estornada SEM pedido é impossível (não houve pagamento a devolver).
  if (inscrito.status === 'estornado') {
    if (inscrito.estornadoEm === undefined) {
      throw new Error(
        `Inscrito ${id}: status "estornado" sem estornadoEm — o estorno ` +
          `carimba estornadoEm no MESMO write (RN-341/FABLE-B)`
      );
    }
    if (inscrito.pedidoRef === null) {
      throw new Error(
        `Inscrito ${id}: status "estornado" com pedidoRef null — estorno ` +
          `opera POR INSCRITO dentro de um pedido (ADR-011/RN-341)`
      );
    }
  } else if (inscrito.estornadoEm !== undefined) {
    throw new Error(
      `Inscrito ${id}: estornadoEm presente com status "${inscrito.status}" — ` +
        `só inscrição estornada carrega o carimbo (RN-341/FABLE-B)`
    );
  }

  return inscrito;
}
