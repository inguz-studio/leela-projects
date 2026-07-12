// =============================================================================
// functions/src/checkout/createInscricaoCharge.ts
//
// Cloud Function callable: o PRODUTOR DE ESCRITA do checkout (LEELA-E12 ·
// fundação). Cria o pedido em grupo (ADR-011: 1 responsável + N inscritos),
// o doc de pagamento (1:1 — ADR-011) e emite a cobrança no PaymentProvider
// selecionado (sandbox Mock enquanto não há chave Asaas — selectProvider).
//
// Contrato: `createInscricaoCharge(input) -> CreateInscricaoChargeResult`.
//
// IDEMPOTÊNCIA REAL (dinheiro — RN-333, heurística Kleppmann "idempotency
// tokens em toda mutation de rede"):
//   - IDs DETERMINÍSTICOS derivados de (uid do caller + idempotencyKey do
//     cliente): `ped-{uid}-{key}` / `pag-{uid}-{key}` / `{pedidoId}-i{n}`.
//     Retry do cliente NUNCA cria segundo pedido — colide no docId.
//   - Ordem de escrita: docs Firestore PRIMEIRO (fonte da verdade), cobrança
//     no gateway DEPOIS, `gatewayChargeId` gravado por último. Crash em
//     qualquer ponto + retry com a mesma chave COMPLETA o fluxo (at-least-
//     once sem duplicar): docs existem → só garante a cobrança; cobrança é
//     idempotente por `charge-{pedidoId}` no provider.
//   - O VALOR da cobrança em replay vem do doc persistido
//     (`gatewayAmountCentavos`), NUNCA recomputado — lote pode ter virado
//     entre a 1ª tentativa e o retry; recomputar cobraria valor diferente
//     do pedido gravado (anomalia de dinheiro).
//
// Estado inicial: pedido/pagamento/inscritos nascem 'pendente(s)'. O flip
// para pago/confirmado acontece SÓ pelo webhook assinado (webhookPagamento)
// — uma única porta para mudança de estado financeiro (Schneier), mesmo o
// Mock respondendo 'confirmed' na criação.
//
// Convenção monetária: docs em REAIS (2 casas); centavos SÓ na borda do
// gateway (`gatewayAmountCentavos` = Math.round(totalCobrado × 100)).
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  computeSaleState,
  createTermsProvider,
  isCodigoCupomValido,
  isFormaPagamento,
  isKitInscrito,
  normalizarCodigoCupom,
  parseCupom,
  parseLote,
  TermsNotFoundError,
  validarDadosMinimosInscrito,
  validarEmail,
  type CommercialTerms,
  type CreateChargeParams,
  type CupomVenda,
  type FormaPagamento,
  type ItemVendaInput,
  type KitInscrito,
  type PaymentProvider,
  type SaleState,
  type StatusPedido,
} from '@leela/core';
import { assertTenantAtivo } from '../eventos/criarEvento';
import { selectPaymentProvider } from '../payments/selectProvider';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Um inscrito do checkout — dados MÍNIMOS da fundação E12. */
export interface CheckoutInscritoInput {
  nome: string;
  email: string;
  /** CPF com ou sem máscara (validado com DV — não persistido nesta fase). */
  cpf: string;
  /** Modalidade/percurso escolhido — deve existir em `evento.modalidades`. */
  modalidade: string;
  /** Kit escolhido (RN-202) — default 'sem_kit'. */
  kit?: KitInscrito;
}

/** Input do checkout (validado NO SERVIDOR — nunca confiar na UI). */
export interface CreateInscricaoChargeInput {
  eventoId: string;
  /** Inscrições do pedido (ADR-011 — ≥ 1; auto-inscrição = exatamente 1). */
  inscritos: CheckoutInscritoInput[];
  /**
   * Índice do inscrito que É o responsável/pagador (= caller). Ausente =
   * o responsável paga mas não corre (compra para terceiros — ADR-011).
   */
  responsavelIndex?: number;
  /** Responsável/pagador do pedido (denormalizado no doc — ADR-011). */
  responsavel: { nome: string; email: string };
  forma: FormaPagamento;
  /** Parcelas escolhidas (1 = à vista; > 1 só cartão). */
  parcelas: number;
  /** Código de cupom (normalizado no servidor — E04). */
  cupomCodigo?: string;
  /**
   * Chave de idempotência do CLIENTE (RN-333) — uma por tentativa de
   * checkout. Retry com a mesma chave devolve o MESMO pedido/cobrança.
   */
  idempotencyKey: string;
}

/** Resultado — o contrato que a UI do checkout (S1203) consome. */
export interface CreateInscricaoChargeResult {
  pedidoId: string;
  pagamentoId: string;
  inscritoIds: string[];
  chargeId: string;
  /** URL de pagamento do gateway (PIX/checkout hospedado). */
  paymentUrl?: string;
  /** Payload QR Code PIX, quando o gateway emite. */
  qrCode?: string;
  /** Estado ATUAL do pedido (replay pode devolver 'pago'). */
  statusPedido: StatusPedido;
  valores: {
    valorBase: number;
    desconto: number;
    valorFinal: number;
    /** O que o comprador paga (com juros no cartão parcelado). */
    totalCobrado: number;
    parcelas: number;
    valorParcela: number;
  };
}

/** Identidade do caller (extraída do context.auth pelo wrapper callable). */
export interface CheckoutCaller {
  uid: string;
}

// ---------------------------------------------------------------------------
// Validação pura do input (fronteira de segurança do servidor)
// ---------------------------------------------------------------------------

/** Chave de idempotência: docId-safe, sem '/', tamanho controlado. */
export const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;

const INSCRITOS_MAX = 50;

/**
 * Valida o input bruto de `createInscricaoCharge`. Retorna a lista de erros
 * (vazia = válido). Pura — reutilizada pelos testes sem Emulator. NÃO ecoa
 * CPF/email nas mensagens (PII — LGPD). @pure
 */
export function validarCreateInscricaoChargeInput(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Input é obrigatório.'];
  }
  const input = raw as Record<string, unknown>;
  const erros: string[] = [];

  if (typeof input['eventoId'] !== 'string' || input['eventoId'].length === 0) {
    erros.push('"eventoId" é obrigatório.');
  }

  const inscritos = input['inscritos'];
  if (!Array.isArray(inscritos) || inscritos.length === 0) {
    erros.push('"inscritos" deve ter ≥ 1 inscrição (ADR-011).');
  } else if (inscritos.length > INSCRITOS_MAX) {
    erros.push(`"inscritos" excede ${INSCRITOS_MAX} inscrições por pedido.`);
  } else {
    inscritos.forEach((item, i) => {
      const errosDados = validarDadosMinimosInscrito(item);
      erros.push(...errosDados.map((e) => `inscritos[${i}]: ${e}`));
      const obj = (item ?? {}) as Record<string, unknown>;
      if (typeof obj['modalidade'] !== 'string' || obj['modalidade'].length === 0) {
        erros.push(`inscritos[${i}]: "modalidade" é obrigatória.`);
      }
      if (obj['kit'] !== undefined && !isKitInscrito(obj['kit'])) {
        erros.push(`inscritos[${i}]: kit fora do enum (RN-202).`);
      }
    });
  }

  const responsavelIndex = input['responsavelIndex'];
  if (responsavelIndex !== undefined) {
    if (
      !Number.isInteger(responsavelIndex) ||
      (responsavelIndex as number) < 0 ||
      (Array.isArray(inscritos) && (responsavelIndex as number) >= inscritos.length)
    ) {
      erros.push('"responsavelIndex" deve apontar para um inscrito do pedido.');
    }
  }

  const responsavel = input['responsavel'];
  if (!responsavel || typeof responsavel !== 'object') {
    erros.push('"responsavel" { nome, email } é obrigatório (ADR-011).');
  } else {
    const resp = responsavel as Record<string, unknown>;
    if (typeof resp['nome'] !== 'string' || resp['nome'].trim().length < 3) {
      erros.push('"responsavel.nome" é obrigatório (mínimo 3 caracteres).');
    }
    if (typeof resp['email'] !== 'string' || !validarEmail(resp['email'])) {
      erros.push('"responsavel.email" inválido.');
    }
  }

  if (!isFormaPagamento(input['forma'])) {
    erros.push('"forma" deve ser cartao_credito ou pix.');
  }

  const parcelas = input['parcelas'];
  if (!Number.isInteger(parcelas) || (parcelas as number) < 1) {
    erros.push('"parcelas" deve ser inteiro ≥ 1.');
  } else if (input['forma'] === 'pix' && (parcelas as number) > 1) {
    erros.push('PIX é à vista — "parcelas" deve ser 1.');
  }

  const cupomCodigo = input['cupomCodigo'];
  if (cupomCodigo !== undefined) {
    if (
      typeof cupomCodigo !== 'string' ||
      !isCodigoCupomValido(normalizarCodigoCupom(cupomCodigo))
    ) {
      erros.push('"cupomCodigo" fora do padrão A-Z0-9 (3–20).');
    }
  }

  const idempotencyKey = input['idempotencyKey'];
  if (typeof idempotencyKey !== 'string' || !IDEMPOTENCY_KEY_RE.test(idempotencyKey)) {
    erros.push(
      '"idempotencyKey" é obrigatória (8–64 caracteres A-Za-z0-9_- — RN-333).'
    );
  }

  return erros;
}

// ---------------------------------------------------------------------------
// IDs determinísticos (idempotência por chave — ver cabeçalho)
// ---------------------------------------------------------------------------

/** Ids do pedido/pagamento derivados de (uid, key) — replay-safe. @pure */
export function idsDoCheckout(
  uid: string,
  idempotencyKey: string,
  qtdInscritos: number
): { pedidoId: string; pagamentoId: string; inscritoIds: string[] } {
  const pedidoId = `ped-${uid}-${idempotencyKey}`;
  return {
    pedidoId,
    pagamentoId: `pag-${uid}-${idempotencyKey}`,
    inscritoIds: Array.from({ length: qtdInscritos }, (_, i) => `${pedidoId}-i${i + 1}`),
  };
}

// ---------------------------------------------------------------------------
// Carregamento dos insumos da venda (evento, lotes, cupom, termo)
// ---------------------------------------------------------------------------

interface InsumosVenda {
  tenantId: string;
  itens: ItemVendaInput[];
  cupom: CupomVenda | null;
  terms: CommercialTerms;
}

async function carregarInsumos(
  db: Db,
  input: CreateInscricaoChargeInput
): Promise<InsumosVenda> {
  const eventoRef = db.collection('eventos').doc(input.eventoId);
  const eventoSnap = await eventoRef.get();
  if (!eventoSnap.exists) {
    throw new https.HttpsError('not-found', `Evento '${input.eventoId}' não existe.`);
  }

  const statusEvento = eventoSnap.get('status') as string;
  if (statusEvento !== 'publicado' && statusEvento !== 'ao_vivo') {
    throw new https.HttpsError(
      'failed-precondition',
      `Evento '${input.eventoId}' não está com venda aberta (status ${statusEvento}).`
    );
  }

  const tenantId = eventoSnap.get('tenantId') as string;
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new https.HttpsError(
      'internal',
      `Evento '${input.eventoId}' sem tenantId (ADR-009) — dado corrompido.`
    );
  }
  await assertTenantAtivo(db, tenantId);

  const modalidadesEvento: string[] = Array.isArray(eventoSnap.get('modalidades'))
    ? (eventoSnap.get('modalidades') as unknown[]).filter(
        (m): m is string => typeof m === 'string'
      )
    : [];
  const percursos = Array.isArray(eventoSnap.get('percursos'))
    ? (eventoSnap.get('percursos') as { nome?: unknown; preco?: unknown }[])
    : [];

  // Lotes por modalidade DISTINTA (ADR-012 — query where modalidade == X)
  const modalidades = [...new Set(input.inscritos.map((i) => i.modalidade))];
  const lotesPorModalidade = new Map<string, ItemVendaInput['lotesDaModalidade']>();
  for (const modalidade of modalidades) {
    if (!modalidadesEvento.includes(modalidade)) {
      throw new https.HttpsError(
        'invalid-argument',
        `Modalidade '${modalidade}' não existe no evento '${input.eventoId}'.`
      );
    }
    const lotesSnap = await eventoRef
      .collection('lotes')
      .where('modalidade', '==', modalidade)
      .get();
    lotesPorModalidade.set(
      modalidade,
      lotesSnap.docs.map((d) => parseLote(d.id, d.data()))
    );
  }

  const itens: ItemVendaInput[] = input.inscritos.map((inscrito) => {
    const percursoLegado = percursos.find((p) => p?.nome === inscrito.modalidade);
    const precoLegado =
      typeof percursoLegado?.preco === 'number' ? percursoLegado.preco : undefined;
    const item: ItemVendaInput = {
      modalidade: inscrito.modalidade,
      lotesDaModalidade: lotesPorModalidade.get(inscrito.modalidade) ?? [],
    };
    if (precoLegado !== undefined) item.precoLegado = precoLegado;
    return item;
  });

  // Cupom — docId = código normalizado (unicidade por chave — E04)
  let cupom: CupomVenda | null = null;
  if (input.cupomCodigo !== undefined) {
    const codigo = normalizarCodigoCupom(input.cupomCodigo);
    const cupomSnap = await eventoRef.collection('cupons').doc(codigo).get();
    if (!cupomSnap.exists) {
      throw new https.HttpsError('invalid-argument', `Cupom '${codigo}' não existe.`);
    }
    const cupomDoc = parseCupom(cupomSnap.id, cupomSnap.data() ?? {});
    if (cupomDoc.tenantId !== tenantId) {
      throw new https.HttpsError(
        'internal',
        `Cupom '${codigo}' com tenantId divergente do evento — dado corrompido.`
      );
    }
    cupom = cupomDoc;
  }

  // Termo do tenant (RN-406) — SEM termo, SEM venda (nunca taxa default)
  const termsProvider = createTermsProvider(
    async (tid): Promise<CommercialTerms | null> => {
      const snap = await db.doc(`tenants/${tid}/commercialTerms/current`).get();
      return snap.exists ? (snap.data() as CommercialTerms) : null;
    },
    { ttlMs: 0 }
  );
  let terms: CommercialTerms;
  try {
    terms = await termsProvider.getCommercialTerms(tenantId);
  } catch (err) {
    if (err instanceof TermsNotFoundError) {
      throw new https.HttpsError(
        'failed-precondition',
        `Tenant '${tenantId}' sem termos comerciais — venda bloqueada (RN-406).`
      );
    }
    throw err;
  }

  return { tenantId, itens, cupom, terms };
}

// ---------------------------------------------------------------------------
// Criação transacional dos docs (pedido + pagamento + inscritos)
// ---------------------------------------------------------------------------

function centavosDaBorda(valorReais: number): number {
  // Centavos SÓ na borda do gateway (ADR-006) — valores dos docs seguem em R$
  return Math.round(valorReais * 100);
}

async function criarDocsDeCheckout(
  db: Db,
  input: CreateInscricaoChargeInput,
  caller: CheckoutCaller,
  sale: SaleState,
  tenantId: string
): Promise<void> {
  const { pedidoId, pagamentoId, inscritoIds } = idsDoCheckout(
    caller.uid,
    input.idempotencyKey,
    input.inscritos.length
  );
  const pedidoRef = db.collection('pedidos').doc(pedidoId);
  const pagamentoRef = db.collection('pagamentos').doc(pagamentoId);
  const eventoRef = db.collection('eventos').doc(input.eventoId);
  const now = FieldValue.serverTimestamp();

  // Lote único da venda? → espelha loteId/loteNome no pagamento (slide-in
  // [pag] sem join). Multi-lote não cabe no campo singular — omite (honesto).
  const lotesDistintos = new Set(sale.itens.map((i) => i.loteId));
  const loteUnico =
    lotesDistintos.size === 1 ? (sale.itens[0] ?? null) : null;

  try {
    await db.runTransaction(async (tx) => {
      const jaExiste = await tx.get(pedidoRef);
      if (jaExiste.exists) return; // corrida do MESMO key — replay resolve

      // Inscritos — subcoleção do evento (ADR-011); nascem 'pendente'
      input.inscritos.forEach((inscrito, i) => {
        const inscritoId = inscritoIds[i];
        if (inscritoId === undefined) return;
        const ehResponsavel = input.responsavelIndex === i;
        tx.create(eventoRef.collection('inscritos').doc(inscritoId), {
          id: inscritoId,
          tenantId,
          // Responsável usa o uid real; convidado ganha id sintético do
          // pedido (conta/convite de atleta é lote futuro — premissa P3).
          atletaId: ehResponsavel ? caller.uid : `${inscritoId}-convidado`,
          atletaNome: inscrito.nome.trim(),
          kit: inscrito.kit ?? 'sem_kit',
          chipNumero: null,
          status: 'pendente',
          modalidade: inscrito.modalidade,
          pedidoRef: pedidoId,
          ehResponsavel,
          tamanhos: {},
          criadoEm: now,
          atualizadoEm: now,
        });
      });

      // Pedido — root `pedidos/{id}` (ADR-011); pagamentoRef JÁ aponta para
      // o doc criado neste MESMO tx (nunca 'pago' sem cobrança — invariante)
      tx.create(pedidoRef, {
        id: pedidoId,
        tenantId,
        eventoId: input.eventoId,
        responsavel: {
          atletaId: caller.uid,
          nome: input.responsavel.nome.trim(),
          email: input.responsavel.email.trim(),
        },
        inscritoRefs: inscritoIds,
        pagamentoRef: pagamentoId,
        valorTotal: sale.valorFinal,
        status: 'pendente',
        formaPagamento: sale.forma,
        parcelas: sale.parcelamento.parcelas,
        criadoEm: now,
        atualizadoEm: now,
      });

      // Pagamento — transação 1:1 do pedido. `gateway*` são campos de BORDA
      // (fora do parse): chargeId nasce null e é gravado quando a cobrança
      // existir; o VALOR em centavos é congelado AQUI (replay nunca recobra
      // valor diferente do pedido — ver cabeçalho).
      const pagamentoDoc: Record<string, unknown> = {
        id: pagamentoId,
        tenantId,
        eventoId: input.eventoId,
        pedidoRef: pedidoId,
        status: 'pendente',
        forma: sale.forma,
        valorBase: sale.valorBase,
        desconto: sale.desconto,
        valorFinal: sale.valorFinal,
        gatewayChargeId: null,
        gatewayAmountCentavos: centavosDaBorda(sale.totalCobrado),
        criadoEm: now,
        atualizadoEm: now,
      };
      if (loteUnico !== null && loteUnico.loteId !== null) {
        pagamentoDoc['loteId'] = loteUnico.loteId;
        if (loteUnico.loteNome !== null) pagamentoDoc['loteNome'] = loteUnico.loteNome;
      }
      if (sale.cupomAplicado !== null) {
        const cupom: Record<string, unknown> = { codigo: sale.cupomAplicado.codigo };
        if (sale.cupomAplicado.tipo === 'percentual') {
          cupom['descontoPct'] = sale.cupomAplicado.valor;
        }
        pagamentoDoc['cupom'] = cupom;
      }
      tx.create(pagamentoRef, pagamentoDoc);
    });
  } catch (err) {
    // Corrida entre retries do MESMO key: create() colidiu — os docs já
    // existem, o caminho de replay (ensureCharge) completa o fluxo.
    const code = (err as { code?: number }).code;
    if (code !== 6 /* ALREADY_EXISTS */) throw err;
  }
}

// ---------------------------------------------------------------------------
// Garantia da cobrança (at-least-once, idempotente) + montagem do resultado
// ---------------------------------------------------------------------------

async function garantirCobrancaEMontarResultado(
  db: Db,
  provider: PaymentProvider,
  input: CreateInscricaoChargeInput,
  caller: CheckoutCaller
): Promise<CreateInscricaoChargeResult> {
  const { pedidoId, pagamentoId, inscritoIds } = idsDoCheckout(
    caller.uid,
    input.idempotencyKey,
    input.inscritos.length
  );
  const pagamentoRef = db.collection('pagamentos').doc(pagamentoId);
  const pedidoRef = db.collection('pedidos').doc(pedidoId);

  let pagamentoSnap = await pagamentoRef.get();
  if (!pagamentoSnap.exists) {
    throw new https.HttpsError(
      'internal',
      `Pagamento '${pagamentoId}' ausente após criação do pedido — estado incoerente.`
    );
  }

  let chargeId = pagamentoSnap.get('gatewayChargeId') as string | null;
  let paymentUrl = pagamentoSnap.get('gatewayPaymentUrl') as string | undefined;
  let qrCode = pagamentoSnap.get('gatewayQrCode') as string | undefined;

  if (!chargeId) {
    const amountCentavos = pagamentoSnap.get('gatewayAmountCentavos') as number;
    if (!Number.isInteger(amountCentavos) || amountCentavos <= 0) {
      throw new https.HttpsError(
        'internal',
        `Pagamento '${pagamentoId}' sem gatewayAmountCentavos válido — estado incoerente.`
      );
    }

    const responsavelInscrito =
      input.responsavelIndex !== undefined
        ? input.inscritos[input.responsavelIndex]
        : undefined;
    const chargeParams: CreateChargeParams = {
      orderId: pedidoId,
      tenantId: pagamentoSnap.get('tenantId') as string,
      amount: amountCentavos,
      paymentMethod: input.forma === 'cartao_credito' ? 'credit_card' : 'pix',
      customer: {
        name: input.responsavel.nome.trim(),
        email: input.responsavel.email.trim(),
        ...(responsavelInscrito !== undefined
          ? { taxId: responsavelInscrito.cpf }
          : {}),
      },
      items: [
        {
          id: input.eventoId,
          description: `Inscrições (${input.inscritos.length}) — evento ${input.eventoId}`,
          amount: amountCentavos,
          quantity: 1,
        },
      ],
      // Idempotente por pedido: retry NUNCA duplica a cobrança (RN-333)
      idempotencyKey: `charge-${pedidoId}`,
      ...(input.parcelas > 1 ? { installments: input.parcelas } : {}),
    };
    const charge = await provider.createCharge(chargeParams);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(pagamentoRef);
      if (snap.get('gatewayChargeId')) return; // concorrente já gravou
      tx.update(pagamentoRef, {
        gatewayChargeId: charge.chargeId,
        gatewayPaymentUrl: charge.paymentUrl ?? null,
        gatewayQrCode: charge.qrCode ?? null,
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    });

    pagamentoSnap = await pagamentoRef.get();
    chargeId = pagamentoSnap.get('gatewayChargeId') as string;
    paymentUrl = (pagamentoSnap.get('gatewayPaymentUrl') as string | null) ?? undefined;
    qrCode = (pagamentoSnap.get('gatewayQrCode') as string | null) ?? undefined;
  }

  const pedidoSnap = await pedidoRef.get();
  const parcelas = (pedidoSnap.get('parcelas') as number | undefined) ?? 1;
  const totalCobrado =
    (pagamentoSnap.get('gatewayAmountCentavos') as number) / 100;
  // Mesma fórmula de buildInstallmentOptions (valorParcela = round(total/n))
  const valorParcela = Math.round((totalCobrado / parcelas) * 100) / 100;

  return {
    pedidoId,
    pagamentoId,
    inscritoIds,
    chargeId,
    ...(paymentUrl !== undefined ? { paymentUrl } : {}),
    ...(qrCode !== undefined ? { qrCode } : {}),
    statusPedido: pedidoSnap.get('status') as StatusPedido,
    valores: {
      valorBase: pagamentoSnap.get('valorBase') as number,
      desconto: pagamentoSnap.get('desconto') as number,
      valorFinal: pagamentoSnap.get('valorFinal') as number,
      totalCobrado,
      parcelas,
      valorParcela,
    },
  };
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

/**
 * Cria pedido/inscritos (ADR-011) + emite a cobrança no provider (sandbox).
 * Idempotente por (uid, idempotencyKey) — ver cabeçalho do arquivo.
 *
 * @param agora relógio injetável (vigência de lote/cupom nos testes)
 */
export async function createInscricaoChargeCore(
  db: Db,
  provider: PaymentProvider,
  rawInput: unknown,
  caller: CheckoutCaller,
  agora: () => Date = () => new Date()
): Promise<CreateInscricaoChargeResult> {
  const erros = validarCreateInscricaoChargeInput(rawInput);
  if (erros.length > 0) {
    throw new https.HttpsError(
      'invalid-argument',
      `CreateInscricaoChargeInput inválido: ${erros.join(' ')}`
    );
  }
  const input = rawInput as unknown as CreateInscricaoChargeInput;

  const { pedidoId } = idsDoCheckout(caller.uid, input.idempotencyKey, 0);
  const pedidoSnap = await db.collection('pedidos').doc(pedidoId).get();

  if (pedidoSnap.exists) {
    // REPLAY (mesma chave): valida o dono/evento e COMPLETA o fluxo sem
    // recriar nem recomputar valores (congelados no doc — ver cabeçalho).
    if (pedidoSnap.get('responsavel.atletaId') !== caller.uid) {
      throw new https.HttpsError(
        'permission-denied',
        'idempotencyKey pertence a outro pagador.'
      );
    }
    if (pedidoSnap.get('eventoId') !== input.eventoId) {
      throw new https.HttpsError(
        'failed-precondition',
        'idempotencyKey já usada para outro evento — gere uma nova chave.'
      );
    }
  } else {
    const { tenantId, itens, cupom, terms } = await carregarInsumos(db, input);
    let sale: SaleState;
    try {
      sale = computeSaleState({
        itens,
        cupom,
        forma: input.forma,
        parcelas: input.parcelas,
        installmentRules: terms.installmentRules,
        platformFeePct: terms.platformFeePct,
        agora: agora(),
      });
    } catch (err) {
      throw new https.HttpsError(
        'invalid-argument',
        err instanceof Error ? err.message : 'Estado de venda inválido.'
      );
    }
    await criarDocsDeCheckout(db, input, caller, sale, tenantId);
  }

  const resultado = await garantirCobrancaEMontarResultado(db, provider, input, caller);
  // Sem PII no log (LGPD) — só ids e valores agregados
  logger.info('checkout_charge_criada', {
    pedidoId: resultado.pedidoId,
    eventoId: input.eventoId,
    chargeId: resultado.chargeId,
    valorFinal: resultado.valores.valorFinal,
    inscritos: resultado.inscritoIds.length,
  });
  return resultado;
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `createInscricaoCharge` — callable do checkout público (S1203). */
export const createInscricaoCharge = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return createInscricaoChargeCore(
    admin.firestore(),
    selectPaymentProvider(),
    data,
    { uid: context.auth.uid }
  );
});
