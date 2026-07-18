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
  COLECAO_AFILIADOS,
  computeSaleState,
  createTermsProvider,
  dentroDaJanelaAtribuicao,
  descontoAfiliadoAtivo,
  isCodigoCupomValido,
  isRefCodigoValido,
  normalizarRefCodigo,
  isFormaPagamento,
  isKitInscrito,
  isModoTaxa,
  modoTaxaDoEvento,
  MSG_EVENTO_FECHADO_SEM_CUPOM,
  montarItensDoPedido,
  normalizarCodigoCupom,
  parseCupom,
  parseKit,
  parseLote,
  TAMANHOS_MAX_ENTRADAS,
  TermsNotFoundError,
  validarDadosMinimosInscrito,
  validarEmail,
  validarTamanhosInscrito,
  vendaSomentePorCupomAtiva,
  type CommercialTerms,
  type CreateChargeParams,
  type CupomVenda,
  type FormaPagamento,
  type ItemKitParaTamanhos,
  type ItemPedidoInput,
  type ItemVendaInput,
  type Kit,
  type KitInscrito,
  type ModoTaxa,
  type PaymentProvider,
  type SaleState,
  type StatusPedido,
} from '@leela/core';
import { assertTenantAtivo } from '../eventos/criarEvento';
import { selectPaymentProvider } from '../payments/selectProvider';
import { agoraCheckout } from './relogioCheckout';

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
  /** Kit escolhido (RN-202) — default 'sem_kit'. Rótulo persistido no inscrito. */
  kit?: KitInscrito;
  /**
   * Id do kit real do evento (`eventos/{id}/kits/{kitId}`) — precifica o delta
   * via o core (RN-210/211). Opcional; ausente = sem kit, sem delta. O servidor
   * valida a oferta por modalidade (kit não ofertado → invalid-argument) e
   * PERSISTE este id no inscrito (fulfillment — ver criarDocsDeCheckout).
   */
  kitId?: string;
  /**
   * Map `itemId → tamanho` do kit (RN-223 · S209 · LEELA-BEPEND-T4). Opcional
   * enquanto a UI não coleta (S209-T3); quando presente, o servidor valida
   * FAIL-CLOSED contra os SKUs configurados do evento (`itensKit` ×
   * `tamanhosDisponiveis` — validarTamanhosInscrito, core): item inexistente,
   * fora do kit escolhido, não tamanhado ou tamanho forjado ⇒ invalid-argument,
   * NADA é escrito. O que passa é persistido no inscrito (fulfillment).
   */
  tamanhos?: Record<string, string>;
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
   * Atribuição de afiliado (R9-E · RN-313): `codigo` = refCodigo capturado
   * do `?ref=` na landing; `clicadoEmMillis` = instante do PRIMEIRO clique
   * (localStorage do atleta — claim do cliente, clampado no servidor).
   * SEMÂNTICA FAIL-OPEN PARA A VENDA: ref com SHAPE inválido é
   * invalid-argument (bug de cliente), mas ref DESCONHECIDO/inativo/fora da
   * janela só DESCARTA a atribuição — parâmetro de marketing nunca bloqueia
   * dinheiro (RN-313: fora da janela não conta; a compra segue).
   */
  ref?: { codigo: string; clicadoEmMillis?: number };
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
    /**
     * Taxa de serviço paga pelo COMPRADOR (RN-347): 0 = evento 'incorporada';
     * > 0 = 'repassada' (já embutida em `totalCobrado`). Sempre VALOR em R$ —
     * nunca o `platformFeePct` do termo (fix 703db9c).
     */
    taxaServico: number;
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
      if (
        obj['kitId'] !== undefined &&
        (typeof obj['kitId'] !== 'string' || obj['kitId'].length === 0)
      ) {
        erros.push(`inscritos[${i}]: "kitId" deve ser string não vazia.`);
      }
      // RN-223 (T4) — SHAPE do map de tamanhos; a validação SEMÂNTICA
      // (contra itensKit/tamanhosDisponiveis) roda depois, com o catálogo.
      // Review antagonista T4: teto sanitário de entradas + eco TRUNCADO de
      // chave forjada (nunca devolver string arbitrária inteira ao cliente).
      const tamanhosRaw = obj['tamanhos'];
      if (tamanhosRaw !== undefined) {
        if (
          tamanhosRaw === null ||
          typeof tamanhosRaw !== 'object' ||
          Array.isArray(tamanhosRaw)
        ) {
          erros.push(
            `inscritos[${i}]: "tamanhos" deve ser map itemId → tamanho (RN-223).`
          );
        } else {
          const entradas = Object.entries(tamanhosRaw as Record<string, unknown>);
          if (entradas.length > TAMANHOS_MAX_ENTRADAS) {
            erros.push(
              `inscritos[${i}]: "tamanhos" excede ${TAMANHOS_MAX_ENTRADAS} entradas (review T4).`
            );
          } else {
            for (const [itemId, tamanho] of entradas) {
              if (
                itemId.length === 0 ||
                typeof tamanho !== 'string' ||
                tamanho.length === 0
              ) {
                const idEco = itemId.length > 40 ? `${itemId.slice(0, 40)}…` : itemId;
                erros.push(
                  `inscritos[${i}]: tamanhos["${idEco}"] deve ser string não vazia (RN-223).`
                );
              }
            }
          }
        }
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

  // Atribuição de afiliado (R9-E · RN-313) — SHAPE estrito (semântica é
  // fail-open lá na frente; shape torto é bug/forja de cliente).
  const ref = input['ref'];
  if (ref !== undefined) {
    if (ref === null || typeof ref !== 'object' || Array.isArray(ref)) {
      erros.push('"ref" deve ser objeto { codigo, clicadoEmMillis? } (RN-313).');
    } else {
      const r = ref as Record<string, unknown>;
      const codigo =
        typeof r['codigo'] === 'string' ? normalizarRefCodigo(r['codigo']) : r['codigo'];
      if (!isRefCodigoValido(codigo)) {
        erros.push('"ref.codigo" fora do padrão A-Z0-9 (4–20).');
      }
      const clicadoEm = r['clicadoEmMillis'];
      if (
        clicadoEm !== undefined &&
        (!Number.isInteger(clicadoEm) || (clicadoEm as number) <= 0)
      ) {
        erros.push('"ref.clicadoEmMillis" deve ser epoch-ms inteiro > 0.');
      }
    }
  }

  return erros;
}

// ---------------------------------------------------------------------------
// IDs determinísticos (idempotência por chave — ver cabeçalho)
// ---------------------------------------------------------------------------

/** Enum canônico de kit persistido no inscrito (RN-202). */
const KITS_INSCRITO_CANONICOS: readonly KitInscrito[] = [
  'kit_ouro',
  'kit_prata',
  'kit_basico',
  'sem_kit',
];

/**
 * Rótulo enum do inscrito (RN-202) DERIVADO do `kitId` que precificou a linha
 * — NUNCA do campo `kit` que o cliente manda. Fecha o canal de fraude do
 * checkout de kit (Schneier): sem esta derivação `kit` e `kitId` são inputs
 * INDEPENDENTES, então um cliente escolhe `kitId: 'sem-kit'` (−R$15, desconto)
 * e ainda carimba `kit: 'kit_ouro'` no doc — paga menos e o balcão entrega o
 * kit caro pelo rótulo. Aqui o rótulo passa a espelhar o kit COBRADO: com a
 * CHAVE CANÔNICA Kit↔enum (FABLE-E-T1) o id do seed É o enum (identidade); o
 * normalize dash→underscore segue aceitando id LEGADO com hífen; id custom
 * (ou ausência de kit) cai em `sem_kit` — degradação honesta, preço sempre do
 * core. Cliente honesto já enviava este mesmo valor (kitEnumFromId no
 * landing): ZERO mudança de comportamento para o fluxo legítimo, só remove a
 * via de abuso. @pure
 */
export function kitEnumInscritoFromId(kitId?: string): KitInscrito {
  if (typeof kitId !== 'string' || kitId.length === 0) return 'sem_kit';
  const norm = kitId.replace(/-/g, '_');
  return (KITS_INSCRITO_CANONICOS as readonly string[]).includes(norm)
    ? (norm as KitInscrito)
    : 'sem_kit';
}

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

export interface InsumosVenda {
  tenantId: string;
  itens: ItemVendaInput[];
  cupom: CupomVenda | null;
  /**
   * Amarração do cupom `club_parceiro` (RN-364 · E18) — presente SÓ quando o
   * cupom carregado é escopado. `parceriaPath` E o PRÓPRIO CUPOM são
   * RE-LIDOS dentro da tx de venda (criarDocsDeCheckout): parceria exige
   * status 'ativa' e o cupom precisa estar BYTE-COERENTE com a base do sale
   * (tipo/valor/fimEm — fix review antagonista O3-L3B-S1802 #1: redefinição
   * da condição em voo não deixa desconto STALE entrar em doc de dinheiro).
   */
  cupomParceria: {
    parceriaPath: string;
    clubeRef: string;
    cupomPath: string;
    tipo: string;
    valor: number;
    fimEmMillis: number;
  } | null;
  /**
   * Amarração cupom↔AFILIADO (R9-E · RN-315/316) — presente SÓ quando o
   * cupom carregado tem `afiliadoRef`. O gate de mínimo de inscrições
   * (`descontoAfiliadoAtivo`) já foi checado na carga; o path é RE-LIDO na
   * tx de venda (freshness — desconto não entra se o gate fechou em voo).
   */
  cupomAfiliado: {
    afiliadoPath: string;
    afiliadoId: string;
    cupomPath: string;
  } | null;
  /**
   * Atribuição de afiliado da venda (R9-E · RN-313) — resolvida do `?ref=`
   * (ou do cupom de afiliado, que é sinal mais forte). null = sem atribuição
   * (ref ausente/desconhecido/inativo/fora da janela — venda segue).
   */
  afiliadoAtribuicao: {
    afiliadoId: string;
    refCodigo: string;
    clicadoEmMillis: number;
    origem: 'ref' | 'cupom';
  } | null;
  terms: CommercialTerms;
  /**
   * Modo da taxa do EVENTO (RN-347) — lido do DOC (`evento.taxaModo` via
   * `modoTaxaDoEvento`), NUNCA do request: `taxaModo` forjado no payload do
   * cliente é ignorado por construção (o input do checkout nem tem o campo,
   * e mesmo que tivesse, este valor vem daqui).
   */
  modoTaxa: ModoTaxa;
}

/**
 * Subconjunto ESTRUTURAL do input que `carregarInsumos` realmente lê —
 * `CreateInscricaoChargeInput` o satisfaz, e a COTAÇÃO read-only
 * (`cotarInscricaoCheckout`) reusa a MESMA carga (evento/lotes/cupom/termo)
 * sem duplicar a leitura nem tocar o produtor de escrita.
 */
export interface CarregarInsumosInput {
  eventoId: string;
  inscritos: readonly { modalidade: string; kitId?: string }[];
  cupomCodigo?: string;
  /** Atribuição de afiliado (RN-313) — só o produtor de escrita a envia. */
  ref?: { codigo: string; clicadoEmMillis?: number };
}

export async function carregarInsumos(
  db: Db,
  input: CarregarInsumosInput,
  agora: Date = new Date()
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

  // Modo da taxa (RN-347) — do DOC do evento, nunca do request. Presente e
  // FORA do enum = doc corrompido (fail-fast: mudar quem paga a taxa por
  // lixo de dado é anomalia de dinheiro); ausente = 'incorporada' (legado).
  const taxaModoRaw = eventoSnap.get('taxaModo') as unknown;
  if (taxaModoRaw !== undefined && taxaModoRaw !== null && !isModoTaxa(taxaModoRaw)) {
    throw new https.HttpsError(
      'internal',
      `Evento '${input.eventoId}' com taxaModo fora do enum (RN-347) — dado corrompido.`
    );
  }
  const modoTaxa = modoTaxaDoEvento({
    ...(isModoTaxa(taxaModoRaw) ? { taxaModo: taxaModoRaw } : {}),
  });

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

  // Kits do evento (subcoleção `eventos/{id}/kits` — RN-210/211): carregados
  // SÓ quando alguma inscrição escolheu um kit, e mapeados por id para o core
  // somar o delta. O kit é a fonte da verdade do preço (nada no cliente).
  const kitsPorId = new Map<string, Kit>();
  if (input.inscritos.some((i) => typeof i.kitId === 'string' && i.kitId.length > 0)) {
    const kitsSnap = await eventoRef.collection('kits').get();
    for (const d of kitsSnap.docs) {
      kitsPorId.set(d.id, parseKit(d.id, d.data()));
    }
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
    if (typeof inscrito.kitId === 'string' && inscrito.kitId.length > 0) {
      const kit = kitsPorId.get(inscrito.kitId);
      if (kit === undefined) {
        throw new https.HttpsError(
          'invalid-argument',
          `Kit '${inscrito.kitId}' não existe no evento '${input.eventoId}'.`
        );
      }
      if (kit.tenantId !== tenantId) {
        throw new https.HttpsError(
          'internal',
          `Kit '${inscrito.kitId}' com tenantId divergente do evento — dado corrompido.`
        );
      }
      // O core valida a oferta por modalidade (kit.modalidades ∋ modalidade) e
      // soma kit.preco (negativo = desconto, RN-211). Só o subconjunto de venda.
      item.kit = { nome: kit.nome, preco: kit.preco, modalidades: kit.modalidades };
    }
    return item;
  });

  // GATE CUPOM-ONLY (RN-303 · S1804): evento FECHADO só vende COM cupom.
  // O flag vem do DOC do evento (nunca do request — payload direto não abre
  // evento fechado); `true` LITERAL liga (acessor canônico do core). Sem
  // código de cupom ⇒ failed-precondition ANTES de qualquer leitura de
  // cupom/termo. Cupom informado mas inexistente/vencido/esgotado continua
  // morrendo nos guards vigentes (invalid-argument aqui embaixo /
  // computeSaleState) — o gate exige PRESENÇA; a VALIDADE já é fail-fast na
  // cadeia. Vale para cotação E cobrança (ambas passam por carregarInsumos).
  const cupomOnly = vendaSomentePorCupomAtiva({
    ...(eventoSnap.get('vendaSomentePorCupom') === true
      ? { vendaSomentePorCupom: true }
      : {}),
  });
  if (cupomOnly && input.cupomCodigo === undefined) {
    throw new https.HttpsError('failed-precondition', MSG_EVENTO_FECHADO_SEM_CUPOM);
  }

  // Cupom — docId = código normalizado (unicidade por chave — E04)
  let cupom: CupomVenda | null = null;
  let cupomParceria: InsumosVenda['cupomParceria'] = null;
  let cupomAfiliado: InsumosVenda['cupomAfiliado'] = null;
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
    // Cupom de CLUB PARCEIRO (RN-364 · E18): só resolve com a parceria
    // ATIVA. Guardas fail-closed:
    //   - parceriaRef DENTRO do tenant do evento (path forjado apontando
    //     parceria de outro tenant nunca valida — RN-400);
    //   - parceria inexistente/pendente/encerrada ⇒ failed-precondition
    //     (encerrar a parceria MATA o desconto — S1803, ADR-012: nenhum
    //     caminho de desconto fora do kernel + guarda).
    if (cupomDoc.escopo === 'club_parceiro') {
      const prefixoDoTenant = `tenants/${tenantId}/parceirosAssessoria/`;
      const parceriaPath = cupomDoc.parceriaRef ?? '';
      // Profundidade EXATA de doc de parceria (fix review S1802 #3 —
      // defense-in-depth): `startsWith` sozinho aceitaria path ANINHADO
      // (tenants/T/parceirosAssessoria/Y/x/z) apontando doc que não é
      // parceria. 4 segmentos ou nada.
      if (
        !parceriaPath.startsWith(prefixoDoTenant) ||
        parceriaPath.split('/').length !== 4
      ) {
        throw new https.HttpsError(
          'internal',
          `Cupom '${codigo}' com parceriaRef fora do tenant do evento — dado corrompido.`
        );
      }
      const parceriaSnap = await db.doc(parceriaPath).get();
      if (!parceriaSnap.exists || parceriaSnap.get('status') !== 'ativa') {
        // Mensagem OPACA (fix review S1802 #2): a cotação roda anônima —
        // não confirmar a um sondador que o código é de club parceiro nem
        // o estado da parceria; mesmo shape do cupom inexistente.
        throw new https.HttpsError(
          'invalid-argument',
          `Cupom '${codigo}' indisponível.`
        );
      }
      cupomParceria = {
        parceriaPath,
        clubeRef: cupomDoc.clubeRef ?? '',
        cupomPath: cupomSnap.ref.path,
        tipo: cupomDoc.tipo,
        valor: cupomDoc.valor,
        fimEmMillis: cupomDoc.fimEm.toMillis(),
      };
    }

    // GATE do cupom de AFILIADO (R9-E · RN-315): cupom com `afiliadoRef`
    // (amarração escrita SÓ pela Function salvarAfiliado) só aplica com o
    // desconto ATIVO — afiliado 'ativo' E (sem mínimo OU ∑ inscrições
    // atribuídas >= minimoInscricoes). Antes do mínimo o link RASTREIA a
    // conversão mas o desconto NÃO aplica (sem retroativo — a venda que
    // cruza o mínimo não ganha; as seguintes sim). Mensagem OPACA (mesma
    // lição S1802 #2): não confirmar a um sondador anônimo o estado do gate.
    const afiliadoRefDoCupom = (cupomSnap.get('afiliadoRef') ?? '') as string;
    if (afiliadoRefDoCupom.length > 0) {
      const afiliadoSnap = await eventoRef
        .collection(COLECAO_AFILIADOS)
        .doc(afiliadoRefDoCupom)
        .get();
      const dados = afiliadoSnap.data() ?? {};
      const gateAberto =
        afiliadoSnap.exists &&
        dados['tenantId'] === tenantId &&
        descontoAfiliadoAtivo({
          status: dados['status'] as never,
          minimoInscricoes:
            typeof dados['minimoInscricoes'] === 'number'
              ? (dados['minimoInscricoes'] as number)
              : null,
          conversoes:
            typeof dados['conversoes'] === 'number'
              ? (dados['conversoes'] as number)
              : 0,
        });
      if (!gateAberto) {
        throw new https.HttpsError(
          'invalid-argument',
          `Cupom '${codigo}' indisponível.`
        );
      }
      cupomAfiliado = {
        afiliadoPath: afiliadoSnap.ref.path,
        afiliadoId: afiliadoRefDoCupom,
        cupomPath: cupomSnap.ref.path,
      };
    }
    cupom = cupomDoc;
  }

  // ── Atribuição de afiliado (R9-E · RN-313) — NUNCA bloqueia a venda ──────
  // Prioridade: cupom de afiliado (sinal mais forte — desconto exclusivo do
  // link) > `?ref=`. Ref desconhecido/inativo/fora da janela = descarta.
  let afiliadoAtribuicao: InsumosVenda['afiliadoAtribuicao'] = null;
  const refCodigoInput =
    typeof input.ref?.codigo === 'string'
      ? normalizarRefCodigo(input.ref.codigo)
      : null;
  // clicadoEm é CLAIM do cliente: clampado a [agora - 10 anos, agora] — um
  // clique "no futuro" ou lixo epoch vira `agora` (janela sempre satisfeita
  // no instante da criação; a checagem AUTORITATIVA re-roda na CONFIRMAÇÃO).
  const clicadoEmMillis = (() => {
    const raw = input.ref?.clicadoEmMillis;
    const t = agora.getTime();
    if (!Number.isInteger(raw) || (raw as number) <= 0) return t;
    return Math.min(Math.max(raw as number, t - 10 * 365 * 24 * 60 * 60 * 1000), t);
  })();
  if (cupomAfiliado !== null) {
    afiliadoAtribuicao = {
      afiliadoId: cupomAfiliado.afiliadoId,
      refCodigo: cupomAfiliado.afiliadoId,
      clicadoEmMillis:
        refCodigoInput === cupomAfiliado.afiliadoId
          ? clicadoEmMillis
          : agora.getTime(),
      origem: 'cupom',
    };
  } else if (refCodigoInput !== null) {
    const afiliadoSnap = await eventoRef
      .collection(COLECAO_AFILIADOS)
      .doc(refCodigoInput)
      .get();
    const dados = afiliadoSnap.data() ?? {};
    const janelaDias =
      typeof dados['janelaAtribuicaoDias'] === 'number'
        ? (dados['janelaAtribuicaoDias'] as number)
        : 0;
    if (
      afiliadoSnap.exists &&
      dados['tenantId'] === tenantId &&
      dados['status'] === 'ativo' &&
      dentroDaJanelaAtribuicao(new Date(clicadoEmMillis), agora, janelaDias)
    ) {
      afiliadoAtribuicao = {
        afiliadoId: refCodigoInput,
        refCodigo: refCodigoInput,
        clicadoEmMillis,
        origem: 'ref',
      };
    }
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

  return {
    tenantId,
    itens,
    cupom,
    cupomParceria,
    cupomAfiliado,
    afiliadoAtribuicao,
    terms,
    modoTaxa,
  };
}

// ---------------------------------------------------------------------------
// Validação de TAMANHOS na origem (RN-223 · S209-T2 · ratificação 3d — T4)
// ---------------------------------------------------------------------------

/**
 * Valida os `tamanhos` de cada inscrito contra os SKUs CONFIGURADOS do evento
 * (`itensKit` × `tamanhosDisponiveis`) — fail-closed: qualquer tamanho/item
 * forjado ⇒ invalid-argument, NADA é escrito (o vetor que antes só aparecia
 * na agregação de estoque FABLE-D morre aqui, na origem).
 *
 * O catálogo só é carregado quando alguma inscrição INFORMOU tamanho (zero
 * leitura extra no fluxo vigente, que ainda não coleta — S209-T3).
 */
export async function validarTamanhosDoCheckout(
  db: Db,
  input: Pick<CreateInscricaoChargeInput, 'eventoId' | 'inscritos'>,
  tenantId: string
): Promise<void> {
  const temTamanhos = input.inscritos.some(
    (i) => i.tamanhos !== undefined && Object.keys(i.tamanhos).length > 0
  );
  if (!temTamanhos) return;

  const itensSnap = await db
    .collection('itensKit')
    .where('eventoId', '==', input.eventoId)
    .get();
  const itensDoEvento: ItemKitParaTamanhos[] = [];
  for (const itemDoc of itensSnap.docs) {
    // Isolamento (ADR-009): item com tenantId divergente do evento é dado
    // corrompido — fora do catálogo de validação (nunca legitima um SKU).
    if (itemDoc.get('tenantId') !== tenantId) continue;
    itensDoEvento.push({
      id: itemDoc.id,
      tamanhado: itemDoc.get('tamanhado') === true,
      tamanhosDisponiveis: Array.isArray(itemDoc.get('tamanhosDisponiveis'))
        ? (itemDoc.get('tamanhosDisponiveis') as unknown[]).filter(
            (t): t is string => typeof t === 'string' && t.length > 0
          )
        : [],
      kits: Array.isArray(itemDoc.get('kits'))
        ? (itemDoc.get('kits') as unknown[]).filter(
            (k): k is string => typeof k === 'string'
          )
        : [],
    });
  }

  const erros: string[] = [];
  input.inscritos.forEach((inscrito, i) => {
    if (inscrito.tamanhos === undefined) return;
    const errosInscrito = validarTamanhosInscrito({
      tamanhos: inscrito.tamanhos,
      kitId:
        typeof inscrito.kitId === 'string' && inscrito.kitId.length > 0
          ? inscrito.kitId
          : undefined,
      itensDoEvento,
    });
    erros.push(...errosInscrito.map((e) => `inscritos[${i}]: ${e}`));
  });

  if (erros.length > 0) {
    throw new https.HttpsError('invalid-argument', erros.join(' '));
  }
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
  tenantId: string,
  cupomParceria: InsumosVenda['cupomParceria'] = null,
  cupomAfiliado: InsumosVenda['cupomAfiliado'] = null,
  afiliadoAtribuicao: InsumosVenda['afiliadoAtribuicao'] = null
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
  // [pag] sem join). Multi-lote não cabe no campo singular — omite (honesto);
  // a verdade POR LINHA (multi-lote incluído) vive em pedido.itens[].loteId.
  const lotesDistintos = new Set(sale.itens.map((i) => i.loteId));
  const loteUnico =
    lotesDistintos.size === 1 ? (sale.itens[0] ?? null) : null;

  // Decomposição POR INSCRITO (re-review A2): a máquina de reembolso
  // (S904/RN-341) estorna 1 inscrito lendo a linha dele — o rateio do
  // desconto é cent-exato (maior resto), então Σ itens.valorFinal ===
  // valorTotal por construção (invariante de parsePedido). sale.itens é
  // 1:1 e NA MESMA ORDEM de input.inscritos (carregarInsumos preserva).
  // RN-347: a taxa REPASSADA (0 em 'incorporada') é rateada por linha —
  // o estorno por inscrito devolve valorFinal + taxaRepassada da linha.
  const itensDoPedido = montarItensDoPedido(
    sale.itens.map((item, i): ItemPedidoInput => {
      const inscritoRef = inscritoIds[i];
      if (inscritoRef === undefined) {
        throw new https.HttpsError(
          'internal',
          'Itens da venda divergem dos inscritos do pedido — estado incoerente.'
        );
      }
      return { inscritoRef, loteId: item.loteId, valorBase: item.preco };
    }),
    sale.desconto,
    sale.taxaRepassada
  );

  try {
    await db.runTransaction(async (tx) => {
      const jaExiste = await tx.get(pedidoRef);
      if (jaExiste.exists) return; // corrida do MESMO key — replay resolve

      // RE-CHECK do cupom club_parceiro DENTRO da tx (RN-364 · S1803
      // "revogação com corrida" + fix review S1802 #1 "freshness"):
      //   - parceria FRESCA precisa seguir 'ativa' (encerrar mata o
      //     desconto — nada de parceria morta em doc de dinheiro);
      //   - o CUPOM fresco precisa estar coerente com a base do sale
      //     (escopo/vínculo/tipo/valor/fimEm) — redefinição da condição
      //     entre a cotação e este commit NÃO deixa desconto STALE passar.
      if (cupomParceria !== null) {
        const [parceriaFresca, cupomFresco] = await Promise.all([
          tx.get(db.doc(cupomParceria.parceriaPath)),
          tx.get(db.doc(cupomParceria.cupomPath)),
        ]);
        if (!parceriaFresca.exists || parceriaFresca.get('status') !== 'ativa') {
          throw new https.HttpsError(
            'failed-precondition',
            'Condição do cupom deixou de valer durante o checkout — refaça a cotação.'
          );
        }
        const fimFresco = cupomFresco.get('fimEm') as
          | { toMillis?: () => number }
          | undefined;
        const coerente =
          cupomFresco.exists &&
          cupomFresco.get('escopo') === 'club_parceiro' &&
          cupomFresco.get('parceriaRef') === cupomParceria.parceriaPath &&
          cupomFresco.get('tipo') === cupomParceria.tipo &&
          cupomFresco.get('valor') === cupomParceria.valor &&
          typeof fimFresco?.toMillis === 'function' &&
          fimFresco.toMillis() === cupomParceria.fimEmMillis;
        if (!coerente) {
          throw new https.HttpsError(
            'failed-precondition',
            'Condição do cupom deixou de valer durante o checkout — refaça a cotação.'
          );
        }
      }

      // RE-CHECK do gate de cupom de AFILIADO DENTRO da tx (R9-E · RN-315
      // — mesma disciplina de freshness do cupomParceria): o gate que
      // abriu na cotação precisa seguir aberto no commit — organizador
      // subiu o mínimo / inativou o afiliado / desamarrou o cupom em voo
      // ⇒ desconto NÃO entra em doc de dinheiro.
      if (cupomAfiliado !== null) {
        const [afiliadoFresco, cupomFrescoAf] = await Promise.all([
          tx.get(db.doc(cupomAfiliado.afiliadoPath)),
          tx.get(db.doc(cupomAfiliado.cupomPath)),
        ]);
        const dadosAf = afiliadoFresco.data() ?? {};
        const gateSegueAberto =
          afiliadoFresco.exists &&
          cupomFrescoAf.exists &&
          cupomFrescoAf.get('afiliadoRef') === cupomAfiliado.afiliadoId &&
          descontoAfiliadoAtivo({
            status: dadosAf['status'] as never,
            minimoInscricoes:
              typeof dadosAf['minimoInscricoes'] === 'number'
                ? (dadosAf['minimoInscricoes'] as number)
                : null,
            conversoes:
              typeof dadosAf['conversoes'] === 'number'
                ? (dadosAf['conversoes'] as number)
                : 0,
          });
        if (!gateSegueAberto) {
          throw new https.HttpsError(
            'failed-precondition',
            'Condição do cupom deixou de valer durante o checkout — refaça a cotação.'
          );
        }
      }

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
          // Rótulo do kit DERIVADO do kitId cobrado (não do `kit` do cliente —
          // ver kitEnumInscritoFromId): impede pagar barato e carimbar o kit
          // caro no doc de retirada.
          kit: kitEnumInscritoFromId(inscrito.kitId),
          // kitId EXATO cobrado — fulfillment (follow-up review c59dc28).
          // NÃO é input livre: criarDocsDeCheckout só roda depois de
          // carregarInsumos validar ESTE id contra eventos/{id}/kits (id sem
          // doc → invalid-argument, nada é escrito) e precificar a linha pelo
          // kit.preco DO DOC — logo o id persistido é sempre o do kit cuja
          // cobrança entrou no pedido. Kits custom do organizador deixam de
          // colapsar em 'sem_kit' no balcão: o rótulo enum segue derivado
          // (acima), mas a entrega lê o id real. null = inscrição sem kit.
          kitId:
            typeof inscrito.kitId === 'string' && inscrito.kitId.length > 0
              ? inscrito.kitId
              : null,
          chipNumero: null,
          status: 'pendente',
          modalidade: inscrito.modalidade,
          pedidoRef: pedidoId,
          ehResponsavel,
          // RN-223 (T4): só entra aqui o que validarTamanhosDoCheckout
          // aprovou contra os SKUs configurados (fail-closed ANTES de
          // qualquer escrita) — o balcão/estoque leem tamanho legítimo.
          tamanhos: inscrito.tamanhos ?? {},
          criadoEm: now,
          atualizadoEm: now,
        });
      });

      // Pedido — root `pedidos/{id}` (ADR-011); pagamentoRef JÁ aponta para
      // o doc criado neste MESMO tx (nunca 'pago' sem cobrança — invariante).
      // `parcelas` espelha cartao.parcelas — SÓ existe no cartão (A5: PIX
      // com espelho de parcelas violaria parsePedido).
      const pedidoDoc: Record<string, unknown> = {
        id: pedidoId,
        tenantId,
        eventoId: input.eventoId,
        responsavel: {
          atletaId: caller.uid,
          nome: input.responsavel.nome.trim(),
          email: input.responsavel.email.trim(),
        },
        inscritoRefs: inscritoIds,
        itens: itensDoPedido,
        pagamentoRef: pagamentoId,
        valorTotal: sale.valorFinal,
        status: 'pendente',
        formaPagamento: sale.forma,
        criadoEm: now,
        atualizadoEm: now,
      };
      if (sale.forma === 'cartao_credito') {
        pedidoDoc['parcelas'] = sale.parcelamento.parcelas;
      }
      tx.create(pedidoRef, pedidoDoc);

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
        // RN-347: totalCobrado JÁ inclui a taxa repassada quando o evento é
        // 'repassada' (computeSaleState) — o valor congelado da cobrança é o
        // que o COMPRADOR paga, nos dois modos.
        gatewayAmountCentavos: centavosDaBorda(sale.totalCobrado),
        criadoEm: now,
        atualizadoEm: now,
      };
      // Campo SÓ em modo 'repassada' — docs 'incorporada' idênticos aos
      // vigentes (schema evolution; parsePagamento aceita ausente).
      if (sale.taxaRepassada > 0) {
        pagamentoDoc['taxaRepassada'] = sale.taxaRepassada;
      }
      if (loteUnico !== null && loteUnico.loteId !== null) {
        pagamentoDoc['loteId'] = loteUnico.loteId;
        if (loteUnico.loteNome !== null) pagamentoDoc['loteNome'] = loteUnico.loteNome;
      }
      if (sale.cupomAplicado !== null) {
        const cupom: Record<string, unknown> = { codigo: sale.cupomAplicado.codigo };
        if (sale.cupomAplicado.tipo === 'percentual') {
          cupom['descontoPct'] = sale.cupomAplicado.valor;
        }
        // Atribuição ao CLUB PARCEIRO (RN-364 · E18): o desconto entra no
        // bruto e fica ATRIBUÍDO ao clube no doc de pagamento (sem split —
        // RN-360; a máquina de repasse RN-365 segue intocada).
        if (cupomParceria !== null && cupomParceria.clubeRef.length > 0) {
          cupom['clubeRef'] = cupomParceria.clubeRef;
        }
        pagamentoDoc['cupom'] = cupom;
      }
      // Atribuição de AFILIADO (R9-E · RN-313/314): carimbo informativo no
      // doc de pagamento (sem split — RN-313). A conversão em si só REGISTRA
      // na CONFIRMAÇÃO (webhook — porta única de estado financeiro), com a
      // janela re-checada contra `clicadoEmMillis` no instante convertido.
      if (afiliadoAtribuicao !== null) {
        pagamentoDoc['afiliado'] = {
          afiliadoId: afiliadoAtribuicao.afiliadoId,
          refCodigo: afiliadoAtribuicao.refCodigo,
          clicadoEmMillis: afiliadoAtribuicao.clicadoEmMillis,
          origem: afiliadoAtribuicao.origem,
        };
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
      // RN-347 — do doc PERSISTIDO (replay nunca recomputa): ausente = 0
      // (evento 'incorporada' e docs pré-RN347).
      taxaServico: (pagamentoSnap.get('taxaRepassada') as number | undefined) ?? 0,
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
    const {
      tenantId,
      itens,
      cupom,
      cupomParceria,
      cupomAfiliado,
      afiliadoAtribuicao,
      terms,
      modoTaxa,
    } = await carregarInsumos(db, input, agora());
    // RN-223 (T4) — validação de tamanho NA ORIGEM, antes de qualquer escrita:
    // tamanho/SKU forjado ⇒ invalid-argument fail-closed (nada criado).
    await validarTamanhosDoCheckout(db, input, tenantId);
    let sale: SaleState;
    try {
      sale = computeSaleState({
        itens,
        cupom,
        forma: input.forma,
        parcelas: input.parcelas,
        installmentRules: terms.installmentRules,
        platformFeePct: terms.platformFeePct,
        // RN-347: modo do DOC do evento (carregarInsumos) — nunca do input
        modoTaxa,
        agora: agora(),
      });
    } catch (err) {
      throw new https.HttpsError(
        'invalid-argument',
        err instanceof Error ? err.message : 'Estado de venda inválido.'
      );
    }
    await criarDocsDeCheckout(
      db,
      input,
      caller,
      sale,
      tenantId,
      cupomParceria,
      cupomAfiliado,
      afiliadoAtribuicao
    );
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
    { uid: context.auth.uid },
    // Relógio da venda: real em produção; honra LEELA_CLOCK SÓ no emulator
    // (demo contra o seed de datas fixas — ver relogioCheckout.ts). ⚠️ Fable.
    agoraCheckout
  );
});
