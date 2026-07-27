// =============================================================================
// functions/src/checkout/estornarInscricao.ts
//
// Cloud Function callable: estorno POR INSCRITO do pedido em grupo
// (LEELA-FABLE-B · ADR-011 · RN-337/RN-341). Devolve ao pagador o valor da
// LINHA daquele inscrito (`pedido.itens[]` — decomposição por inscrito com
// desconto rateado), flipa o inscrito `confirmado → estornado`, REVERTE a
// receita agregada (`eventos.receitaConfirmada`) e registra a trilha de
// auditoria (quem/quando/quanto/motivo + refundId do gateway) num ledger.
// Os DEMAIS inscritos do pedido ficam intactos (parcial dentro do grupo).
//
// RN-337: SEM split de afiliação (afiliação foi cortada) — o estorno é do
// valor CHEIO da linha, sem clawback de comissão.
//
// RN-347 (taxa repassada): o refund devolve o que o inscrito PAGOU — a linha
// (`itens[].valorFinal`) + a fatia de taxa dele (`itens[].taxaRepassada`,
// só em evento 'repassada'). A contabilidade do ORGANIZADOR (reversão de
// `receitaConfirmada`, `estornadoTotal`, flip integral) usa SÓ o face
// (`valorFace` no ledger): a taxa nunca foi receita dele. Em 'incorporada'
// os dois valores coincidem — zero mudança de comportamento.
//
// SAGA EM 3 FASES + CARIMBO DURÁVEL DE ENVIO (RN-370/371/372 · decisão 46 do
// dono: "estorno só é feito utilizando via API do ASAAS, a solicitação é feita
// e pode cair; dependemos desse retorno do webhook deles"):
//   TX1 (COMPROMISSO): guards (papel/tenant/estado) + cria o ledger
//       `pagamentos/{pagamentoId}/estornos/{inscritoId}` com status
//       'pendente' e o VALOR CONGELADO em centavos. DocId determinístico
//       (= inscritoId): um estorno INTEGRAL por inscrito, nunca dois.
//   CARIMBO + REFUND: o ledger vai a 'enviando' ANTES do POST (RN-370) e o
//       POST só sai de 'pendente' (compare-and-set). Resposta do gateway:
//       'approved' (DONE) → efeito na hora; 'pending' → ledger 'solicitado'
//       com o refundId e a AUTORIDADE passa para o webhook (RN-372);
//       timeout/erro sem resposta → 'gateway_sem_resposta' e NENHUMA nova
//       tentativa automática (RN-371 — o adapter marca `efeitoPossivel`).
//   TX2 (EFEITO, atômico): flip do inscrito + reversão da receita
//       (read-modify-write com roundMoney — nunca increment de float) +
//       `pagamentos.estornadoTotal` acumulado + ledger 'aprovado'.
//
// POR QUE O CARIMBO (prova, não teoria — ASAASTETO-REV §V4): com o ledger
// parando em 'pendente', um timeout no POST era indistinguível de "crash
// antes do POST", e a segunda tentativa mandava um SEGUNDO estorno parcial
// que o Asaas aceita — dois POSTs medidos, comprador recebendo duas vezes e
// o livro registrando uma. O carimbo VIVO ('enviando'/'solicitado'/
// 'gateway_sem_resposta'/'divergencia_valor'/'rejeitado_gateway') bloqueia o
// re-envio: quem decide repetir é humano, contra o extrato (RN-371).
//
// Crash em QUALQUER ponto + retry da mesma chamada NUNCA duplica efeito:
// ledger 'aprovado' → replay devolve `duplicado: true` sem escrita; ledger
// 'solicitado' → devolve `aguardandoConfirmacao` sem novo POST; ledger
// 'pendente' → carimba e envia. Reexecutar o estorno já aplicado NÃO
// re-estorna, NÃO re-reverte, NÃO re-flipa.
//
// GUARDS (Schneier): só ORGANIZADOR (tenant_owner/tenant_staff do tenant DO
// PEDIDO — assertTenantWriter; athlete/promoter negados) dispara; só
// inscrito `confirmado` (pago) estorna — pendente/cancelado/estornado são
// negados pela matriz canônica (podeTransicionarStatusInscrito). O input NÃO
// carrega valor: o quanto estornar é decisão exclusiva do servidor.
//
// AGREGAÇÃO: o flip do inscrito dispara `onInscritoWrite` (agregarFinanceiro)
// que recomputa `eventos/{id}/financeiro/current` a partir da
// `receitaConfirmada` já revertida aqui — REUSO, nada recomputado à mão.
// `cupom.usos` NÃO decrementa: o cupom foi consumido pelo PEDIDO confirmado;
// estornar 1 inscrito não desfaz o uso (decisão explícita, documentada).
//
// Convenção monetária: docs em REAIS (2 casas); centavos SÓ na borda do
// gateway (valorCentavos congelado no ledger) — ADR-006.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  COLECAO_AFILIADOS,
  SUBCOLECAO_CONVERSOES_AFILIADO,
  calcularDevolucaoEstorno,
  computeComissaoConversao,
  dentroDaJanelaArrependimento,
  isComissaoAfiliadoValida,
  podeTransicionarStatusInscrito,
  podeTransicionarStatusPagamento,
  roundMoney,
  type AuthClaims,
  type ItemPedido,
  type PaymentProvider,
  type StatusInscrito,
  type StatusPagamento,
  type Timestamp,
} from '@leela/core';
import { lerPoliticaReembolsoTx } from '../eventos/lerPoliticaVendas';
import {
  assertTenantAtivo,
  assertTenantWriter,
  type EventoCaller,
} from '../eventos/criarEvento';
import { selectPaymentProvider } from '../payments/selectProvider';
import {
  AsaasApiError,
  AsaasTimeoutError,
  AsaasValidationError,
} from '../payments/asaasProvider';
import { MockRefundRecusadoError } from '../payments/mockProvider';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Input do estorno — SEM valor (o quanto estornar é decisão do servidor). */
export interface EstornarInscricaoInput {
  pedidoId: string;
  inscritoId: string;
  /** Motivo do estorno (auditoria — obrigatório, 3–500 caracteres). */
  motivo: string;
}

/** Resultado do estorno (consumido por testes e pela UI do organizador). */
export interface EstornarInscricaoResult {
  pedidoId: string;
  pagamentoId: string;
  inscritoId: string;
  /** Id do refund no gateway (prova da devolução). */
  refundId: string;
  /**
   * Valor estornado em R$ — o que o inscrito PAGOU: a LINHA dele no pedido
   * (`itens[].valorFinal`) + a fatia da taxa repassada (`itens[].taxaRepassada`)
   * quando o evento é 'repassada' (RN-347). Em 'incorporada' == valorFinal.
   */
  valorEstornado: number;
  /** true = estorno JÁ aplicado antes (replay idempotente) — zero efeito novo. */
  duplicado: boolean;
  /** true = com este estorno o pagamento ficou INTEGRALMENTE estornado. */
  pagamentoEstornadoIntegral: boolean;
  /** Estado do LEDGER durável depois desta chamada (RN-370). */
  estado: StatusEstornoLedger;
  /**
   * true = o gateway ACEITOU a solicitação mas ainda não a concluiu
   * ('pending'): o dinheiro ainda não foi dado por devolvido e NENHUM efeito
   * local foi aplicado. Quem fecha a saga é o webhook `PAYMENT_REFUNDED`
   * (RN-372) — não é erro, não pede retry.
   */
  aguardandoConfirmacao: boolean;
}

/** Nome da subcoleção-ledger de estornos por inscrito (write só Function). */
export const ESTORNOS_SUBCOL = 'estornos';

// ---------------------------------------------------------------------------
// Máquina do LEDGER de estorno (RN-370/371/372) — durável, não em memória
// ---------------------------------------------------------------------------

/**
 * Estados do ledger `pagamentos/{id}/estornos/{inscritoId}`.
 *
 * - `pendente`             compromisso criado, NENHUM POST saiu. Retentável.
 * - `enviando`             carimbo gravado ANTES do POST: se a Function morrer
 *                          aqui, o efeito no gateway é DESCONHECIDO.
 * - `solicitado`           o gateway aceitou e devolveu refundId com status
 *                          'pending' — a conclusão vem pelo webhook (RN-372).
 * - `gateway_sem_resposta` timeout/erro sem resposta: `efeitoPossivel` do
 *                          adapter (RN-371). O POST pode ter estornado.
 * - `divergencia_valor`    o gateway devolveu valor ≠ do congelado — dinheiro
 *                          se moveu fora do combinado, jamais re-enviar.
 * - `rejeitado_gateway`    o gateway respondeu com estorno recusado/cancelado
 *                          DEPOIS de aceitá-lo: estado ambíguo, confere-se no
 *                          extrato antes de qualquer nova tentativa.
 * - `aprovado`             efeito local aplicado (terminal).
 */
export const STATUS_ESTORNO_LEDGER = [
  'pendente',
  'enviando',
  'solicitado',
  'gateway_sem_resposta',
  'divergencia_valor',
  'rejeitado_gateway',
  'aprovado',
] as const;

export type StatusEstornoLedger = (typeof STATUS_ESTORNO_LEDGER)[number];

/**
 * Carimbo VIVO: um `POST /refund` desta chave já saiu (ou pode ter saído) e o
 * efeito no gateway não está fechado. Enviar de novo por cima é o ESTORNO
 * DUPLO provado em ASAASTETO-REV §V4 — proibido (RN-371). @pure
 */
export const STATUS_ESTORNO_CARIMBO_VIVO: readonly StatusEstornoLedger[] = [
  'enviando',
  'solicitado',
  'gateway_sem_resposta',
  'divergencia_valor',
  'rejeitado_gateway',
] as const;

/** O ledger tem carimbo vivo? (proíbe novo POST — RN-371). @pure */
export function carimboEstornoVivo(status: string): boolean {
  return (STATUS_ESTORNO_CARIMBO_VIVO as readonly string[]).includes(status);
}

/**
 * Único estado do qual um `POST /refund` pode sair. Tudo o mais é replay
 * ('aprovado') ou carimbo vivo. @pure
 */
export function podeEnviarRefund(status: string): boolean {
  return status === 'pendente';
}

/**
 * Estados em que o ledger AGUARDA a palavra do gateway e um webhook
 * `PAYMENT_REFUNDED` pode fechar a saga (RN-372). `enviando` entra porque a
 * Function pode ter morrido logo depois do POST bem-sucedido. @pure
 */
export const STATUS_ESTORNO_CONFIRMAVEL: readonly StatusEstornoLedger[] = [
  'enviando',
  'solicitado',
  'gateway_sem_resposta',
] as const;

/** Mensagem honesta de bloqueio por carimbo vivo (sem prometer desfecho). */
export function motivoCarimboVivo(status: string): string {
  switch (status) {
    case 'enviando':
      return (
        'Um pedido de estorno desta inscrição saiu para o gateway e a resposta ' +
        'não foi registrada — o efeito é desconhecido. Confira o extrato do ' +
        'gateway antes de qualquer nova tentativa (RN-371).'
      );
    case 'solicitado':
      return (
        'Estorno já solicitado ao gateway — aguardando a confirmação dele ' +
        '(RN-372). Nenhuma nova solicitação é enviada.'
      );
    case 'gateway_sem_resposta':
      return (
        'O gateway não respondeu ao pedido de estorno e a devolução PODE ter ' +
        'acontecido. Nenhuma nova tentativa é enviada automaticamente: ' +
        'confira o extrato do gateway e trate manualmente (RN-371).'
      );
    case 'divergencia_valor':
      return (
        'O gateway devolveu um valor diferente do congelado neste estorno — ' +
        'conferência manual obrigatória (RN-371).'
      );
    case 'rejeitado_gateway':
      return (
        'O gateway recusou/cancelou este estorno depois de aceitá-lo — ' +
        'conferência manual antes de tentar de novo (RN-371).'
      );
    default:
      return 'Estorno com carimbo vivo no ledger — conferência manual (RN-371).';
  }
}

/** Limites do motivo (auditoria útil, sem virar canal de payload). */
export const MOTIVO_MIN = 3;
export const MOTIVO_MAX = 500;

/**
 * Chave de idempotência do refund no gateway — DETERMINÍSTICA por
 * (pedido, inscrito): retry/replay reusa a MESMA chave e o provider devolve
 * o MESMO refund sem duplicar (RN-333/ADR-006). @pure
 */
export function refundIdempotencyKey(pedidoId: string, inscritoId: string): string {
  return `refund-${pedidoId}-${inscritoId}`;
}

/**
 * Valida o input bruto de `estornarInscricao`. Retorna a lista de erros
 * (vazia = válido). Pura — reutilizada pelos testes sem Emulator. @pure
 */
export function validarEstornarInscricaoInput(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Input é obrigatório.'];
  }
  const input = raw as Record<string, unknown>;
  const erros: string[] = [];

  if (typeof input['pedidoId'] !== 'string' || input['pedidoId'].length === 0) {
    erros.push('"pedidoId" é obrigatório.');
  }
  if (typeof input['inscritoId'] !== 'string' || input['inscritoId'].length === 0) {
    erros.push('"inscritoId" é obrigatório.');
  }
  const motivo = input['motivo'];
  if (typeof motivo !== 'string' || motivo.trim().length < MOTIVO_MIN) {
    erros.push(`"motivo" é obrigatório (mínimo ${MOTIVO_MIN} caracteres — auditoria).`);
  } else if (motivo.trim().length > MOTIVO_MAX) {
    erros.push(`"motivo" excede ${MOTIVO_MAX} caracteres.`);
  }

  return erros;
}

// ---------------------------------------------------------------------------
// TX1 — compromisso (guards + ledger 'pendente' com valor congelado)
// ---------------------------------------------------------------------------

/** Estado carregado/congelado que a fase de refund + TX2 consomem. */
interface CompromissoEstorno {
  pagamentoId: string;
  eventoId: string;
  chargeId: string;
  /**
   * Valor DEVOLVIDO AO COMPRADOR em R$ (congelado no ledger). DECISÃO RN-347:
   * o estorno devolve o que o inscrito PAGOU — `itens[].valorFinal` + a fatia
   * `itens[].taxaRepassada` dele quando o evento é 'repassada' (a taxa que o
   * comprador pagou volta com a linha; a Leela não retém taxa de venda
   * desfeita). Em 'incorporada' == valorFinal (comportamento vigente).
   */
  valor: number;
  /** O MESMO valor em centavos (borda do gateway — congelado no ledger). */
  valorCentavos: number;
  /**
   * Porção FACE da linha (itens[].valorFinal) em R$ — a contabilidade do
   * ORGANIZADOR: reversão de `receitaConfirmada` e acumulado
   * `estornadoTotal` usam SÓ ela (a taxa repassada nunca foi receita do
   * organizador — RN-347). Em 'incorporada' == valor.
   */
  valorFace: number;
  /** true = ledger já 'aprovado' (replay integral — nenhum efeito novo). */
  jaAprovado: boolean;
  /** Estado do ledger lido/gravado por TX1 (RN-370). */
  statusLedger: StatusEstornoLedger;
  /** Presentes só quando jaAprovado (dados de auditoria do replay). */
  refundId: string | null;
  pagamentoEstornadoIntegral: boolean;
  /** Motivo persistido no ledger (fonte do replay e do webhook). */
  motivo: string;
}

function lerCompromissoDoLedger(
  ledger: FirebaseFirestore.DocumentSnapshot,
  pagamentoId: string
): CompromissoEstorno {
  // Replay/crash-recovery: TUDO vem do ledger persistido (valor congelado —
  // NUNCA recomputado; o pedido pode ter mudado entre tentativa e retry).
  const valor = ledger.get('valor') as number;
  const valorCentavos = ledger.get('valorCentavos') as number;
  const chargeId = ledger.get('chargeId') as string;
  const eventoId = ledger.get('eventoId') as string;
  if (
    typeof valor !== 'number' ||
    !Number.isInteger(valorCentavos) ||
    typeof chargeId !== 'string' ||
    typeof eventoId !== 'string'
  ) {
    throw new https.HttpsError(
      'internal',
      `Ledger de estorno '${ledger.id}' corrompido — intervenção manual.`
    );
  }
  // RN-347: ledger PRÉ-RN347 não tem valorFace — era sempre 'incorporada',
  // onde o pago pelo inscrito == face da linha (fallback exato, não chute).
  const valorFaceRaw = ledger.get('valorFace') as number | undefined;
  const valorFace = typeof valorFaceRaw === 'number' ? valorFaceRaw : valor;
  // Ledger PRÉ-RN348 (ou doc de crash antigo) só conhece 'pendente'/'aprovado':
  // status fora do enum novo cai em 'pendente' quando não é aprovado — nunca
  // inventa carimbo vivo em doc legado (o pior caso legado é o que já existia).
  const statusRaw = ledger.get('status');
  const statusLedger: StatusEstornoLedger =
    typeof statusRaw === 'string' &&
    (STATUS_ESTORNO_LEDGER as readonly string[]).includes(statusRaw)
      ? (statusRaw as StatusEstornoLedger)
      : 'pendente';
  return {
    pagamentoId,
    eventoId,
    chargeId,
    valor,
    valorCentavos,
    valorFace,
    jaAprovado: statusLedger === 'aprovado',
    statusLedger,
    refundId: (ledger.get('refundId') as string | undefined) ?? null,
    pagamentoEstornadoIntegral: ledger.get('pagamentoEstornadoIntegral') === true,
    motivo: (ledger.get('motivo') as string | undefined) ?? '',
  };
}

async function comprometerEstorno(
  db: Db,
  input: EstornarInscricaoInput,
  tenantId: string,
  solicitadoPor: string,
  agora: Date
): Promise<CompromissoEstorno> {
  const pedidoRef = db.collection('pedidos').doc(input.pedidoId);

  return db.runTransaction(async (tx) => {
    // ── FASE DE LEITURA (toda leitura antes da escrita do ledger) ──────────
    const pedidoSnap = await tx.get(pedidoRef);
    if (!pedidoSnap.exists) {
      throw new https.HttpsError('not-found', `Pedido '${input.pedidoId}' não existe.`);
    }
    // Cross-tenant: organizador só estorna pedido do PRÓPRIO tenant (RN-400).
    if (pedidoSnap.get('tenantId') !== tenantId) {
      throw new https.HttpsError(
        'permission-denied',
        'Pedido pertence a outro tenant (RN-400).'
      );
    }
    const pagamentoId = pedidoSnap.get('pagamentoRef') as string | null;
    if (!pagamentoId) {
      throw new https.HttpsError(
        'failed-precondition',
        'Pedido ainda sem cobrança criada — nada a estornar.'
      );
    }
    const eventoId = pedidoSnap.get('eventoId') as string;
    const pagamentoRef = db.collection('pagamentos').doc(pagamentoId);
    const ledgerRef = pagamentoRef.collection(ESTORNOS_SUBCOL).doc(input.inscritoId);

    const ledgerSnap = await tx.get(ledgerRef);
    if (ledgerSnap.exists) {
      // Estorno já COMPROMETIDO (aprovado = replay; pendente = crash entre
      // TX1 e TX2): não recria, não re-guarda — o compromisso vale.
      return lerCompromissoDoLedger(ledgerSnap, pagamentoId);
    }

    // ── GUARDS de estado (SÓ para estorno novo) ────────────────────────────
    if (pedidoSnap.get('status') !== 'pago') {
      throw new https.HttpsError(
        'failed-precondition',
        `Pedido '${input.pedidoId}' está '${String(pedidoSnap.get('status'))}' — ` +
          `só pedido pago estorna (RN-341).`
      );
    }
    const inscritoRefs = (pedidoSnap.get('inscritoRefs') as string[]) ?? [];
    if (!inscritoRefs.includes(input.inscritoId)) {
      throw new https.HttpsError(
        'failed-precondition',
        `Inscrito '${input.inscritoId}' não pertence ao pedido '${input.pedidoId}' (ADR-011).`
      );
    }

    const pagamentoSnap = await tx.get(pagamentoRef);
    if (!pagamentoSnap.exists) {
      throw new https.HttpsError(
        'internal',
        `Pagamento '${pagamentoId}' do pedido não existe — estado incoerente.`
      );
    }
    const statusPagamento = pagamentoSnap.get('status') as StatusPagamento;
    if (statusPagamento !== 'confirmado') {
      throw new https.HttpsError(
        'failed-precondition',
        statusPagamento === 'estornado'
          ? 'Pagamento já integralmente estornado — nada restante a estornar.'
          : `Pagamento está '${statusPagamento}' — só pagamento confirmado estorna.`
      );
    }
    const chargeId = pagamentoSnap.get('gatewayChargeId') as string | null;
    if (!chargeId) {
      throw new https.HttpsError(
        'failed-precondition',
        'Cobrança ainda sem chargeId no gateway — nada a estornar.'
      );
    }

    const inscritoRef = db
      .collection('eventos')
      .doc(eventoId)
      .collection('inscritos')
      .doc(input.inscritoId);
    const inscritoSnap = await tx.get(inscritoRef);
    if (!inscritoSnap.exists) {
      throw new https.HttpsError(
        'not-found',
        `Inscrito '${input.inscritoId}' não existe no evento '${eventoId}'.`
      );
    }
    if (inscritoSnap.get('pedidoRef') !== input.pedidoId) {
      throw new https.HttpsError(
        'failed-precondition',
        'Vínculo inscrito↔pedido incoerente — estorno bloqueado (ADR-011).'
      );
    }
    const statusInscrito = inscritoSnap.get('status') as StatusInscrito;
    // Matriz canônica (core): só `confirmado → estornado`. Nega pendente
    // (não pago), cancelado e já-estornado — nunca re-derivar localmente.
    if (!podeTransicionarStatusInscrito(statusInscrito, 'estornado')) {
      throw new https.HttpsError(
        'failed-precondition',
        `Inscrito '${input.inscritoId}' está '${statusInscrito}' — só inscrição ` +
          `confirmada (paga) estorna (RN-341).`
      );
    }

    // ── VALOR DO SERVIDOR: a linha do inscrito em pedido.itens[] ──────────
    const itens = (pedidoSnap.get('itens') as ItemPedido[]) ?? [];
    const item = itens.find((i) => i?.inscritoRef === input.inscritoId);
    if (!item || typeof item.valorFinal !== 'number') {
      throw new https.HttpsError(
        'internal',
        `Pedido '${input.pedidoId}' sem linha do inscrito '${input.inscritoId}' — ` +
          `decomposição por inscrito corrompida (ADR-011).`
      );
    }
    // RN-347 (DECISÃO documentada): o estorno devolve o que o inscrito PAGOU
    // — face da linha + fatia da taxa repassada (0/ausente em 'incorporada' e
    // em pedidos pré-RN347). A contabilidade do ORGANIZADOR (reversão de
    // receita, estornadoTotal, flip integral) usa SÓ o face — a taxa nunca
    // foi receita dele. Campo presente mas fora do contrato = doc corrompido.
    const taxaLinhaRaw = item.taxaRepassada;
    if (
      taxaLinhaRaw !== undefined &&
      (typeof taxaLinhaRaw !== 'number' ||
        !Number.isFinite(taxaLinhaRaw) ||
        taxaLinhaRaw < 0)
    ) {
      throw new https.HttpsError(
        'internal',
        `Pedido '${input.pedidoId}' com itens[].taxaRepassada inválida — ` +
          `decomposição RN-347 corrompida.`
      );
    }
    // RN-373/374 (decisão 42 do dono — "aceito a proposta dos 7 dias"): a
    // taxa de serviço volta DENTRO da janela de arrependimento (art. 49) e
    // segue a política fora dela (default: retida). A janela é do relógio da
    // COMPRA — um estorno autorizado na véspera dentro dos 7 dias devolve a
    // taxa do mesmo jeito. Doc de política ausente = defaults legais.
    const compradoEm = pedidoSnap.get('criadoEm') as Timestamp | undefined;
    const politicaReembolso = await lerPoliticaReembolsoTx(
      tx,
      db,
      eventoId,
      tenantId
    );
    // Pedido sem carimbo de compra (doc corrompido/seed antigo): trata como
    // FORA da janela seria punir o comprador por defeito nosso — trata como
    // DENTRO (o lado seguro juridicamente) e registra.
    const dentroDaJanela =
      compradoEm === undefined
        ? true
        : dentroDaJanelaArrependimento(politicaReembolso, compradoEm, agora);
    if (compradoEm === undefined) {
      logger.warn('estorno_pedido_sem_criadoEm_janela_presumida', {
        pedidoId: input.pedidoId,
      });
    }
    const devolucao = calcularDevolucaoEstorno(
      politicaReembolso,
      item.valorFinal,
      taxaLinhaRaw ?? 0,
      dentroDaJanela
    );
    const valorFace = devolucao.valorFace;
    const valor = devolucao.valorDevolvido;
    const valorCentavos = Math.round(valor * 100);
    if (valorCentavos <= 0) {
      // Linha 100% descontada: não há dinheiro a devolver — o fluxo certo é
      // CANCELAMENTO, não estorno (máquina de dinheiro fica pura).
      throw new https.HttpsError(
        'failed-precondition',
        'Linha do inscrito sem valor pago — use cancelamento, não estorno.'
      );
    }

    // ── COMPROMISSO: ledger 'pendente' com o valor CONGELADO ──────────────
    tx.create(ledgerRef, {
      pedidoId: input.pedidoId,
      inscritoId: input.inscritoId,
      eventoId,
      tenantId,
      chargeId,
      valor,
      valorCentavos,
      // Porção FACE (organizador) — ver CompromissoEstorno (RN-347)
      valorFace,
      // Trilha da RN-373/374: o que voltou de taxa, o que ficou, e por quê.
      taxaDevolvida: devolucao.taxaDevolvida,
      taxaRetida: devolucao.taxaRetida,
      dentroDaJanelaArrependimento: devolucao.dentroDaJanela,
      motivo: input.motivo.trim(),
      solicitadoPor,
      status: 'pendente',
      criadoEm: FieldValue.serverTimestamp(),
    });

    return {
      pagamentoId,
      eventoId,
      chargeId,
      valor,
      valorCentavos,
      valorFace,
      jaAprovado: false,
      statusLedger: 'pendente',
      refundId: null,
      pagamentoEstornadoIntegral: false,
      motivo: input.motivo.trim(),
    };
  });
}

// ---------------------------------------------------------------------------
// CARIMBO DE ENVIO (RN-370) — o ledger sabe que um POST saiu, ANTES dele sair
// ---------------------------------------------------------------------------

/**
 * Compare-and-set 'pendente' → 'enviando' numa transação própria, ANTES do
 * `POST /refund`. Devolve `false` quando outro caller já carimbou (corrida) ou
 * quando o ledger saiu de 'pendente' — nos dois casos ESTE caller não envia.
 *
 * A transação é separada de propósito: ela precisa estar COMMITADA antes do
 * POST, senão o carimbo não sobrevive ao timeout que ele existe para cobrir.
 */
async function carimbarEnvio(
  db: Db,
  pagamentoId: string,
  inscritoId: string
): Promise<boolean> {
  const ledgerRef = db
    .collection('pagamentos')
    .doc(pagamentoId)
    .collection(ESTORNOS_SUBCOL)
    .doc(inscritoId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ledgerRef);
    if (!snap.exists) {
      throw new https.HttpsError(
        'internal',
        'Ledger do estorno desapareceu antes do envio — intervenção manual.'
      );
    }
    if (!podeEnviarRefund(String(snap.get('status')))) return false;
    const tentativas =
      typeof snap.get('tentativasEnvio') === 'number'
        ? (snap.get('tentativasEnvio') as number)
        : 0;
    tx.update(ledgerRef, {
      status: 'enviando',
      envioIniciadoEm: FieldValue.serverTimestamp(),
      tentativasEnvio: tentativas + 1,
    });
    return true;
  });
}

/** Move o carimbo para um estado terminal-de-envio, com a trilha do porquê. */
async function marcarCarimbo(
  db: Db,
  pagamentoId: string,
  inscritoId: string,
  status: StatusEstornoLedger,
  extras: Record<string, unknown> = {}
): Promise<void> {
  await db
    .collection('pagamentos')
    .doc(pagamentoId)
    .collection(ESTORNOS_SUBCOL)
    .doc(inscritoId)
    .update({
      status,
      ...extras,
      carimboAtualizadoEm: FieldValue.serverTimestamp(),
    });
}

/**
 * A falha do `provider.refund` prova que NENHUM estorno foi criado no gateway?
 *
 * Só devolve `true` para falhas em que o gateway (ou o próprio adapter) deu
 * resposta explícita ANTES de qualquer efeito:
 *   - validação local do adapter/mock (a chamada nem saiu);
 *   - HTTP 4xx que não é 429 (o gateway leu e recusou — ex.: PIX sem saldo).
 * TODO o resto — timeout (`efeitoPossivel`), 5xx, 429, rede caída, erro
 * desconhecido — é tratado como EFEITO POSSÍVEL (RN-371). Default conservador
 * de propósito: em dinheiro, "não sei" vale como "pode ter acontecido".
 */
export function falhaRefundSemEfeito(err: unknown): boolean {
  if (err instanceof AsaasValidationError) return true;
  if (err instanceof MockRefundRecusadoError) return true;
  if (err instanceof AsaasTimeoutError) return !err.efeitoPossivel;
  if (err instanceof AsaasApiError) {
    return err.httpStatus >= 400 && err.httpStatus < 500 && err.httpStatus !== 429;
  }
  return false;
}

// ---------------------------------------------------------------------------
// TX2 — efeito atômico (flip + reversão + acumulado + ledger 'aprovado')
// ---------------------------------------------------------------------------

/** Meio centavo — ruído de FP; qualquer desvio real de dinheiro estoura. */
const TOL = 0.005;

interface EfeitoEstorno {
  duplicado: boolean;
  refundId: string;
  pagamentoEstornadoIntegral: boolean;
}

async function aplicarEfeitoEstorno(
  db: Db,
  input: EstornarInscricaoInput,
  compromisso: CompromissoEstorno,
  refundId: string
): Promise<EfeitoEstorno> {
  const pagamentoRef = db.collection('pagamentos').doc(compromisso.pagamentoId);
  const ledgerRef = pagamentoRef.collection(ESTORNOS_SUBCOL).doc(input.inscritoId);
  const eventoRef = db.collection('eventos').doc(compromisso.eventoId);
  const inscritoRef = eventoRef.collection('inscritos').doc(input.inscritoId);

  return db.runTransaction(async (tx) => {
    // ── FASE DE LEITURA ────────────────────────────────────────────────────
    const [ledgerSnap, pagamentoSnap, inscritoSnap, eventoSnap] = await Promise.all([
      tx.get(ledgerRef),
      tx.get(pagamentoRef),
      tx.get(inscritoRef),
      tx.get(eventoRef),
    ]);

    // FIX review antagonista R9-E (Finding 1b — o gate RN-315 ficava aberto
    // para sempre): o estorno DECREMENTA a conversão do afiliado. Sem isso, um
    // afiliado auto-comprava até cruzar `minimoInscricoes`, estornava, e o
    // cupom vinculado ficava permanentemente ativo (desconto para todos sem a
    // condição real). Lê o carimbo `pagamento.afiliado` e o doc de conversão
    // (chave = pedidoId) na FASE DE LEITURA. Idempotente: TX2 roda uma única
    // vez por estorno (guarda do ledger pendente→aprovado).
    const afiliadoBloco = pagamentoSnap.exists
      ? (pagamentoSnap.get('afiliado') as { afiliadoId?: string } | undefined)
      : undefined;
    const afiliadoIdEstorno =
      afiliadoBloco !== undefined &&
      typeof afiliadoBloco.afiliadoId === 'string' &&
      afiliadoBloco.afiliadoId.length > 0
        ? afiliadoBloco.afiliadoId
        : null;
    const afiliadoRefEstorno =
      afiliadoIdEstorno !== null
        ? eventoRef.collection(COLECAO_AFILIADOS).doc(afiliadoIdEstorno)
        : null;
    const conversaoRefEstorno =
      afiliadoRefEstorno !== null
        ? afiliadoRefEstorno
            .collection(SUBCOLECAO_CONVERSOES_AFILIADO)
            .doc(input.pedidoId)
        : null;
    const [afiliadoSnapEstorno, conversaoSnapEstorno] = await Promise.all([
      afiliadoRefEstorno !== null ? tx.get(afiliadoRefEstorno) : Promise.resolve(null),
      conversaoRefEstorno !== null ? tx.get(conversaoRefEstorno) : Promise.resolve(null),
    ]);
    if (!ledgerSnap.exists) {
      throw new https.HttpsError(
        'internal',
        'Ledger do estorno desapareceu entre compromisso e efeito — intervenção manual.'
      );
    }
    if (ledgerSnap.get('status') === 'aprovado') {
      // Corrida entre retries: outro caller completou a saga — zero escrita.
      return {
        duplicado: true,
        refundId: (ledgerSnap.get('refundId') as string) ?? refundId,
        pagamentoEstornadoIntegral:
          ledgerSnap.get('pagamentoEstornadoIntegral') === true,
      };
    }
    if (!pagamentoSnap.exists || !eventoSnap.exists) {
      throw new https.HttpsError(
        'internal',
        'Pagamento/evento do estorno não existem — estado incoerente.'
      );
    }

    const agora = FieldValue.serverTimestamp();
    // RN-347: a contabilidade do ORGANIZADOR usa a porção FACE da linha —
    // `compromisso.valor` (face + taxa repassada) é o que voltou ao COMPRADOR
    // no gateway; a taxa nunca entrou em receitaConfirmada/valorFinal, então
    // nunca sai deles. Em 'incorporada' valorFace == valor (inalterado).
    const valorFace = compromisso.valorFace;

    // ── ESCRITAS (todas na MESMA transação — Kleppmann) ────────────────────
    // 1. Flip do inscrito → 'estornado' + carimbo. O refund no gateway JÁ
    //    aconteceu (fato dominante): se uma escrita de cliente correu no meio
    //    (ex.: cancelou), o estado final ainda registra a devolução. Doc
    //    deletado no intervalo: pula o flip (dinheiro segue coerente via
    //    receita + ledger) e loga — nunca aborta a reversão.
    if (!inscritoSnap.exists) {
      logger.warn('estorno_inscrito_ausente_no_efeito', {
        pedidoId: input.pedidoId,
        inscritoId: input.inscritoId,
      });
    } else if (inscritoSnap.get('status') !== 'estornado') {
      tx.update(inscritoRef, {
        status: 'estornado',
        estornadoEm: agora,
        atualizadoEm: agora,
      });
    }

    // 2. Acumulado do pagamento (read-modify-write + roundMoney — nunca
    //    FieldValue.increment de float) + flip 'estornado' quando INTEGRAL
    //    (Σ estornos == valorFinal — matriz canônica: confirmado→estornado).
    //    `estornadoTotal` acumula a porção FACE (RN-347) — comparável com
    //    `valorFinal` nos dois modos; o devolvido ao comprador (com taxa)
    //    vive nas linhas do ledger.
    const valorFinal = pagamentoSnap.get('valorFinal') as number;
    const estornadoAtual =
      typeof pagamentoSnap.get('estornadoTotal') === 'number'
        ? (pagamentoSnap.get('estornadoTotal') as number)
        : 0;
    const estornadoNovo = roundMoney(estornadoAtual + valorFace);
    if (estornadoNovo > valorFinal + TOL) {
      throw new https.HttpsError(
        'internal',
        `Estorno acumulado (${estornadoNovo}) excederia o pagamento ` +
          `(${valorFinal}) — dado corrompido, intervenção manual.`
      );
    }
    const integral = estornadoNovo >= valorFinal - TOL;
    const patchPagamento: Record<string, unknown> = {
      estornadoTotal: estornadoNovo,
      atualizadoEm: agora,
    };
    if (
      integral &&
      pagamentoSnap.get('status') === 'confirmado' &&
      podeTransicionarStatusPagamento('confirmado', 'estornado')
    ) {
      patchPagamento['status'] = 'estornado';
    }
    tx.update(pagamentoRef, patchPagamento);

    // 3. REVERSÃO da receita agregada — o espelho exato do que o webhook
    //    somou na confirmação (read-modify-write + roundMoney, serializado
    //    pela transação). Nunca fabrica nem deixa negativo: reverter mais do
    //    que existe é corrupção — parada dura.
    const receitaAtual =
      typeof eventoSnap.get('receitaConfirmada') === 'number'
        ? (eventoSnap.get('receitaConfirmada') as number)
        : 0;
    // FACE (RN-347): o webhook somou `valorFinal` (face) à receita — a
    // reversão espelha exatamente; a taxa repassada nunca passou por aqui.
    const receitaNova = roundMoney(receitaAtual - valorFace);
    if (receitaNova < -TOL) {
      throw new https.HttpsError(
        'internal',
        `Reversão (${valorFace}) excede a receita confirmada (${receitaAtual}) — ` +
          `dado corrompido, intervenção manual.`
      );
    }
    tx.update(eventoRef, {
      receitaConfirmada: Math.max(0, receitaNova),
      atualizadoEm: agora,
    });

    // 4. Ledger → 'aprovado' (auditoria: quem/quando/quanto/motivo já estão
    //    no doc desde TX1; aqui entram a prova do gateway e o carimbo).
    tx.update(ledgerRef, {
      status: 'aprovado',
      refundId,
      pagamentoEstornadoIntegral: integral,
      processadoEm: agora,
    });

    // 5. DECREMENTO da conversão do afiliado (Finding 1b): 1 inscrição a
    //    menos + o valor FACE da linha estornada. `conversoes` conta
    //    inscrições (base do gate RN-315), então cai 1 por estorno de
    //    inscrito. A conversão do PEDIDO reduz `qtdInscricoes`/`valor`; ao
    //    zerar as inscrições, o doc some (trilha encerrada). Read-modify-write
    //    cent-exato, clampado a 0 (nunca negativo). Só quando ambos os docs
    //    existem (afiliado pode ter sido removido; conversão pode nunca ter
    //    sido registrada — fora da janela na confirmação).
    if (
      afiliadoRefEstorno !== null &&
      conversaoRefEstorno !== null &&
      afiliadoSnapEstorno !== null &&
      afiliadoSnapEstorno.exists &&
      conversaoSnapEstorno !== null &&
      conversaoSnapEstorno.exists
    ) {
      const conversoesAtual =
        typeof afiliadoSnapEstorno.get('conversoes') === 'number'
          ? (afiliadoSnapEstorno.get('conversoes') as number)
          : 0;
      const valorAtribuidoAtual =
        typeof afiliadoSnapEstorno.get('valorAtribuido') === 'number'
          ? (afiliadoSnapEstorno.get('valorAtribuido') as number)
          : 0;

      const qtdConv =
        typeof conversaoSnapEstorno.get('qtdInscricoes') === 'number'
          ? (conversaoSnapEstorno.get('qtdInscricoes') as number)
          : 1;
      const valorConv =
        typeof conversaoSnapEstorno.get('valor') === 'number'
          ? (conversaoSnapEstorno.get('valor') as number)
          : 0;

      // COMISSÃO (COMF2 fase 2 — mesma TX do Finding 1b): o estorno
      // decrementa a comissão pela config CONGELADA na conversão (nunca a
      // vigente do afiliado — anti forja pós-venda nos DOIS sentidos). O
      // invariante do doc de conversão é `comissao == compute(config, valor,
      // qtd)`: recomputa-se a comissão RESTANTE sobre o valor/qtd restantes e
      // o delta (atual − restante) sai do ∑ comissaoAcumulada — cent-exato,
      // clampado a 0 (comissão NUNCA negativa). Conversão pré-fase-2 (sem
      // campos) decrementa 0 — comportamento R9-E intacto. Replay do estorno
      // não re-decrementa (guarda do ledger pendente→aprovado, inalterada).
      const comissaoConfigRaw = conversaoSnapEstorno.get('comissaoConfig');
      const comissaoConfigCongelada = isComissaoAfiliadoValida(comissaoConfigRaw)
        ? comissaoConfigRaw
        : null;
      const comissaoAtualConv =
        typeof conversaoSnapEstorno.get('comissao') === 'number'
          ? (conversaoSnapEstorno.get('comissao') as number)
          : 0;
      const qtdRestante = Math.max(0, qtdConv - 1);
      const valorRestante = Math.max(0, roundMoney(valorConv - valorFace));
      const comissaoRestante =
        qtdConv <= 1
          ? 0
          : computeComissaoConversao(
              comissaoConfigCongelada,
              valorRestante,
              qtdRestante
            );
      const deltaComissao = Math.max(
        0,
        roundMoney(comissaoAtualConv - comissaoRestante)
      );
      const comissaoAcumuladaAtual =
        typeof afiliadoSnapEstorno.get('comissaoAcumulada') === 'number'
          ? (afiliadoSnapEstorno.get('comissaoAcumulada') as number)
          : 0;

      tx.update(afiliadoRefEstorno, {
        conversoes: Math.max(0, conversoesAtual - 1),
        valorAtribuido: Math.max(0, roundMoney(valorAtribuidoAtual - valorFace)),
        comissaoAcumulada: Math.max(
          0,
          roundMoney(comissaoAcumuladaAtual - deltaComissao)
        ),
        atualizadoEm: agora,
      });

      if (qtdConv <= 1) {
        tx.delete(conversaoRefEstorno);
      } else {
        tx.update(conversaoRefEstorno, {
          qtdInscricoes: qtdRestante,
          valor: valorRestante,
          comissao: comissaoRestante,
        });
      }
    }

    return { duplicado: false, refundId, pagamentoEstornadoIntegral: integral };
  });
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

/**
 * Estorna UM inscrito do pedido em grupo (ADR-011/RN-341). Idempotente por
 * (pedidoId, inscritoId) — ver saga no cabeçalho do arquivo.
 */
export async function estornarInscricaoCore(
  db: Db,
  provider: PaymentProvider,
  rawInput: unknown,
  caller: EventoCaller,
  /** Relógio INJETADO (RN-373: a janela de arrependimento é derivação pura). */
  agora: Date = new Date()
): Promise<EstornarInscricaoResult> {
  // GUARD de papel: só organizador (tenant_owner/tenant_staff) estorna —
  // athlete/promoter caem aqui com permission-denied (RN-401).
  const tenantId = assertTenantWriter(caller.claims);

  const erros = validarEstornarInscricaoInput(rawInput);
  if (erros.length > 0) {
    throw new https.HttpsError(
      'invalid-argument',
      `EstornarInscricaoInput inválido: ${erros.join(' ')}`
    );
  }
  const input = rawInput as unknown as EstornarInscricaoInput;

  await assertTenantAtivo(db, tenantId);

  // ── TX1: compromisso (ou leitura do compromisso existente) ───────────────
  const compromisso = await comprometerEstorno(
    db,
    input,
    tenantId,
    caller.uid,
    agora
  );

  const base = {
    pedidoId: input.pedidoId,
    pagamentoId: compromisso.pagamentoId,
    inscritoId: input.inscritoId,
    valorEstornado: compromisso.valor,
  };

  if (compromisso.jaAprovado) {
    // Replay integral: estorno já aplicado — devolve o resultado gravado.
    logger.info('estorno_replay_idempotente', {
      pedidoId: input.pedidoId,
      inscritoId: input.inscritoId,
    });
    return {
      ...base,
      refundId: compromisso.refundId ?? '',
      duplicado: true,
      pagamentoEstornadoIntegral: compromisso.pagamentoEstornadoIntegral,
      estado: 'aprovado',
      aguardandoConfirmacao: false,
    };
  }

  // ── CARIMBO VIVO (RN-371): um POST desta chave já saiu — NUNCA re-enviar ──
  if (carimboEstornoVivo(compromisso.statusLedger)) {
    if (compromisso.statusLedger === 'solicitado') {
      // Caminho normal do assíncrono: já pedimos, o gateway aceitou, a
      // confirmação é do webhook. Não é erro — é estado.
      logger.info('estorno_aguardando_webhook', {
        pedidoId: input.pedidoId,
        inscritoId: input.inscritoId,
        refundId: compromisso.refundId,
      });
      return {
        ...base,
        refundId: compromisso.refundId ?? '',
        duplicado: true,
        pagamentoEstornadoIntegral: false,
        estado: 'solicitado',
        aguardandoConfirmacao: true,
      };
    }
    logger.error('estorno_bloqueado_carimbo_vivo', {
      pedidoId: input.pedidoId,
      inscritoId: input.inscritoId,
      pagamentoId: compromisso.pagamentoId,
      statusLedger: compromisso.statusLedger,
    });
    throw new https.HttpsError(
      'failed-precondition',
      motivoCarimboVivo(compromisso.statusLedger)
    );
  }

  // ── CARIMBO ANTES DO POST (RN-370): compare-and-set 'pendente'→'enviando' ──
  const carimbou = await carimbarEnvio(
    db,
    compromisso.pagamentoId,
    input.inscritoId
  );
  if (!carimbou) {
    // Corrida: outro caller carimbou entre TX1 e aqui. Ninguém envia dois.
    throw new https.HttpsError(
      'failed-precondition',
      'Outro pedido de estorno desta inscrição já está em andamento — ' +
        'nenhuma segunda solicitação foi enviada (RN-371).'
    );
  }

  // ── REFUND no gateway — chave determinística, valor CONGELADO do ledger ──
  let refund;
  try {
    refund = await provider.refund({
      chargeId: compromisso.chargeId,
      tenantId,
      amount: compromisso.valorCentavos,
      reason: input.motivo.trim(),
      idempotencyKey: refundIdempotencyKey(input.pedidoId, input.inscritoId),
    });
  } catch (err) {
    const semEfeito = falhaRefundSemEfeito(err);
    const detalhe = err instanceof Error ? err.message : String(err);
    // Prova de que o gateway recusou ANTES de mover dinheiro ⇒ o carimbo
    // volta a 'pendente' e uma nova tentativa é legítima. Sem essa prova, o
    // carimbo VIRA bloqueio (RN-371) — nada de retry automático.
    await marcarCarimbo(
      db,
      compromisso.pagamentoId,
      input.inscritoId,
      semEfeito ? 'pendente' : 'gateway_sem_resposta',
      { ultimaFalhaEnvio: detalhe.slice(0, 500) }
    );
    if (semEfeito) throw err;
    logger.error('estorno_gateway_sem_resposta', {
      pedidoId: input.pedidoId,
      inscritoId: input.inscritoId,
      pagamentoId: compromisso.pagamentoId,
      erro: detalhe.slice(0, 200),
    });
    throw new https.HttpsError(
      'failed-precondition',
      motivoCarimboVivo('gateway_sem_resposta')
    );
  }

  // Integridade cruzada (Schneier): o gateway devolveu EXATAMENTE a linha do
  // inscrito? Divergência de dinheiro NUNCA passa — e agora TRAVA o ledger
  // ('divergencia_valor'), porque re-enviar por cima de um estorno de valor
  // errado é somar erro a erro.
  if (refund.amount !== compromisso.valorCentavos) {
    await marcarCarimbo(
      db,
      compromisso.pagamentoId,
      input.inscritoId,
      'divergencia_valor',
      { refundId: refund.refundId, valorDevolvidoCentavos: refund.amount }
    );
    throw new https.HttpsError(
      'internal',
      `Refund do gateway (${refund.amount}) diverge do valor da linha ` +
        `(${compromisso.valorCentavos}) — efeito NÃO aplicado.`
    );
  }

  if (refund.status === 'rejected') {
    // O gateway aceitou a chamada e recusou/cancelou o estorno: estado
    // ambíguo (o Asaas usa CANCELLED). Carimbo vivo, conferência humana.
    await marcarCarimbo(
      db,
      compromisso.pagamentoId,
      input.inscritoId,
      'rejeitado_gateway',
      { refundId: refund.refundId }
    );
    throw new https.HttpsError(
      'failed-precondition',
      motivoCarimboVivo('rejeitado_gateway')
    );
  }

  // Aceito pelo gateway: o refundId é a prova do envio e vai para o ledger
  // ANTES de qualquer efeito local (é ele que o webhook usa para casar).
  await marcarCarimbo(
    db,
    compromisso.pagamentoId,
    input.inscritoId,
    'solicitado',
    { refundId: refund.refundId, solicitadoEm: FieldValue.serverTimestamp() }
  );

  if (refund.status !== 'approved') {
    // 'pending' — o Asaas processa o estorno de PIX de forma assíncrona
    // (decisão 46): a AUTORIDADE do desfecho é o webhook PAYMENT_REFUNDED.
    // Nenhum efeito local, nenhum erro, nenhuma nova tentativa.
    logger.info('estorno_solicitado_aguardando_webhook', {
      pedidoId: input.pedidoId,
      inscritoId: input.inscritoId,
      pagamentoId: compromisso.pagamentoId,
      refundId: refund.refundId,
      valorSolicitado: compromisso.valor,
    });
    return {
      ...base,
      refundId: refund.refundId,
      duplicado: false,
      pagamentoEstornadoIntegral: false,
      estado: 'solicitado',
      aguardandoConfirmacao: true,
    };
  }

  // ── TX2: efeito atômico (gateway já concluiu — 'approved'/DONE) ───────────
  const efeito = await aplicarEfeitoEstorno(db, input, compromisso, refund.refundId);

  // Sem PII no log (LGPD) — só ids e valores agregados
  logger.info('estorno_inscricao_processado', {
    pedidoId: input.pedidoId,
    inscritoId: input.inscritoId,
    pagamentoId: compromisso.pagamentoId,
    refundId: efeito.refundId,
    valorEstornado: compromisso.valor,
    duplicado: efeito.duplicado,
    integral: efeito.pagamentoEstornadoIntegral,
  });

  return {
    ...base,
    refundId: efeito.refundId,
    duplicado: efeito.duplicado,
    pagamentoEstornadoIntegral: efeito.pagamentoEstornadoIntegral,
    estado: 'aprovado',
    aguardandoConfirmacao: false,
  };
}

// ---------------------------------------------------------------------------
// CONFIRMAÇÃO PELO WEBHOOK (RN-372) — a autoridade do desfecho do estorno
// ---------------------------------------------------------------------------

/** O que a entrega de webhook diz sobre o estorno (do WebhookResult.refund). */
export interface ConfirmacaoEstornoWebhook {
  refundId?: string;
  amountCentavos?: number;
}

export interface ResultadoConfirmacaoEstorno {
  /** Ledger fechado por esta entrega (ausente = nada a fechar). */
  inscritoId?: string;
  /** Evento do ledger fechado (para a máquina de reembolso — RN-341). */
  eventoId?: string;
  aplicado: boolean;
  motivo:
    | 'confirmado'
    | 'ja_aprovado'
    | 'sem_carimbo_vivo'
    | 'ambiguo'
    | 'sem_pagamento';
}

/**
 * Fecha a saga de estorno a partir do webhook `PAYMENT_REFUNDED` (decisão 46:
 * "dependemos desse retorno do webhook deles").
 *
 * Casamento do ledger, nesta ordem — nunca por adivinhação:
 *   1. `refundId` da entrega × `refundId` carimbado ('solicitado');
 *   2. valor estornado da entrega × `valorCentavos` congelado, quando o
 *      casamento é ÚNICO entre os carimbos vivos;
 *   3. carimbo vivo ÚNICO no pagamento (não há o que confundir).
 * Mais de um candidato sem desempate ⇒ NENHUM efeito + alerta (`ambiguo`):
 * aplicar o estorno errado num pedido de grupo é dinheiro errado no livro.
 *
 * Idempotente: TX2 já barra ledger 'aprovado' (replay devolve `duplicado`).
 */
export async function confirmarEstornoPorWebhook(
  db: Db,
  pagamentoId: string,
  confirmacao: ConfirmacaoEstornoWebhook = {}
): Promise<ResultadoConfirmacaoEstorno> {
  const pagamentoRef = db.collection('pagamentos').doc(pagamentoId);
  const ledgerSnaps = await pagamentoRef.collection(ESTORNOS_SUBCOL).get();
  if (ledgerSnaps.empty) {
    return { aplicado: false, motivo: 'sem_carimbo_vivo' };
  }

  const vivos = ledgerSnaps.docs.filter((d) =>
    (STATUS_ESTORNO_CONFIRMAVEL as readonly string[]).includes(
      String(d.get('status'))
    )
  );
  if (vivos.length === 0) {
    const jaAprovado = ledgerSnaps.docs.some((d) => d.get('status') === 'aprovado');
    return {
      aplicado: false,
      motivo: jaAprovado ? 'ja_aprovado' : 'sem_carimbo_vivo',
    };
  }

  let alvo = confirmacao.refundId
    ? vivos.find((d) => d.get('refundId') === confirmacao.refundId)
    : undefined;
  if (alvo === undefined && typeof confirmacao.amountCentavos === 'number') {
    const porValor = vivos.filter(
      (d) => d.get('valorCentavos') === confirmacao.amountCentavos
    );
    if (porValor.length === 1) alvo = porValor[0];
  }
  if (alvo === undefined && vivos.length === 1) alvo = vivos[0];
  if (alvo === undefined) {
    logger.error('estorno_webhook_ambiguo', {
      pagamentoId,
      carimbosVivos: vivos.length,
      refundIdEntrega: confirmacao.refundId ?? null,
    });
    return { aplicado: false, motivo: 'ambiguo' };
  }

  const compromisso = lerCompromissoDoLedger(alvo, pagamentoId);
  const inscritoId = alvo.id;
  const pedidoId = alvo.get('pedidoId') as string;
  const refundId =
    confirmacao.refundId ??
    compromisso.refundId ??
    `webhook:${pagamentoId}:${inscritoId}`;

  const efeito = await aplicarEfeitoEstorno(
    db,
    { pedidoId, inscritoId, motivo: compromisso.motivo },
    compromisso,
    refundId
  );

  logger.info('estorno_confirmado_por_webhook', {
    pagamentoId,
    pedidoId,
    inscritoId,
    refundId,
    valorEstornado: compromisso.valor,
    duplicado: efeito.duplicado,
    integral: efeito.pagamentoEstornadoIntegral,
  });

  return {
    inscritoId,
    eventoId: compromisso.eventoId,
    aplicado: !efeito.duplicado,
    motivo: efeito.duplicado ? 'ja_aprovado' : 'confirmado',
  };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `estornarInscricao` — callable do organizador (estorno por inscrito). */
export const estornarInscricao = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return estornarInscricaoCore(
    admin.firestore(),
    selectPaymentProvider(),
    data,
    {
      uid: context.auth.uid,
      claims: context.auth.token as unknown as AuthClaims,
    }
  );
});
