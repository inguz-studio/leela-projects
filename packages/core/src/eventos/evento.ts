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
// Import de tipo + guard puro — repasse-types não tem dependência de runtime
// (só type-imports), então não há ciclo de módulos eventos↔finance.
import { isModoTaxa, type ModoTaxa } from '../finance/repasse-types';
import { isJanelaEntrega, ordenarJanelasEntrega, type JanelaEntrega } from './cronogramaEntrega';
import { dataLocalISO } from './dataEvento';
import { isExigenciasSaude, type ExigenciasSaude } from './exigenciasSaude';
import { isFaixaChips, type FaixaChips } from './faixaChips';

// ---------------------------------------------------------------------------
// Capa e regulamento (RN-153 · cadastro completo) — limites e guarda de URL
// ---------------------------------------------------------------------------

/** Teto da URL de capa (anti doc-bomba; URLs reais ficam bem abaixo). */
export const IMAGEM_URL_MAX = 2048;

/** Teto do texto do regulamento (anti doc-bomba; doc Firestore é 1 MiB). */
export const REGULAMENTO_MAX = 50_000;

/**
 * URL de capa VÁLIDA: string http(s) parseável, host presente, ≤ 2048 chars.
 * Rejeita `javascript:`, `data:`, `file:` e afins — a capa vira `src` de
 * `<img>` na landing pública; esquema fora de http(s) nunca passa desta
 * fronteira (defesa em profundidade com as Rules e com `criarEvento`).
 * @pure
 */
export function isUrlCapaValida(url: unknown): url is string {
  if (typeof url !== 'string' || url.length === 0 || url.length > IMAGEM_URL_MAX) {
    return false;
  }
  // Prefiltro: espaço/controle dentro da URL não passa (URL() aceitaria
  // alguns e "consertaria" outros — aqui a política é estrita).
  if (/\s/.test(url)) return false;
  try {
    // O tipo global de URL do React Native não declara `protocol`/`hostname`
    // (a implementação do RN é parcial e esses getters lançam em runtime) —
    // sem a asserção, o type-check do mobile falha ao compilar este arquivo.
    // O acesso fica dentro do try de propósito: em RN cai no catch e devolve
    // false; em web/Node (DOM/undici) os campos existem e o tipo é fiel.
    const parsed = new URL(url) as URL & { protocol: string; hostname: string };
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.hostname.length > 0
    );
  } catch {
    return false;
  }
}

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
   * URL da imagem de capa do evento (media 16/10 do card e hero da landing).
   * OPCIONAL: eventos sem imagem caem no gradiente semantic do CardEvento/
   * HeroCover (fallback). `parseEvento` normaliza para URL http(s) VÁLIDA
   * (`isUrlCapaValida`) ou `undefined` (nunca string vazia, nunca esquema
   * fora de http(s) — a capa vira `src` de `<img>` público) — a UI decide
   * entre `<img>` e gradiente por presença. RN-153.
   */
  imagemUrl?: string;
  /**
   * Texto do regulamento da prova (RN-153 · cadastro completo). OPCIONAL —
   * eventos legados não têm; `parseEvento` normaliza para string não-vazia
   * ou `undefined`. Teto de escrita = REGULAMENTO_MAX (Rules + criarEvento).
   * VERSIONAMENTO (RN-149: nova versão ⇒ novo aceite, `regulamentoVersao`)
   * é do S306/Onda 3 — aqui vive SÓ a persistência do texto; a integração
   * pendente está registrada no épico E04 §LEELA-S306.
   */
  regulamento?: string;
  /**
   * S306-T1 (RN-149) — versão VIGENTE do regulamento. MONOTÔNICA, escrita
   * EXCLUSIVA server-side (versionarRegulamento bumpa quando o texto muda;
   * Rules congelam para cliente). Ausente/0 = sem regulamento publicado.
   * Aceite por inscrito vive em `inscritos/{id}.regulamentoAceite` (E12-S1207).
   */
  regulamentoVersao?: number;
  /** Carimbo da última publicação de versão (S306-T1 · RN-149). */
  regulamentoAtualizadoEm?: Timestamp;
  /**
   * S306-T1 (RN-146) — flags de exigência de saúde (atestado/PAR-Q), ambas
   * default OFF (minimização LGPD). Ausente = nada exigido. O dado coletado
   * vive ISOLADO em `inscritos/{id}/saude/{current}` (RN-147 · Art. 11).
   */
  exigenciasSaude?: ExigenciasSaude;
  /**
   * RN-347 — modo da taxa da plataforma POR EVENTO:
   *   'incorporada' — comprador paga o face; a taxa sai do repasse;
   *   'repassada'   — comprador paga face + taxa; líquido do produtor = face.
   * OPCIONAL na entidade (eventos legados não têm) — consumidores leem via
   * `modoTaxaDoEvento` (ausente ⇒ 'incorporada', comportamento vigente).
   * Nasce do default do tenant (`commercialTerms.modoTaxaDefault`) em
   * `criarEvento` e CONGELA junto dos campos comerciais após a 1ª venda
   * (Rules — mudar quem paga a taxa com venda feita mexe em dinheiro).
   */
  taxaModo?: ModoTaxa;
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
  /**
   * Modo de venda "somente via cupom" — evento FECHADO (RN-303 · S1804 ·
   * benchmark TicketSports): quando `true`, o checkout público só aceita
   * inscrição COM cupom válido (o guard vive em `carregarInsumos` — servidor,
   * nunca só UI). OPCIONAL na entidade (eventos legados não têm):
   * `parseEvento` só materializa quando o doc traz `true` LITERAL — ausente/
   * false/lixo ⇒ campo omitido = venda aberta (comportamento vigente). A
   * direção do default é deliberada: lixo no flag NUNCA fecha um evento à
   * venda nem abre um evento fechado por engano do lado do servidor — quem
   * fecha é o organizador escrevendo `true` (Rules gated).
   */
  vendaSomentePorCupom?: boolean;
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
 * Modo da taxa EFETIVO do evento (RN-347): campo do doc quando presente,
 * senão 'incorporada' (MODO_TAXA_DEFAULT — comportamento vigente pré-toggle).
 * Acessor canônico dos consumidores (E09 saldo, agregado financeiro,
 * checkout E12) — nunca leia `taxaModo` cru com fallback próprio.
 * @pure
 */
export function modoTaxaDoEvento(evento: Pick<Evento, 'taxaModo'>): ModoTaxa {
  return evento.taxaModo ?? 'incorporada';
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

  // Imagem de capa: URL http(s) VÁLIDA ou omitida (nunca string vazia — a UI
  // usa presença para escolher entre <img> e o gradiente de fallback).
  // Esquema fora de http(s) (javascript:, data:, …) é DESCARTADO na leitura
  // (fallback gradiente), não lançado: capa ruim não pode derrubar a página
  // pública inteira — as fronteiras de ESCRITA (Rules + criarEvento) barram.
  const imagemUrlRaw = data['imagemUrl'];
  const imagemUrl = isUrlCapaValida(imagemUrlRaw) ? imagemUrlRaw : undefined;

  // Regulamento (RN-153): texto não-vazio ou omitido. Leitura tolerante —
  // o teto REGULAMENTO_MAX é aplicado nas fronteiras de escrita.
  const regulamentoRaw = data['regulamento'];
  const regulamento =
    typeof regulamentoRaw === 'string' && regulamentoRaw.length > 0
      ? regulamentoRaw
      : undefined;

  // Modo da taxa (RN-347): ausente/null → undefined (legado — consumidores
  // usam modoTaxaDoEvento, default 'incorporada'); presente e FORA do enum
  // lança (fail-fast — campo de dinheiro corrompido precisa gritar na borda
  // de I/O, mesmo racional de faixaChips; Rules/Functions impedem lixo).
  const taxaModoRaw = data['taxaModo'];
  let taxaModo: ModoTaxa | undefined;
  if (taxaModoRaw !== undefined && taxaModoRaw !== null) {
    if (!isModoTaxa(taxaModoRaw)) {
      throw new Error(
        `Evento ${id}: campo "taxaModo" fora do enum ` +
          `('incorporada' | 'repassada' — RN-347)`
      );
    }
    taxaModo = taxaModoRaw;
  }

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
    // Só entram quando presentes (exactOptionalPropertyTypes: nunca `undefined`).
    ...(imagemUrl !== undefined ? { imagemUrl } : {}),
    ...(regulamento !== undefined ? { regulamento } : {}),
    // S306 (RN-149/146): versão de regulamento (int > 0 ou omitida) +
    // exigências de saúde (shape exato ou omitida — lixo NUNCA liga coleta
    // de dado sensível: mesma direção defensiva do vendaSomentePorCupom).
    ...(typeof data['regulamentoVersao'] === 'number' &&
    Number.isInteger(data['regulamentoVersao']) &&
    (data['regulamentoVersao'] as number) > 0
      ? { regulamentoVersao: data['regulamentoVersao'] as number }
      : {}),
    ...(data['regulamentoAtualizadoEm'] != null
      ? { regulamentoAtualizadoEm: data['regulamentoAtualizadoEm'] as Timestamp }
      : {}),
    ...(isExigenciasSaude(data['exigenciasSaude'])
      ? { exigenciasSaude: data['exigenciasSaude'] }
      : {}),
    ...(taxaModo !== undefined ? { taxaModo } : {}),
    // Cupom-only (RN-303): só `true` LITERAL liga o modo (ver doc do campo).
    ...(data['vendaSomentePorCupom'] === true ? { vendaSomentePorCupom: true } : {}),
  };
}

/**
 * Modo cupom-only EFETIVO do evento (RN-303 · S1804): `true` só quando o
 * organizador ligou o flag. Acessor canônico — o guard do checkout
 * (`carregarInsumos`) e a UI usam ESTE, nunca o campo cru.
 * @pure
 */
export function vendaSomentePorCupomAtiva(
  evento: Pick<Evento, 'vendaSomentePorCupom'>
): boolean {
  return evento.vendaSomentePorCupom === true;
}

/** Mensagem canônica do checkout fechado sem cupom (RN-303 — copy honesta). */
export const MSG_EVENTO_FECHADO_SEM_CUPOM =
  'Evento fechado — informe seu cupom para se inscrever.';
