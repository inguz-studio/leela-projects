// =============================================================================
// packages/core/src/eventos/evento.ts
//
// Entidade Evento — domínio puro (LEELA-S200-T1 · E03).
// Coleção: `eventos/{eventoId}` (docId = slug) — tenant-scoped (ADR-009).
//
// Agregados ∑ (`qtdInscritos`, `receitaConfirmada`) são mantidos por Cloud
// Function e NUNCA escritos pelo cliente — as Security Rules negam.
// Ref: leela-specs/modelo-de-dados-firestore.md · RN-200/201.
// =============================================================================

import type { Timestamp } from '../index';
import { isJanelaEntrega, ordenarJanelasEntrega, type JanelaEntrega } from './cronogramaEntrega';
import { dataLocalISO } from './dataEvento';
import { isFaixaChips, type FaixaChips } from './faixaChips';

// ---------------------------------------------------------------------------
// Status do ciclo de vida
// ---------------------------------------------------------------------------

/** Status do ciclo de vida de um evento */
export type StatusEvento = 'rascunho' | 'publicado' | 'ao_vivo' | 'encerrado';

/** Lista canônica de status — única fonte para validação/UI */
export const STATUS_EVENTO: readonly StatusEvento[] = [
  'rascunho',
  'publicado',
  'ao_vivo',
  'encerrado',
];

/** Type guard de StatusEvento (parsing de dados vindos do Firestore) */
export function isStatusEvento(value: unknown): value is StatusEvento {
  return (
    typeof value === 'string' && (STATUS_EVENTO as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Percurso do evento com preço independente (S201-T1/T2).
 * Preço em reais, ≥ 0. Após a 1ª venda, `percursos` fica IMUTÁVEL para o
 * cliente (RN-200 — o preço faz parte do percurso; Rules travam o array).
 */
export interface PercursoEvento {
  nome: string;
  preco: number;
}

/** Type guard de PercursoEvento (parsing de dados vindos do Firestore). */
export function isPercursoEvento(value: unknown): value is PercursoEvento {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p['nome'] === 'string' &&
    p['nome'].length > 0 &&
    typeof p['preco'] === 'number' &&
    Number.isFinite(p['preco']) &&
    p['preco'] >= 0
  );
}

/**
 * Evento de corrida — tenant-scoped.
 * Coleção: `eventos/{eventoId}` (docId = slug).
 * Subcoleções: inscritos, kits, programaAfiliacao, politicaVendas, etc.
 */
export interface Evento {
  /** docId = slug */
  id: string;
  /** Isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /** Referência ao profissional organizador */
  organizadorId: string;
  nome: string;
  data: Timestamp;
  local: string;
  /** Lista de percursos/modalidades do evento */
  modalidades: string[];
  /**
   * Percursos com preço independente (S201-T1/T2). OPCIONAL na entidade:
   * eventos legados/seed/mocks não têm — `parseEvento` SEMPRE normaliza
   * para [] (docs vindos do Firestore nunca chegam undefined). Ver RN-200.
   */
  percursos?: PercursoEvento[];
  slug: string;
  status: StatusEvento;
  /** Usa chip de cronometragem (RN-207) */
  usaChip: boolean;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  /**
   * URL da imagem de capa do evento (media 16/10 do card). OPCIONAL:
   * eventos sem imagem caem no gradiente semantic do CardEvento (fallback).
   * `parseEvento` normaliza para `string` não-vazia ou `undefined` (nunca
   * string vazia) — a UI decide entre `<img>` e gradiente por presença.
   */
  imagemUrl?: string;
  /** Agregado ∑ — mantido por Cloud Function */
  qtdInscritos: number;
  /** Agregado ∑ financeiro confirmado — mantido por Cloud Function */
  receitaConfirmada: number;
  /**
   * Capacidade direta do evento (total de vagas). OPCIONAL na entidade
   * (mocks/literais legados não têm — padrão `percursos`): `parseEvento`
   * SEMPRE normaliza para `number > 0` ou `null` (desconhecida). A resolução
   * canônica evento|Σkits (RN-210) continua server-side — este campo espelha
   * apenas a leitura direta do doc, base do ratio 453/500 nas telas E02/E03.
   */
  capacidade?: number | null;
  /**
   * Cronograma de entrega de kits (FABLE-F-T1 · S204/FRENTE F): janelas por
   * dia/horário/local, embutidas no doc. OPCIONAL na entidade (eventos
   * legados não têm): `parseEvento` SEMPRE normaliza para [] e devolve na
   * ordem canônica (dia, horaInicio). Janela MALFORMADA presente lança
   * (fail-fast — janela silenciosamente descartada mostraria "fechada"
   * durante a entrega real; diferente de `percursos`, que descarta item).
   * Janela cujo dia civil é DEPOIS da prova também lança (não existe entrega
   * de kit após a corrida — o dia da prova é válido: retirada tardia).
   */
  janelasEntrega?: JanelaEntrega[];
  /**
   * Faixa numérica do lote de chips (FABLE-F-T1): base dos alertas de
   * estoque/fora-da-faixa do balcão. OPCIONAL: `parseEvento` normaliza para
   * `FaixaChips` ou `null` (não configurada); shape malformado presente
   * lança (fail-fast — mesmo racional do cronograma).
   */
  faixaChips?: FaixaChips | null;
}

/**
 * Campos agregados ∑ do evento — escrita EXCLUSIVA de Cloud Function.
 * As Security Rules usam esta mesma lista (espelhada em firestore.rules).
 */
export const CAMPOS_AGREGADOS_EVENTO = ['qtdInscritos', 'receitaConfirmada'] as const;

// ---------------------------------------------------------------------------
// Derivações puras
// ---------------------------------------------------------------------------

/**
 * Há venda registrada? (base da RN-200 — bloqueio de preço após 1ª venda).
 * Deriva do agregado ∑ `qtdInscritos` mantido por Function.
 * @pure
 */
export function temVenda(evento: Pick<Evento, 'qtdInscritos'>): boolean {
  return evento.qtdInscritos > 0;
}

/**
 * Evento visível ao público (página de vendas ativa)?
 * @pure
 */
export function eventoPublico(status: StatusEvento): boolean {
  return status === 'publicado' || status === 'ao_vivo';
}

/**
 * Faz o parsing defensivo de um doc Firestore em `Evento`.
 * Lança `Error` descritivo quando o shape é inválido — nunca devolve
 * um objeto parcialmente válido (fail-fast na borda de I/O).
 *
 * Agregados ausentes entram como 0 (docs recém-criados pela Function
 * `criarEvento` ainda não passaram pelo onWrite de agregados).
 * @pure
 */
export function parseEvento(id: string, data: Record<string, unknown>): Evento {
  const nome = data['nome'];
  const tenantId = data['tenantId'];
  const organizadorId = data['organizadorId'];
  const local = data['local'];
  const slug = data['slug'];
  const status = data['status'];
  const usaChip = data['usaChip'];
  const modalidades = data['modalidades'];

  if (typeof nome !== 'string' || nome.length === 0) {
    throw new Error(`Evento ${id}: campo "nome" inválido`);
  }
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`Evento ${id}: campo "tenantId" inválido (ADR-009)`);
  }
  if (typeof organizadorId !== 'string' || organizadorId.length === 0) {
    throw new Error(`Evento ${id}: campo "organizadorId" inválido`);
  }
  if (!isStatusEvento(status)) {
    throw new Error(`Evento ${id}: status "${String(status)}" fora do enum`);
  }
  if (!Array.isArray(modalidades) || !modalidades.every((m) => typeof m === 'string')) {
    throw new Error(`Evento ${id}: campo "modalidades" inválido`);
  }

  const qtdInscritos = data['qtdInscritos'];
  const receitaConfirmada = data['receitaConfirmada'];

  // Percursos: eventos legados/seed não têm — normaliza para [] (nunca falha);
  // entradas malformadas são descartadas item a item (borda de I/O defensiva).
  const percursosRaw = data['percursos'];
  const percursos = Array.isArray(percursosRaw)
    ? percursosRaw.filter(isPercursoEvento)
    : [];

  // Capacidade direta do doc — mesma semântica da leitura direta de
  // `resolverCapacidade` (server): número finito > 0, senão null (desconhecida
  // — a UI degrada sem ratio/badge; nunca inventa capacidade). RN-210.
  const capacidadeRaw = data['capacidade'];
  const capacidade =
    typeof capacidadeRaw === 'number' &&
    Number.isFinite(capacidadeRaw) &&
    capacidadeRaw > 0
      ? capacidadeRaw
      : null;

  // Cronograma de entrega (FABLE-F-T1): ausente → [] (padrão `percursos`);
  // presente e MALFORMADO → lança. Fail-fast deliberado: uma janela inválida
  // descartada em silêncio derrubaria o banner "Entrega ativa · Dia N de M"
  // no dia do evento — corrupção operacional precisa gritar na borda de I/O.
  // Dia civil da prova (FUSO_EVENTO, DST-safe — mesma semântica de dataEvento.ts):
  // base do cruzamento que barra janela de entrega DEPOIS da corrida. Só
  // cruzável quando `data` é um Timestamp legível (docs legados sem data pulam
  // o cruzamento — o shape-level de cada janela já foi garantido acima).
  const dataProvaRaw = data['data'];
  const diaCivilProva =
    dataProvaRaw !== null &&
    typeof dataProvaRaw === 'object' &&
    typeof (dataProvaRaw as Partial<Timestamp>).toDate === 'function'
      ? dataLocalISO((dataProvaRaw as Timestamp).toDate())
      : null;

  const janelasRaw = data['janelasEntrega'];
  let janelasEntrega: JanelaEntrega[] = [];
  if (janelasRaw !== undefined && janelasRaw !== null) {
    if (!Array.isArray(janelasRaw)) {
      throw new Error(`Evento ${id}: campo "janelasEntrega" não é lista`);
    }
    janelasEntrega = ordenarJanelasEntrega(
      janelasRaw.map((j, i) => {
        if (!isJanelaEntrega(j)) {
          throw new Error(
            `Evento ${id}: janelasEntrega[${i}] inválida ` +
              `(dia yyyy-mm-dd, horas HH:mm com fim > início, local não-vazio)`
          );
        }
        // Fail-fast coerente com o resto do parse (as outras violações lançam):
        // janela cujo dia civil é DEPOIS da prova é corrupção operacional — o
        // banner contaria "Dia N de M" após a corrida. O dia da prova em si é
        // válido (retirada tardia na largada — só o estritamente-`>` é rejeitado).
        if (diaCivilProva !== null && j.dia > diaCivilProva) {
          throw new Error(
            `Evento ${id}: janelasEntrega[${i}] em ${j.dia} é depois da prova ` +
              `(${diaCivilProva}) — entrega de kit não acontece após o evento`
          );
        }
        return j;
      })
    );
  }

  // Faixa de chips (FABLE-F-T1): ausente/null → null (não configurada —
  // padrão `capacidade`); presente e malformada → lança (mesmo racional).
  const faixaRaw = data['faixaChips'];
  let faixaChips: FaixaChips | null = null;
  if (faixaRaw !== undefined && faixaRaw !== null) {
    if (!isFaixaChips(faixaRaw)) {
      throw new Error(
        `Evento ${id}: campo "faixaChips" inválido (ints ≥ 0 com fim ≥ início)`
      );
    }
    faixaChips = { inicio: faixaRaw.inicio, fim: faixaRaw.fim };
  }

  // Imagem de capa: string não-vazia ou omitida (nunca string vazia → a UI
  // usa presença para escolher entre <img> e o gradiente de fallback).
  const imagemUrlRaw = data['imagemUrl'];
  const imagemUrl =
    typeof imagemUrlRaw === 'string' && imagemUrlRaw.length > 0
      ? imagemUrlRaw
      : undefined;

  return {
    id,
    tenantId,
    organizadorId,
    nome,
    data: data['data'] as Timestamp,
    local: typeof local === 'string' ? local : '',
    modalidades,
    percursos,
    slug: typeof slug === 'string' && slug.length > 0 ? slug : id,
    status,
    usaChip: usaChip === true,
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
    qtdInscritos: typeof qtdInscritos === 'number' ? qtdInscritos : 0,
    receitaConfirmada: typeof receitaConfirmada === 'number' ? receitaConfirmada : 0,
    capacidade,
    janelasEntrega,
    faixaChips,
    // Só entra quando presente (exactOptionalPropertyTypes: nunca `undefined`).
    ...(imagemUrl !== undefined ? { imagemUrl } : {}),
  };
}
