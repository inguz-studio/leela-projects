// =============================================================================
// functions/src/eventos/agregarEstoque.ts
//
// Aprovisionamento de kit POR SKU (item tamanhado × tamanho) por Cloud
// Function (LEELA-S210-T3 · E03 · FABLE-D-T2).
//
// Docs mantidos: `eventos/{eventoId}/aprovisionamento/{itemId__tamanho}` —
// escrita EXCLUSIVA de Function (Rules: write false; leitura owner/staff).
// A tela Kits-Estoque (S210-T4/FABLE-D-T3) LÊ estes docs — nunca varre
// inscritos no cliente (RN-224).
//
// FULL RECOMPUTE (idempotente por construção — MESMO padrão de
// `agregarFinanceiro`/`agregarComunicacoes`): para cada SKU,
//   `qtdVendida` = count() de inscritos CONFIRMADOS com
//                  `tamanhos.{itemId} == tamanho` (RN-224 — o map `tamanhos`
//                  é escrito SÓ pelo checkout, por item tamanhado do kit
//                  escolhido: o filtro É o predicado "exige (item, tamanho)");
//   `aEncomendar` = max(0, qtdVendida − estoqueFisico) (RN-224);
//   `alerta`      = derivado (core.alertaAprovisionamento) — nunca do cliente.
// Tudo numa única transação (snapshot-consistente): dois onWrite em corrida
// não persistem ∑ stale. Reprocessar N vezes produz os MESMOS docs.
//
// ESTORNO COERENTE POR CONSTRUÇÃO: o filtro `status == 'confirmado'` exclui
// `estornado`/`cancelado` — o flip do estorno (FABLE-B) redispara este
// gatilho e o recompute full REVERTE o consumo sem lógica de compensação.
//
// MATRIZ DE SKUs = declarados (item tamanhado × tamanhosDisponiveis — S210-T1)
// ∪ docs existentes (SKU cujo tamanho saiu do catálogo segue recontado — a
// demanda confirmada não evapora quando o organizador edita o item). Estado
// operacional (`estado`/`estoqueFisico`/`historico`/`criadoEm`) é PRESERVADO
// no recompute — só os ∑ derivados são recomputados.
//
// DEPENDÊNCIA DECLARADA (S209-T2): tamanho FORA de `tamanhosDisponiveis` só
// não entra na matriz se nunca virou doc — a validação que o impede na
// origem é do checkout (S209-T2/T3; `tamanhos` já é campo de escrita
// exclusiva da Function do checkout). Sem varredura server-side aqui: o
// filtro range em subcampo de map exigiria índice composto por itemId
// dinâmico (impossível de pré-declarar em produção).
//
// MÁQUINA DE ESTADOS (RN-226): `transicaoAprovisionamento` (callable, SÓ
// organizador — tenant_owner/tenant_staff do tenant do evento) avança
// `estimativa → encomendado → em_estoque`, registrando quantidade e data no
// `historico[]`. A transição para `em_estoque` DECLARA o saldo físico
// (`estoqueFisico = qtd` — edição manual de saldo segue fora do escopo,
// E03 §kits) e recomputa `aEncomendar`/`alerta`. Replay da mesma transição é
// REJEITADO pela matriz canônica (em_estoque é terminal) — idempotência por
// máquina de estados, sem efeito duplicado.
//
// Gatilho: onWrite de `eventos/{e}/inscritos/{i}` → recomputa. O write dos
// docs de aprovisionamento NÃO redispara este gatilho (subcoleção diferente)
// — sem loop.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  alertaAprovisionamento,
  COLECAO_APROVISIONAMENTO,
  computeAEncomendar,
  gradeDoDocItemKit,
  isEstadoAprovisionamento,
  parseSkuId,
  podeTransicionarAprovisionamento,
  qtdEstoqueValida,
  skuId,
  sufixoSku,
  TRANSICOES_APROVISIONAMENTO,
  type AlertaEstoqueSku,
  type AuthClaims,
  type EstadoAprovisionamento,
  type TransicaoAprovisionamento,
} from '@leela/core';
import {
  assertTenantAtivo,
  assertTenantWriter,
  type EventoCaller,
} from './criarEvento';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Recomputação Σ (núcleo — testável com Admin SDK contra o Emulator)
// ---------------------------------------------------------------------------

/** Resumo do recompute (consumido por testes/logs — sem PII). */
export interface ResumoEstoqueEvento {
  /** qtdVendida por SKU recomputada (chave = `itemId__tamanho`) */
  vendidoPorSku: Record<string, number>;
  /** Nº de docs de aprovisionamento mantidos */
  skus: number;
}

/**
 * Recomputa o aprovisionamento do evento DO ZERO e persiste um doc por SKU
 * (set integral preservando estado operacional — idempotente).
 *
 * @returns o resumo recomputado, ou null quando o evento não existe
 *          (inscrito órfão de evento deletado — nada a manter).
 */
export async function recomputarAprovisionamentoEvento(
  db: Db,
  eventoId: string
): Promise<ResumoEstoqueEvento | null> {
  return db.runTransaction(async (tx) => {
    const eventoRef = db.collection('eventos').doc(eventoId);
    const eventoSnap = await tx.get(eventoRef);
    if (!eventoSnap.exists) return null;

    const tenantId = (eventoSnap.get('tenantId') as string) ?? '';
    const inscritosCol = eventoRef.collection('inscritos');
    const aprovCol = eventoRef.collection(COLECAO_APROVISIONAMENTO);

    // Itens tamanhados do evento (S210-T1) — matriz declarada de SKUs.
    // RN-231: a GRADE EFETIVA (Postel — gradeDoDocItemKit) decide os SKUs:
    // grade por corte gera `itemId__corte__tamanho`; legado/unissex mantém as
    // chaves `itemId__tamanho` de sempre (mesmos docs, zero migração).
    // Filtro `tamanhado` em memória: catálogo de itens é pequeno (unidades)
    // e evita depender de zigzag para dois equality no mesmo snapshot.
    const itensSnap = await tx.get(
      db.collection('itensKit').where('eventoId', '==', eventoId)
    );
    const declarados = new Set<string>();
    for (const itemDoc of itensSnap.docs) {
      // Fix A3 da review antagonista: docId de item forjado (ex.: com `__`)
      // faria skuId LANÇAR e derrubaria a agregação INTEIRA do evento (retry
      // infinito do gatilho). Um item envenenado é PULADO — nunca legitima
      // SKU nem derruba o Σ dos itens sãos (filosofia Postel da agregação).
      try {
        for (const linha of gradeDoDocItemKit(itemDoc.data())) {
          for (const tamanho of linha.tamanhos) {
            declarados.add(skuId(itemDoc.id, tamanho, linha.corte));
          }
        }
      } catch (e) {
        logger.warn('estoque_item_envenenado_pulado', {
          eventoId,
          itemId: itemDoc.id.slice(0, 80),
          erro: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // ∪ docs existentes: SKU fora do catálogo atual segue recontado (a
    // demanda confirmada não evapora com a edição do item).
    const existentesSnap = await tx.get(aprovCol);
    const existentes = new Map<
      string,
      FirebaseFirestore.QueryDocumentSnapshot
    >();
    for (const skuDoc of existentesSnap.docs) {
      existentes.set(skuDoc.id, skuDoc);
    }
    const todosSkus = new Set<string>([...declarados, ...existentes.keys()]);

    // count() por SKU no MESMO snapshot transacional (RN-224): dois equality
    // (status + subcampo do map) — índices single-field automáticos.
    // RN-231: o valor do map `tamanhos.{itemId}` é o SUFIXO do SKU ('M' no
    // unissex/legado, 'feminina__M' na grade por corte) — a query segue UMA
    // equality, idêntica à de antes para os SKUs legados.
    const vendidoPorSku: Record<string, number> = {};
    for (const sku of todosSkus) {
      const { itemId, corte, tamanho } = parseSkuId(sku);
      const q = inscritosCol
        .where('status', '==', 'confirmado')
        .where(new FieldPath('tamanhos', itemId), '==', sufixoSku(corte, tamanho));
      vendidoPorSku[sku] = (await tx.get(q.count())).data().count;
    }

    // Escrita: set integral por SKU — ∑ recomputados, estado operacional
    // preservado (estado/estoqueFisico/historico/criadoEm são da máquina de
    // estados, não desta agregação).
    for (const sku of todosSkus) {
      const { itemId, corte, tamanho } = parseSkuId(sku);
      const atual = existentes.get(sku);
      const estado: EstadoAprovisionamento =
        atual !== undefined && isEstadoAprovisionamento(atual.get('estado'))
          ? (atual.get('estado') as EstadoAprovisionamento)
          : 'estimativa';
      const estoqueFisico =
        atual !== undefined && qtdEstoqueValida(atual.get('estoqueFisico'))
          ? (atual.get('estoqueFisico') as number)
          : 0;
      const historico =
        atual !== undefined && Array.isArray(atual.get('historico'))
          ? (atual.get('historico') as unknown[])
          : [];
      const qtdVendida = vendidoPorSku[sku] as number;

      tx.set(aprovCol.doc(sku), {
        id: sku,
        tenantId,
        itemId,
        corte,
        tamanho,
        estado,
        qtdVendida,
        estoqueFisico,
        aEncomendar: computeAEncomendar(qtdVendida, estoqueFisico),
        alerta: alertaAprovisionamento({ estado, estoqueFisico, qtdVendida }),
        historico,
        criadoEm: atual?.get('criadoEm') ?? FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    }

    return { vendidoPorSku, skus: todosSkus.size };
  });
}

// ---------------------------------------------------------------------------
// Gatilho (Cloud Functions v1 — mesmo runtime dos módulos existentes)
// ---------------------------------------------------------------------------

/**
 * onWrite de inscrito → recomputa o aprovisionamento por SKU do evento.
 * At-least-once safe: a recomputação é full — reprocessar não duplica.
 * Convive com `onInscritoWrite` (agregarFinanceiro): gatilhos independentes
 * no mesmo path, agregados diferentes.
 */
export const onInscritoWriteEstoque = functions.firestore
  .document('eventos/{eventoId}/inscritos/{inscritoId}')
  .onWrite(async (_change, context) => {
    const eventoId = context.params['eventoId'] as string;
    try {
      const resumo = await recomputarAprovisionamentoEvento(
        admin.firestore(),
        eventoId
      );
      if (resumo) {
        logger.info('aprovisionamento_evento_recomputado', {
          eventoId,
          skus: resumo.skus,
        });
      }
    } catch (err) {
      // Sem PII no log — só o id do evento (LGPD)
      logger.error('aprovisionamento_evento_falha', { eventoId, err });
      throw err;
    }
  });

// ---------------------------------------------------------------------------
// Máquina de estados (RN-226) — transição pelo organizador via callable
// ---------------------------------------------------------------------------

/** Input da transição — quantidade é da TRANSIÇÃO (encomendada/recebida). */
export interface TransicaoAprovisionamentoInput {
  eventoId: string;
  /** docId do SKU (`itemId__tamanho`) */
  sku: string;
  novoEstado: EstadoAprovisionamento;
  /** Quantidade registrada na transição (RN-226) — inteiro ≥ 0 */
  qtd: number;
}

/** Resultado da transição (consumido por testes e pela UI do organizador). */
export interface TransicaoAprovisionamentoResult {
  sku: string;
  estado: EstadoAprovisionamento;
  estoqueFisico: number;
  aEncomendar: number;
  alerta: AlertaEstoqueSku | null;
}

/**
 * Teto SANITÁRIO da quantidade da transição (S210-T4 review antagonista Fable).
 * `qtdEstoqueValida` só exige inteiro ≥ 0 — sem limite superior, a UI (que só
 * valida `Number.isInteger(x) && x >= 0`) deixa passar `1e9`/`1e21`, que o
 * servidor carimbava direto no `estoqueFisico`/`historico`. É dado do próprio
 * tenant (sem impacto cross-tenant ou de dinheiro), mas um saldo de 1 bilhão de
 * unidades por (item×tamanho) é erro de digitação, não estoque real: mascara o
 * alerta `esgotado`/`baixa` do SKU e polui o `historico[]` append-only. 1 milhão
 * de unidades de UM tamanho já é ordem de grandeza absurda para um evento —
 * acima disso é entrada inválida, rejeitada como `invalid-argument`. NÃO é regra
 * de negócio congelada; é guarda contra input sem sentido físico.
 *
 * DEC-0728D (item 15, verbatim do dono: *"Teto de quantidade é quantidade de
 * itens? Se sim, pode ser 999.999"*): 999.999, o maior número de 6 dígitos. O
 * dono trocou o teto redondo por um que cabe no campo — a natureza da guarda
 * não mudou, o número é escolha dele. O limiar de baixa (`LIMIAR_BAIXA_SKU_
 * DEFAULT`, no core) segue em 10 pela mesma decisão, e nenhum dos dois vira
 * configuração.
 */
export const MAX_QTD_TRANSICAO_APROVISIONAMENTO = 999_999;

/**
 * Valida o input bruto de `transicaoAprovisionamento`. Retorna a lista de
 * erros (vazia = válido). Pura — reutilizada pelos testes sem Emulator. @pure
 */
export function validarTransicaoAprovisionamentoInput(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Input é obrigatório.'];
  }
  const input = raw as Record<string, unknown>;
  const erros: string[] = [];

  if (typeof input['eventoId'] !== 'string' || input['eventoId'].length === 0) {
    erros.push('"eventoId" é obrigatório.');
  }
  const sku = input['sku'];
  if (typeof sku !== 'string' || sku.length === 0) {
    erros.push('"sku" é obrigatório (docId itemId__tamanho — S210-T2).');
  } else {
    try {
      parseSkuId(sku);
    } catch {
      // Eco TRUNCADO (fix A7 — disciplina eco() de validarTamanhos: nunca
      // devolver a string forjada inteira na mensagem de erro).
      erros.push(`"sku" '${sku.slice(0, 80)}' fora do padrão itemId__tamanho (S210-T2).`);
    }
  }
  if (!isEstadoAprovisionamento(input['novoEstado'])) {
    erros.push(
      '"novoEstado" deve ser estimativa | encomendado | em_estoque (RN-226).'
    );
  }
  if (!qtdEstoqueValida(input['qtd'])) {
    erros.push('"qtd" deve ser inteiro ≥ 0 (quantidade da transição — RN-226).');
  } else if ((input['qtd'] as number) > MAX_QTD_TRANSICAO_APROVISIONAMENTO) {
    erros.push(
      `"qtd" acima do teto sanitário (${MAX_QTD_TRANSICAO_APROVISIONAMENTO}) — ` +
        'provável erro de digitação, não estoque real (S210-T4 review).'
    );
  }

  return erros;
}

/**
 * Núcleo da transição (testável com Admin SDK contra o Emulator).
 * Guards (Schneier): papel de escrita no tenant (RN-401) + tenant ativo
 * (RN-402) + evento do PRÓPRIO tenant (RN-400) + transição válida na matriz
 * canônica (RN-226). O estado NUNCA anda fora da matriz — replay é rejeitado.
 */
export async function transicaoAprovisionamentoCore(
  db: Db,
  rawInput: unknown,
  caller: EventoCaller
): Promise<TransicaoAprovisionamentoResult> {
  const erros = validarTransicaoAprovisionamentoInput(rawInput);
  if (erros.length > 0) {
    throw new https.HttpsError('invalid-argument', erros.join(' '));
  }
  const input = rawInput as unknown as TransicaoAprovisionamentoInput;

  const tenantId = assertTenantWriter(caller.claims);
  await assertTenantAtivo(db, tenantId);

  return db.runTransaction(async (tx) => {
    const eventoRef = db.collection('eventos').doc(input.eventoId);
    const eventoSnap = await tx.get(eventoRef);
    if (!eventoSnap.exists) {
      throw new https.HttpsError(
        'not-found',
        `Evento '${input.eventoId}' não existe.`
      );
    }
    // Cross-tenant: organizador só opera estoque do PRÓPRIO tenant (RN-400).
    if (eventoSnap.get('tenantId') !== tenantId) {
      throw new https.HttpsError(
        'permission-denied',
        'Evento pertence a outro tenant (RN-400).'
      );
    }

    const skuRef = eventoRef
      .collection(COLECAO_APROVISIONAMENTO)
      .doc(input.sku);
    const skuSnap = await tx.get(skuRef);
    if (!skuSnap.exists) {
      throw new https.HttpsError(
        'not-found',
        `SKU '${input.sku}' sem aprovisionamento — a agregação (onWrite de ` +
          `inscrito) materializa o doc antes de qualquer transição.`
      );
    }

    const estadoAtual = skuSnap.get('estado');
    if (!isEstadoAprovisionamento(estadoAtual)) {
      throw new https.HttpsError(
        'internal',
        `SKU '${input.sku}' com estado corrompido — intervenção manual.`
      );
    }
    if (!podeTransicionarAprovisionamento(estadoAtual, input.novoEstado)) {
      const permitidas = TRANSICOES_APROVISIONAMENTO[estadoAtual];
      throw new https.HttpsError(
        'failed-precondition',
        `Transição '${estadoAtual}' → '${input.novoEstado}' inválida ` +
          `(RN-226: ${permitidas.length > 0 ? `só → ${permitidas.join('/')}` : 'em_estoque é terminal'}).`
      );
    }

    const qtdVendida = qtdEstoqueValida(skuSnap.get('qtdVendida'))
      ? (skuSnap.get('qtdVendida') as number)
      : 0;
    // `em_estoque` DECLARA o saldo físico (qtd recebida) — única porta de
    // entrada do estoqueFisico (edição manual fora do escopo, E03 §kits).
    const estoqueFisico =
      input.novoEstado === 'em_estoque'
        ? input.qtd
        : qtdEstoqueValida(skuSnap.get('estoqueFisico'))
          ? (skuSnap.get('estoqueFisico') as number)
          : 0;

    const aEncomendar = computeAEncomendar(qtdVendida, estoqueFisico);
    const alerta = alertaAprovisionamento({
      estado: input.novoEstado,
      estoqueFisico,
      qtdVendida,
    });

    // Timestamp.now() no item do array: serverTimestamp() não é permitido
    // dentro de array — data da transição vem do relógio do servidor da
    // Function (Admin SDK), nunca do cliente.
    const entrada: TransicaoAprovisionamento = {
      estado: input.novoEstado,
      qtd: input.qtd,
      em: Timestamp.now(),
    };
    const historicoAtual = Array.isArray(skuSnap.get('historico'))
      ? (skuSnap.get('historico') as unknown[])
      : [];

    tx.update(skuRef, {
      estado: input.novoEstado,
      estoqueFisico,
      aEncomendar,
      alerta,
      historico: [...historicoAtual, entrada],
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    return {
      sku: input.sku,
      estado: input.novoEstado,
      estoqueFisico,
      aEncomendar,
      alerta,
    };
  });
}

/**
 * Callable: transição da máquina de estados de aprovisionamento (RN-226).
 * SÓ organizador (tenant_owner/tenant_staff) — athlete/promoter negados.
 */
export const transicaoAprovisionamento = https.onCall(
  async (data: unknown, context) => {
    if (!context.auth) {
      throw new https.HttpsError(
        'unauthenticated',
        'Autenticação obrigatória para operar aprovisionamento.'
      );
    }
    const caller: EventoCaller = {
      uid: context.auth.uid,
      claims: context.auth.token as unknown as AuthClaims,
    };
    const resultado = await transicaoAprovisionamentoCore(
      admin.firestore(),
      data,
      caller
    );
    logger.info('aprovisionamento_transicao', {
      sku: resultado.sku,
      estado: resultado.estado,
      uid: caller.uid,
    });
    return resultado;
  }
);

// ---------------------------------------------------------------------------
// Encerrar encomendas do ITEM (TAMANHOS-GRADE · RN-232) — ação do organizador
// ---------------------------------------------------------------------------

/**
 * SEMÂNTICA RATIFICADA (premissa documentada — pedido do Vitor: "quando
 * encerrar encomendas, e depois ajustar o estoque físico"):
 *
 *   "Encerrar encomendas" do item = o organizador VAI À PRODUÇÃO com a
 *   contagem vendida daquele momento. Tecnicamente: TODOS os SKUs do item em
 *   `estimativa` transicionam para `encomendado` (RN-226) com
 *   `qtd = qtdVendida` do instante (a FOTO da encomenda), numa única
 *   transação (nenhum SKU encerra com foto de instante diferente).
 *
 *   NÃO fecha as vendas do kit e NÃO congela o que o comprador escolhe —
 *   encerrar encomenda ≠ fechar vendas: quem compra depois segue escolhendo
 *   corte/tamanho; a diferença entre o vendido final e a foto encomendada
 *   aparece em `aEncomendar` quando o estoque chega (`em_estoque`) e nos
 *   alertas derivados. Quem fecha venda é o lote/kit, não o estoque.
 *
 *   IDEMPOTENTE por máquina de estados: SKU já `encomendado`/`em_estoque` é
 *   PULADO (contado em `jaEncerrados`) — re-invocar não duplica histórico.
 *   SKUs materializados depois (venda nova de SKU inédito) podem ser
 *   encerrados numa nova chamada.
 */
export interface EncerrarEncomendasItemInput {
  eventoId: string;
  itemId: string;
}

/** Resultado do encerramento (consumido pela UI do organizador e testes). */
export interface EncerrarEncomendasItemResult {
  itemId: string;
  /** SKUs transicionados estimativa→encomendado NESTA chamada. */
  encerrados: string[];
  /** SKUs que já estavam além de `estimativa` (pulados — idempotência). */
  jaEncerrados: string[];
}

/** Valida o input bruto de `encerrarEncomendasItem`. @pure */
export function validarEncerrarEncomendasItemInput(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Input é obrigatório.'];
  }
  const input = raw as Record<string, unknown>;
  const erros: string[] = [];
  if (typeof input['eventoId'] !== 'string' || input['eventoId'].length === 0) {
    erros.push('"eventoId" é obrigatório.');
  }
  const itemId = input['itemId'];
  if (
    typeof itemId !== 'string' ||
    itemId.length === 0 ||
    itemId.includes('__')
  ) {
    erros.push('"itemId" é obrigatório (não-vazio, sem "__" — S210-T2).');
  }
  return erros;
}

/**
 * Núcleo do encerramento (testável com Admin SDK contra o Emulator).
 * Guards idênticos aos da transição unitária: papel de escrita no tenant
 * (RN-401) + tenant ativo (RN-402) + evento do PRÓPRIO tenant (RN-400).
 * Transacional: a foto `qtd = qtdVendida` de TODOS os SKUs sai do MESMO
 * snapshot — venda em corrida entra na diferença do `aEncomendar`, nunca
 * numa foto meio-atualizada.
 */
export async function encerrarEncomendasItemCore(
  db: Db,
  rawInput: unknown,
  caller: EventoCaller
): Promise<EncerrarEncomendasItemResult> {
  const erros = validarEncerrarEncomendasItemInput(rawInput);
  if (erros.length > 0) {
    throw new https.HttpsError('invalid-argument', erros.join(' '));
  }
  const input = rawInput as unknown as EncerrarEncomendasItemInput;

  const tenantId = assertTenantWriter(caller.claims);
  await assertTenantAtivo(db, tenantId);

  return db.runTransaction(async (tx) => {
    const eventoRef = db.collection('eventos').doc(input.eventoId);
    const eventoSnap = await tx.get(eventoRef);
    if (!eventoSnap.exists) {
      throw new https.HttpsError(
        'not-found',
        `Evento '${input.eventoId}' não existe.`
      );
    }
    if (eventoSnap.get('tenantId') !== tenantId) {
      throw new https.HttpsError(
        'permission-denied',
        'Evento pertence a outro tenant (RN-400).'
      );
    }

    const skusSnap = await tx.get(
      eventoRef
        .collection(COLECAO_APROVISIONAMENTO)
        .where('itemId', '==', input.itemId)
    );
    if (skusSnap.empty) {
      throw new https.HttpsError(
        'not-found',
        `Item '${input.itemId}' sem SKUs de aprovisionamento — a agregação ` +
          `(onWrite de inscrito) materializa os docs antes do encerramento.`
      );
    }

    const encerrados: string[] = [];
    const jaEncerrados: string[] = [];
    const em = Timestamp.now();
    for (const skuDoc of skusSnap.docs) {
      const estadoAtual = skuDoc.get('estado');
      if (!isEstadoAprovisionamento(estadoAtual)) {
        throw new https.HttpsError(
          'internal',
          `SKU '${skuDoc.id}' com estado corrompido — intervenção manual.`
        );
      }
      if (estadoAtual !== 'estimativa') {
        // Já encomendado/em estoque — idempotência por máquina de estados.
        jaEncerrados.push(skuDoc.id);
        continue;
      }
      const qtdVendida = qtdEstoqueValida(skuDoc.get('qtdVendida'))
        ? (skuDoc.get('qtdVendida') as number)
        : 0;
      const estoqueFisico = qtdEstoqueValida(skuDoc.get('estoqueFisico'))
        ? (skuDoc.get('estoqueFisico') as number)
        : 0;
      const entrada: TransicaoAprovisionamento = {
        estado: 'encomendado',
        qtd: qtdVendida,
        em,
      };
      const historicoAtual = Array.isArray(skuDoc.get('historico'))
        ? (skuDoc.get('historico') as unknown[])
        : [];
      tx.update(skuDoc.ref, {
        estado: 'encomendado' satisfies EstadoAprovisionamento,
        aEncomendar: computeAEncomendar(qtdVendida, estoqueFisico),
        alerta: alertaAprovisionamento({
          estado: 'encomendado',
          estoqueFisico,
          qtdVendida,
        }),
        historico: [...historicoAtual, entrada],
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      encerrados.push(skuDoc.id);
    }

    return { itemId: input.itemId, encerrados, jaEncerrados };
  });
}

/**
 * Callable: encerra as encomendas de UM item (todos os SKUs em `estimativa`
 * → `encomendado`, com a contagem vendida do momento — RN-232). SÓ
 * organizador (tenant_owner/tenant_staff). NÃO fecha vendas do kit.
 */
export const encerrarEncomendasItem = https.onCall(
  async (data: unknown, context) => {
    if (!context.auth) {
      throw new https.HttpsError(
        'unauthenticated',
        'Autenticação obrigatória para operar aprovisionamento.'
      );
    }
    const caller: EventoCaller = {
      uid: context.auth.uid,
      claims: context.auth.token as unknown as AuthClaims,
    };
    const resultado = await encerrarEncomendasItemCore(
      admin.firestore(),
      data,
      caller
    );
    logger.info('aprovisionamento_encerrar_encomendas', {
      itemId: resultado.itemId,
      encerrados: resultado.encerrados.length,
      jaEncerrados: resultado.jaEncerrados.length,
      uid: caller.uid,
    });
    return resultado;
  }
);
