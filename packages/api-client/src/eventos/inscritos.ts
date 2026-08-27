// =============================================================================
// packages/api-client/src/eventos/inscritos.ts
//
// Query paginada da subcoleção `eventos/{eventoId}/inscritos`
// (LEELA-S203-T1 · E03). Paginação OBRIGATÓRIA por cursor — o mock canônico
// tem 453 inscritos (HANDOFF-05) e a tela lista ~18 linhas por página (§2.5).
//
// Leitura protegida pelas Rules via tenant do EVENTO PAI (get no doc pai),
// por isso a query não precisa (nem pode, em subcoleção) filtrar tenantId.
// Escrita de carimbos (kitEntregueEm/checkinEm/qrToken) só por Function.
//
// ── F1 NA LISTA DE INSCRITOS (INSCRITOS-READ-FIX · 17/08) ───────────────────
// `parseInscrito` é fail-fast por desenho, e ele CONTINUA fail-fast: é o
// contrato do doc e a guarda do dinheiro (coerência do estorno, vínculo ao
// pedido). O que estava errado era a LISTAGEM — `snap.docs.map(parseInscrito)`
// deixava UM doc fora do shape matar a lista inteira do evento.
//
// A regra morde na ESCRITA, nunca na leitura. E a escrita aqui é mais LARGA
// que o parse: `firestore.rules` (match `eventos/{id}/inscritos`) exige do
// cliente só tenantId + kit no enum + status no enum de cliente + chip nulo —
// NÃO exige `atletaNome`, `atletaId` nem `modalidade`, que o parse recusa
// vazios. Um organizador criando inscrito pela porta sancionada podia (e pode)
// gravar um doc que a própria tela dele não consegue mais ler, e derrubar
// junto a lista dos outros 300. Fora isso, doc anterior a uma regra nova
// (Kleppmann: "data outlives code") tropeça na regra de hoje pelo mesmo
// caminho — foi o que aconteceu com os 8 `estornado` sem `estornadoEm` do
// seed do mock.
//
// Resgate = doutrina F1 dos readers de evento (`queries.ts` · listasGlobais ·
// tenantEventosClubs): cada doc é isolado, o que falha vira placeholder
// degradado + telemetria nomeada, e a lista NUNCA morre. Sumir da lista seria
// pior que degradar — o organizador precisa VER que a pessoa existe.
// A leitura O(1) de UM inscrito segue fail-fast de propósito.
// =============================================================================

import {
  collection,
  getDocs,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  type Firestore,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  isCodigoIngressoValido,
  isCodigoPedidoValido,
  isKitInscrito,
  isStatusInscrito,
  parseInscrito,
  type Inscrito,
  type Timestamp,
} from '@leela/core';
import { timestampSeguro } from './queries';

/**
 * Page size do fetch paginado de inscritos (§2.5).
 *
 * Régua de dimensionamento: a latência de round-trip (network + Firestore)
 * domina o custo total — não o payload. 453 inscritos com 18/página geram
 * 26 round-trips sequenciais; com 200/página, apenas 3 (perf/dados-quentes-20260826).
 * O teto de 1000 do INSCRITOS_BALCAO_CAP deixa folga para crescimento sem
 * risco de leitura ilimitada.
 */
export const INSCRITOS_PAGE_SIZE = 200;

/**
 * Teto do listener realtime do balcão (S204). O mock canônico tem 453 inscritos
 * (HANDOFF-05); 1000 dá folga sem virar listener ilimitado. O balcão precisa do
 * POOL inteiro em memória para buscar por nome/dorsal (não pagina).
 */
export const INSCRITOS_BALCAO_CAP = 1000;

/** Marcador honesto quando nem o NOME do inscrito sobrevive à leitura. */
export const INSCRITO_DEGRADADO_NOME = '(inscrito com dados inválidos)';

/** Repassa o carimbo quando ele quacka como Timestamp; senão, não inventa. */
function carimboLegivel(v: unknown): Timestamp | null {
  return v !== null &&
    typeof v === 'object' &&
    typeof (v as Partial<Timestamp>).toDate === 'function'
    ? (v as Timestamp)
    : null;
}

/**
 * Placeholder degradado de um doc de inscrito que NÃO parseia (F1 — mesmo
 * caminho de resgate de `eventoDegradado`).
 *
 * A IDENTIDADE é confiável: `id` é o docId real e a query já roda DENTRO de
 * `eventos/{eventoId}/inscritos`, então a linha pertence mesmo a este evento.
 * O CONTEÚDO é best-effort: cada campo primitivo passa pelo MESMO validador do
 * parse e só entra quando confere — nada aqui adivinha um valor plausível.
 *
 * Três escolhas que não são óbvias:
 *
 *   1. `status` PRESERVADO quando está no enum. O caso que originou este
 *      resgate (`estornado` sem carimbo) falha na COERÊNCIA entre campos, não
 *      no enum — trocar o status para "confirmado" aqui poria uma inscrição
 *      devolvida de volta no denominador de dinheiro (D-1008-R19). Fora do
 *      enum cai em `pendente`: não conta como pagante e não some da operação,
 *      que é o "não sei" honesto.
 *   2. `kitEntregueEm`/`checkinEm` PRESERVADOS quando legíveis. Zerá-los seria
 *      dizer ao balcão que a pessoa não retirou o kit — degradação que vira
 *      entrega em dobro. Carimbo é o dado que o operador age em cima.
 *   3. `dadosPessoais`, `tamanhos` e `titularHistorico` NÃO entram. São os
 *      blocos aninhados, e portanto as fontes mais prováveis do defeito;
 *      propagá-los sem parse é o que a doutrina F1 já recusou em
 *      cronograma/faixa do evento.
 */
export function inscritoDegradado(id: string, raw: Record<string, unknown>): Inscrito {
  const tenantIdRaw = raw['tenantId'];
  const atletaIdRaw = raw['atletaId'];
  const nomeRaw = raw['atletaNome'];
  const modalidadeRaw = raw['modalidade'];
  const chipRaw = raw['chipNumero'];
  const pedidoRefRaw = raw['pedidoRef'];
  const temPedido = typeof pedidoRefRaw === 'string' && pedidoRefRaw.length > 0;

  const degradado: Inscrito = {
    id,
    tenantId: typeof tenantIdRaw === 'string' ? tenantIdRaw : '',
    atletaId: typeof atletaIdRaw === 'string' ? atletaIdRaw : '',
    atletaNome:
      typeof nomeRaw === 'string' && nomeRaw.length > 0 ? nomeRaw : INSCRITO_DEGRADADO_NOME,
    kit: isKitInscrito(raw['kit']) ? raw['kit'] : 'sem_kit',
    chipNumero: typeof chipRaw === 'string' ? chipRaw : null,
    status: isStatusInscrito(raw['status']) ? raw['status'] : 'pendente',
    modalidade: typeof modalidadeRaw === 'string' ? modalidadeRaw : '',
    pedidoRef: temPedido ? (pedidoRefRaw as string) : null,
    // `ehResponsavel` sem pedido é o próprio vínculo incoerente que o parse
    // recusa — o placeholder não pode reintroduzi-lo.
    ehResponsavel: raw['ehResponsavel'] === true && temPedido,
    tamanhos: {},
    criadoEm: timestampSeguro(raw['criadoEm']),
    atualizadoEm: timestampSeguro(raw['atualizadoEm']),
  };

  // exactOptionalPropertyTypes: opcionais só entram quando sobrevivem à leitura.
  const kitEntregueEm = carimboLegivel(raw['kitEntregueEm']);
  if (kitEntregueEm) degradado.kitEntregueEm = kitEntregueEm;
  const checkinEm = carimboLegivel(raw['checkinEm']);
  if (checkinEm) degradado.checkinEm = checkinEm;
  // Alvos de busca do organizador (RN-397/RN-475): com eles fora, a pessoa
  // some da busca por código e o balcão não a acha nem sabendo o número.
  if (isCodigoIngressoValido(raw['codigoIngresso'])) {
    degradado.codigoIngresso = raw['codigoIngresso'];
  }
  if (isCodigoPedidoValido(raw['codigoPedido'])) {
    degradado.codigoPedido = raw['codigoPedido'];
  }

  return degradado;
}

/**
 * Parse de UM doc de uma LISTA de inscritos: fail-fast primeiro, resgate
 * degradado depois (F1). Nunca lança — é o caminho que mantém a lista viva.
 * `origem` nomeia o reader na telemetria (o id do doc vai junto).
 */
function inscritoDaLista(
  origem: string,
  id: string,
  raw: Record<string, unknown>
): Inscrito {
  try {
    return parseInscrito(id, raw);
  } catch (err) {
    console.error(
      `[${origem}] inscrito "${id}" corrompido — placeholder degradado (F1)`,
      err
    );
    return inscritoDegradado(id, raw);
  }
}

/**
 * Cursor opaco de paginação — snapshot do último doc da página anterior.
 * O chamador NÃO inspeciona; só repassa em `listarInscritos`.
 */
export type InscritosCursor = QueryDocumentSnapshot;

/** Resultado de uma página de inscritos */
export interface ListarInscritosResult {
  itens: Inscrito[];
  /** null quando não há próxima página */
  proxCursor: InscritosCursor | null;
}

/** Opções da listagem paginada */
export interface ListarInscritosOptions {
  cursor?: InscritosCursor;
  /** Default 18 (INSCRITOS_PAGE_SIZE) */
  pageSize?: number;
}

/**
 * Lista inscritos de um evento em páginas de cursor estável.
 *
 * Ordena por `atletaNome` (o Firestore desempata internamente por docId,
 * o que mantém o cursor estável mesmo com nomes repetidos).
 *
 * `proxCursor` volta `null` quando a página vem menor que `pageSize`
 * (fim da lista). 453 inscritos → 3 páginas (2×200 + 53).
 */
export async function listarInscritos(
  db: Firestore,
  eventoId: string,
  options: ListarInscritosOptions = {}
): Promise<ListarInscritosResult> {
  const { cursor, pageSize = INSCRITOS_PAGE_SIZE } = options;

  const constraints: QueryConstraint[] = [
    orderBy('atletaNome', 'asc'),
    firestoreLimit(pageSize),
  ];
  if (cursor) {
    constraints.splice(1, 0, startAfter(cursor));
  }

  const snap = await getDocs(
    query(collection(db, 'eventos', eventoId, 'inscritos'), ...constraints)
  );

  const itens = snap.docs.map((d) => inscritoDaLista('listarInscritos', d.id, d.data()));
  const ultimo = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
  const proxCursor = snap.docs.length === pageSize && ultimo ? ultimo : null;

  return { itens, proxCursor };
}

/**
 * Lista os `limite` inscritos MAIS RECENTES do evento (por `criadoEm` DESC).
 *
 * Contrato SEPARADO de `listarInscritos` de propósito: aquela ordena por
 * `atletaNome` (cursor estável da tela de Inscritos), então um `limit` traz os
 * primeiros do ALFABETO — errado para "atividade recente". Aqui o `limit` cai
 * sobre os inscritos mais novos, que é o que o feed do Overview precisa.
 * Sem cursor: o teto é pequeno (~6 itens do card), não há paginação.
 *
 * `criadoEm` é o ÚNICO campo do `orderBy` → índice single-field automático do
 * Firestore cobre a query; nenhum índice composto é necessário. Reusa
 * `parseInscrito` (fonte única de parsing defensivo) com o mesmo resgate F1
 * das outras listagens — o feed de atividade recente do Overview não pode
 * morrer inteiro por causa da última inscrição fora do shape.
 */
export async function listarInscritosRecentes(
  db: Firestore,
  eventoId: string,
  limite = INSCRITOS_PAGE_SIZE
): Promise<Inscrito[]> {
  const snap = await getDocs(
    query(
      collection(db, 'eventos', eventoId, 'inscritos'),
      orderBy('criadoEm', 'desc'),
      firestoreLimit(limite)
    )
  );

  return snap.docs.map((d) => inscritoDaLista('listarInscritosRecentes', d.id, d.data()));
}

/** Handlers do observador realtime (onSnapshot) — next a cada mudança, error 1x. */
export interface ObservarInscritosHandlers {
  next: (itens: Inscrito[]) => void;
  error?: (err: Error) => void;
}

/**
 * OBSERVA o POOL de inscritos do evento em TEMPO REAL (`inscritos`, ordenado por
 * `atletaNome`, teto `INSCRITOS_BALCAO_CAP`). Superfície VIVA do balcão (S204,
 * UX-DADOS): dois operadores no balcão veem o check-in/vínculo de chip um do
 * outro sem recarregar. Reusa `parseInscrito` (fonte única de parsing). Um
 * ÚNICO listener sobre a coleção ordenada — vivo só enquanto o balcão está
 * montado (o custo de listener é pago onde ele importa). Devolve o
 * `Unsubscribe` para o cleanup do caller.
 *
 * ⛔ O `next` do onSnapshot NUNCA pode lançar (INSCRITOS-READ-FIX · 17/08). O
 * callback roda dentro do SDK, e o `error` do onSnapshot só é chamado por erro
 * de TRANSPORTE — uma exceção aqui dentro escapava sem passar por ele. Efeito
 * observado no balcão: `next` nunca chegava, `loading` nunca virava, e a tela
 * ficava em dois skeletons PARA SEMPRE, sem erro nenhum. Skeleton eterno é
 * pior que erro: o erro tem saída, o skeleton não conta ao operador que a fila
 * dele parou. Por isso o corpo inteiro vai para dentro do try — o resgate F1
 * já impede a falha de parse, e o catch é a rede para tudo que vier depois.
 */
export function observarInscritos(
  db: Firestore,
  eventoId: string,
  handlers: ObservarInscritosHandlers
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, 'eventos', eventoId, 'inscritos'),
      orderBy('atletaNome', 'asc'),
      firestoreLimit(INSCRITOS_BALCAO_CAP)
    ),
    (snap) => {
      try {
        handlers.next(
          snap.docs.map((d) => inscritoDaLista('observarInscritos', d.id, d.data()))
        );
      } catch (err) {
        handlers.error?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (err) => handlers.error?.(err)
  );
}
