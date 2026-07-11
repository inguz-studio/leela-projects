// =============================================================================
// packages/core/src/eventos/lote.ts
//
// Entidade Lote — domínio puro (LEELA-S300-T1 · E04).
// Subcoleção: `eventos/{eventoId}/lotes/{loteId}` — tenant-scoped (ADR-009).
//
// ADR-012 (travado 2026-07-11): o LOTE PERTENCE À MODALIDADE. Cada
// modalidade/percurso do evento tem uma lista ORDENADA de lotes; cada lote
// carrega janela própria (`inicioEm`/`fimEm`), vaga própria
// (`quantidadeLimite`), `preco` e `ordem`. A virada (RN-300) opera na
// granularidade (modalidade, lote): `agora ≥ fimEm` OU `vendidos ≥
// quantidadeLimite`, o que ocorrer primeiro. Preço vigente (RN-301) = lote
// ativo daquela modalidade.
//
// FRONTEIRA FIRESTORE (decisão Kleppmann — registrada no S300-T1-REPORT):
// o lote é DOCUMENTO próprio numa subcoleção flat `eventos/{id}/lotes`, com
// `modalidade` como discriminador (mesmo idioma de `evento.modalidades[]` e
// `inscrito.modalidade`) — NÃO embutido no doc grande do evento nem numa
// subcoleção aninhada `modalidades/{id}/lotes`. Razão: `vendidos` é contador
// de ESCRITA DE ALTA FREQUÊNCIA (Function de virada, S300-T2, um increment
// por venda). Doc próprio → o increment é single-object linearizable
// (FieldValue.increment) e contende só com vendas do MESMO lote; embutir num
// array do evento acoplaria toda venda à reescrita do doc gordo (leitura
// amplificada no checkout + risco de lost-update sem transação no array). A
// relação ADR-012 "modalidade 1—N lotes" é a query
// `where modalidade == X orderBy ordem` — a lista ordenada é derivada, não
// materializada. "Data outlives code": o contador quente mora sozinho.
//
// `vendidos` = ∑ contador de ESCRITA EXCLUSIVA de Cloud Function (S300-T2) —
// o cliente NUNCA o escreve (Security Rules negam; espelha CAMPOS_FUNCTION_*).
// O "lote ativo" da modalidade é DERIVADO (loteAtivo), não persistido: estado
// que se computa não se denormaliza.
// =============================================================================

import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Lote de venda — pertence a uma modalidade (ADR-012).
 * Subcoleção: `eventos/{eventoId}/lotes/{loteId}`.
 */
export interface Lote {
  id: string;
  /** Propagado do evento pai — isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /**
   * Modalidade/percurso dona do lote (ADR-012). Discriminador do join —
   * mesmo idioma de `evento.modalidades[]` e `inscrito.modalidade`
   * (ex.: '5k', '10k', '21k'). A lista ordenada de lotes da modalidade é a
   * query `where modalidade == X orderBy ordem`.
   */
  modalidade: string;
  /** Posição na sequência da modalidade (int ≥ 1, única por modalidade). */
  ordem: number;
  /** Nome exibido ("Lote 1", "Lote Promocional"). */
  nome: string;
  /** Início da janela de venda do lote. */
  inicioEm: Timestamp;
  /** Fim da janela de venda do lote (fimEm > inicioEm). */
  fimEm: Timestamp;
  /** Vaga própria do lote — int ≥ 1 (base da virada por quantidade, RN-300). */
  quantidadeLimite: number;
  /** Preço da inscrição neste lote em R$ — ≥ 0 (lote é degrau de preço, não desconto). */
  preco: number;
  /**
   * ∑ Vendas registradas no lote — escrita EXCLUSIVA de Cloud Function
   * (S300-T2). Base da virada por quantidade (RN-300). Cliente nunca escreve.
   */
  vendidos: number;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/**
 * Campos do lote com escrita EXCLUSIVA de Cloud Function — o contador de
 * venda (`vendidos`) é mantido pela Function de virada (S300-T2). As Security
 * Rules espelham esta lista: create exige 0/ausente, update não pode tocá-lo.
 */
export const CAMPOS_FUNCTION_LOTE = ['vendidos'] as const;

// ---------------------------------------------------------------------------
// Validações puras (shape de um lote isolado)
// ---------------------------------------------------------------------------

/** Millis de um Timestamp estrutural (firebase/admin ou mock de teste). @pure */
function millis(ts: Timestamp): number {
  return ts.toMillis();
}

/**
 * O shape de um lote é válido? (fimEm > inicioEm; quantidadeLimite int ≥ 1;
 * preco número ≥ 0; ordem int ≥ 1; nome/modalidade não-vazios). @pure
 */
export function loteShapeValido(
  lote: Pick<
    Lote,
    'modalidade' | 'ordem' | 'nome' | 'inicioEm' | 'fimEm' | 'quantidadeLimite' | 'preco'
  >
): boolean {
  return (
    typeof lote.modalidade === 'string' &&
    lote.modalidade.length > 0 &&
    typeof lote.nome === 'string' &&
    lote.nome.length > 0 &&
    Number.isInteger(lote.ordem) &&
    lote.ordem >= 1 &&
    Number.isInteger(lote.quantidadeLimite) &&
    lote.quantidadeLimite >= 1 &&
    typeof lote.preco === 'number' &&
    Number.isFinite(lote.preco) &&
    lote.preco >= 0 &&
    millis(lote.fimEm) > millis(lote.inicioEm)
  );
}

// ---------------------------------------------------------------------------
// Validações de LISTA (invariantes cross-doc — a Rule não itera irmãos)
// ---------------------------------------------------------------------------

/**
 * Valida os invariantes de uma sequência de lotes de UM evento, agrupando por
 * modalidade (ADR-012): dentro de cada modalidade, `ordem` é única, as janelas
 * NÃO se sobrepõem e a ordem cronológica bate com `ordem`.
 *
 * DECISÃO (registrada): janelas de lotes de uma MESMA modalidade não se
 * sobrepõem — a virada RN-300 é um hand-off (Lote 1 termina → Lote 2 começa) e
 * "preço vigente" (RN-301) precisa do invariante "no máximo um lote ativo por
 * modalidade por instante". Lacunas (pausa de venda) são permitidas; a virada
 * por quantidade (vendidos ≥ limite) só encerra ANTES do fim, nunca cria
 * sobreposição. Sobreposição tornaria o preço vigente ambíguo.
 *
 * Cross-doc por natureza (unicidade/sobreposição olham irmãos) → vive aqui, no
 * editor/Function/seed, não nas Rules (que não iteram coleções).
 *
 * @returns `null` quando válido; a 1ª mensagem de erro caso contrário. @pure
 */
export function validarLotesModalidade(
  lotes: readonly Pick<Lote, 'modalidade' | 'ordem' | 'inicioEm' | 'fimEm'>[]
): string | null {
  const porModalidade = new Map<
    string,
    Pick<Lote, 'modalidade' | 'ordem' | 'inicioEm' | 'fimEm'>[]
  >();
  for (const lote of lotes) {
    const grupo = porModalidade.get(lote.modalidade) ?? [];
    grupo.push(lote);
    porModalidade.set(lote.modalidade, grupo);
  }

  for (const [modalidade, grupo] of porModalidade) {
    const ordens = new Set<number>();
    for (const lote of grupo) {
      if (ordens.has(lote.ordem)) {
        return `Modalidade "${modalidade}": ordem ${lote.ordem} duplicada (ADR-012)`;
      }
      ordens.add(lote.ordem);
    }

    // Ordena por `ordem` e verifica hand-off cronológico + não-sobreposição.
    const porOrdem = [...grupo].sort((a, b) => a.ordem - b.ordem);
    for (let i = 1; i < porOrdem.length; i++) {
      const anterior = porOrdem[i - 1]!;
      const atual = porOrdem[i]!;
      // Sobreposição: anterior.inicio < atual.fim && atual.inicio < anterior.fim
      if (
        millis(anterior.inicioEm) < millis(atual.fimEm) &&
        millis(atual.inicioEm) < millis(anterior.fimEm)
      ) {
        return `Modalidade "${modalidade}": lotes ${anterior.ordem} e ${atual.ordem} têm janelas sobrepostas (RN-300)`;
      }
      // Cronologia coerente com a ordem: lote de ordem maior não começa antes
      // do fim do de ordem menor (a sequência avança no tempo).
      if (millis(atual.inicioEm) < millis(anterior.fimEm)) {
        return `Modalidade "${modalidade}": lote ${atual.ordem} começa antes do fim do lote ${anterior.ordem} (RN-300)`;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Derivações puras — virada RN-300 / preço vigente RN-301
// ---------------------------------------------------------------------------

/** Lote esgotado por quantidade? (vendidos ≥ limite — metade da RN-300) @pure */
export function loteEsgotado(lote: Pick<Lote, 'vendidos' | 'quantidadeLimite'>): boolean {
  return lote.vendidos >= lote.quantidadeLimite;
}

/**
 * Lote ENCERRADO no instante `agora`? (RN-300 — virada por data OU quantidade,
 * o que ocorrer primeiro). Derivação pura da elegibilidade de virada que a
 * Function de S300-T2 materializa. @pure
 */
export function loteEncerrado(
  lote: Pick<Lote, 'fimEm' | 'vendidos' | 'quantidadeLimite'>,
  agora: Date
): boolean {
  return agora.getTime() >= millis(lote.fimEm) || loteEsgotado(lote);
}

/**
 * Lote VIGENTE no instante `agora`? (janela começou E ainda não encerrou por
 * data/quantidade). @pure
 */
export function loteVigente(
  lote: Pick<Lote, 'inicioEm' | 'fimEm' | 'vendidos' | 'quantidadeLimite'>,
  agora: Date
): boolean {
  return agora.getTime() >= millis(lote.inicioEm) && !loteEncerrado(lote, agora);
}

/**
 * O lote ATIVO de uma modalidade no instante `agora` — o vigente de menor
 * `ordem` (com janelas não-sobrepostas há no máximo um; o menor-ordem desempata
 * defensivamente). `null` quando nenhum lote está vigente (antes do 1º início,
 * numa lacuna, ou depois do último). @pure
 */
export function loteAtivo<
  T extends Pick<Lote, 'ordem' | 'inicioEm' | 'fimEm' | 'vendidos' | 'quantidadeLimite'>,
>(lotesDaModalidade: readonly T[], agora: Date): T | null {
  let ativo: T | null = null;
  for (const lote of lotesDaModalidade) {
    if (loteVigente(lote, agora) && (ativo === null || lote.ordem < ativo.ordem)) {
      ativo = lote;
    }
  }
  return ativo;
}

/**
 * Preço VIGENTE de uma modalidade (RN-301 evoluído por ADR-012).
 *
 * EVOLUÇÃO DE `PercursoEvento` (registrada): o preço vigente deriva do LOTE
 * ATIVO da modalidade. `PercursoEvento.preco` (S201) permanece como preço-base
 * LEGADO/fallback — eventos sem lotes configurados (legado/seed) continuam
 * lendo `percurso.preco`. Schema evolution backward-compatible (Kleppmann):
 * o campo antigo não é removido e readers antigos não quebram; o novo caminho
 * (lote) tem precedência quando existe.
 *
 * @returns preço do lote ativo; senão `precoLegado` (fallback); senão `null`. @pure
 */
export function precoVigente(params: {
  lotesDaModalidade: readonly Pick<
    Lote,
    'ordem' | 'inicioEm' | 'fimEm' | 'vendidos' | 'quantidadeLimite' | 'preco'
  >[];
  agora: Date;
  precoLegado?: number;
}): number | null {
  const ativo = loteAtivo(params.lotesDaModalidade, params.agora);
  if (ativo !== null) return ativo.preco;
  return params.precoLegado ?? null;
}

// ---------------------------------------------------------------------------
// Parse fail-fast (borda de I/O do Firestore)
// ---------------------------------------------------------------------------

/** Parsing defensivo de um doc Firestore em `Lote` (fail-fast). @pure */
export function parseLote(id: string, data: Record<string, unknown>): Lote {
  const tenantId = data['tenantId'];
  const modalidade = data['modalidade'];
  const ordem = data['ordem'];
  const nome = data['nome'];
  const inicioEm = data['inicioEm'];
  const fimEm = data['fimEm'];
  const quantidadeLimite = data['quantidadeLimite'];
  const preco = data['preco'];
  const vendidos = data['vendidos'];

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`Lote ${id}: campo "tenantId" inválido (ADR-009)`);
  }
  if (typeof modalidade !== 'string' || modalidade.length === 0) {
    throw new Error(`Lote ${id}: campo "modalidade" inválido (ADR-012)`);
  }
  if (typeof nome !== 'string' || nome.length === 0) {
    throw new Error(`Lote ${id}: campo "nome" inválido`);
  }
  if (!Number.isInteger(ordem) || (ordem as number) < 1) {
    throw new Error(`Lote ${id}: "ordem" deve ser inteiro ≥ 1 (ADR-012)`);
  }
  if (!Number.isInteger(quantidadeLimite) || (quantidadeLimite as number) < 1) {
    throw new Error(`Lote ${id}: "quantidadeLimite" deve ser inteiro ≥ 1 (RN-300)`);
  }
  if (typeof preco !== 'number' || !Number.isFinite(preco) || preco < 0) {
    throw new Error(`Lote ${id}: "preco" deve ser número ≥ 0 (RN-301)`);
  }
  if (!isTimestampLike(inicioEm) || !isTimestampLike(fimEm)) {
    throw new Error(`Lote ${id}: "inicioEm"/"fimEm" devem ser Timestamp`);
  }
  if (fimEm.toMillis() <= inicioEm.toMillis()) {
    throw new Error(`Lote ${id}: "fimEm" deve ser depois de "inicioEm" (janela RN-300)`);
  }
  // vendidos é ∑ de Function — ausente em doc recém-criado normaliza para 0;
  // presente e inválido lança (contador corrompido é dado financeiro).
  if (vendidos !== undefined && (typeof vendidos !== 'number' || !Number.isInteger(vendidos) || vendidos < 0)) {
    throw new Error(`Lote ${id}: "vendidos" deve ser inteiro ≥ 0 (∑ de Function)`);
  }

  return {
    id,
    tenantId,
    modalidade,
    ordem: ordem as number,
    nome,
    inicioEm,
    fimEm,
    quantidadeLimite: quantidadeLimite as number,
    preco,
    vendidos: typeof vendidos === 'number' ? vendidos : 0,
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };
}

/** Guard estrutural mínimo de Timestamp (tem toMillis()). @pure */
function isTimestampLike(value: unknown): value is Timestamp {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as Partial<Timestamp>).toMillis === 'function'
  );
}
