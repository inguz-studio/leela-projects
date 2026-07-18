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
// SAGA EM 2 TRANSAÇÕES + REFUND IDEMPOTENTE (mesmo desenho at-least-once do
// createInscricaoCharge — Kleppmann "idempotency tokens em toda mutation"):
//   TX1 (COMPROMISSO): guards (papel/tenant/estado) + cria o ledger
//       `pagamentos/{pagamentoId}/estornos/{inscritoId}` com status
//       'pendente' e o VALOR CONGELADO em centavos. DocId determinístico
//       (= inscritoId): um estorno INTEGRAL por inscrito, nunca dois.
//   REFUND: `provider.refund` com chave determinística
//       `refund-{pedidoId}-{inscritoId}` — retry NUNCA duplica o refund no
//       gateway (contrato ADR-006; MockPaymentProvider cumpre). O valor vem
//       do LEDGER persistido, nunca recomputado nem do cliente.
//   TX2 (EFEITO, atômico): flip do inscrito + reversão da receita
//       (read-modify-write com roundMoney — nunca increment de float) +
//       `pagamentos.estornadoTotal` acumulado + ledger 'aprovado'.
// Crash em QUALQUER ponto + retry da mesma chamada COMPLETA a saga sem
// duplicar efeito: ledger 'aprovado' → replay devolve `duplicado: true` sem
// escrita; ledger 'pendente' → refund (idempotente) + TX2. Reexecutar o
// estorno já aplicado NÃO re-estorna, NÃO re-reverte, NÃO re-flipa.
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
  podeTransicionarStatusInscrito,
  podeTransicionarStatusPagamento,
  roundMoney,
  type AuthClaims,
  type ItemPedido,
  type PaymentProvider,
  type StatusInscrito,
  type StatusPagamento,
} from '@leela/core';
import {
  assertTenantAtivo,
  assertTenantWriter,
  type EventoCaller,
} from '../eventos/criarEvento';
import { selectPaymentProvider } from '../payments/selectProvider';

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
}

/** Nome da subcoleção-ledger de estornos por inscrito (write só Function). */
export const ESTORNOS_SUBCOL = 'estornos';

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
  /** Presentes só quando jaAprovado (dados de auditoria do replay). */
  refundId: string | null;
  pagamentoEstornadoIntegral: boolean;
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
  return {
    pagamentoId,
    eventoId,
    chargeId,
    valor,
    valorCentavos,
    valorFace,
    jaAprovado: ledger.get('status') === 'aprovado',
    refundId: (ledger.get('refundId') as string | undefined) ?? null,
    pagamentoEstornadoIntegral: ledger.get('pagamentoEstornadoIntegral') === true,
  };
}

async function comprometerEstorno(
  db: Db,
  input: EstornarInscricaoInput,
  tenantId: string,
  solicitadoPor: string
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
    const valorFace = roundMoney(item.valorFinal);
    const valor = roundMoney(valorFace + (taxaLinhaRaw ?? 0));
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
      refundId: null,
      pagamentoEstornadoIntegral: false,
    };
  });
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
      tx.update(afiliadoRefEstorno, {
        conversoes: Math.max(0, conversoesAtual - 1),
        valorAtribuido: Math.max(0, roundMoney(valorAtribuidoAtual - valorFace)),
        atualizadoEm: agora,
      });

      const qtdConv =
        typeof conversaoSnapEstorno.get('qtdInscricoes') === 'number'
          ? (conversaoSnapEstorno.get('qtdInscricoes') as number)
          : 1;
      const valorConv =
        typeof conversaoSnapEstorno.get('valor') === 'number'
          ? (conversaoSnapEstorno.get('valor') as number)
          : 0;
      if (qtdConv <= 1) {
        tx.delete(conversaoRefEstorno);
      } else {
        tx.update(conversaoRefEstorno, {
          qtdInscricoes: qtdConv - 1,
          valor: Math.max(0, roundMoney(valorConv - valorFace)),
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
  caller: EventoCaller
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
  const compromisso = await comprometerEstorno(db, input, tenantId, caller.uid);

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
    };
  }

  // ── REFUND no gateway — chave determinística, valor CONGELADO do ledger ──
  const refund = await provider.refund({
    chargeId: compromisso.chargeId,
    tenantId,
    amount: compromisso.valorCentavos,
    reason: input.motivo.trim(),
    idempotencyKey: refundIdempotencyKey(input.pedidoId, input.inscritoId),
  });
  // Integridade cruzada (Schneier): o gateway devolveu EXATAMENTE a linha do
  // inscrito? Divergência de dinheiro NUNCA passa — ledger fica 'pendente'
  // para intervenção manual (nenhum efeito aplicado).
  if (refund.amount !== compromisso.valorCentavos) {
    throw new https.HttpsError(
      'internal',
      `Refund do gateway (${refund.amount}) diverge do valor da linha ` +
        `(${compromisso.valorCentavos}) — efeito NÃO aplicado.`
    );
  }
  if (refund.status !== 'approved') {
    // Gateway não aprovou (pending/rejected): sem efeito local — retry da
    // MESMA chamada retoma a saga quando o gateway aprovar.
    throw new https.HttpsError(
      'failed-precondition',
      `Estorno não aprovado pelo gateway (status '${refund.status}') — ` +
        `nenhum efeito aplicado; tente novamente.`
    );
  }

  // ── TX2: efeito atômico ───────────────────────────────────────────────────
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
