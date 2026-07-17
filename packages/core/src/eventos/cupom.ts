// =============================================================================
// packages/core/src/eventos/cupom.ts
//
// Entidade Cupom — domínio puro (LEELA-S300-T1 · E04).
// Subcoleção: `eventos/{eventoId}/cupons/{cupomId}` — tenant-scoped (ADR-009).
//
// Um cupom tem CÓDIGO único por evento, tipo (percentual|fixo), valor, teto de
// uso e janela de validade. Aplicado no checkout (E12) — aqui é só o modelo.
//
// UNICIDADE POR CHAVE (decisão registrada): o docId do cupom É o código
// NORMALIZADO (trim + UPPER). O Firestore garante unicidade do docId nativamente
// — "código duplicado é rejeitado" vira colisão de docId (recriar o mesmo
// código cai na regra de UPDATE, que trava `codigo` imutável), sem precisar de
// query de duplicidade. Mesmo truque do `commercialTerms/v{n}`: empurrar o
// invariante para a chave e deixar o banco garantir (Kleppmann — "the devil is
// in the details": unicidade cross-doc não é exprimível em Rules com iteração,
// mas é grátis via chave).
//
// LEITURA SENSÍVEL: o código de cupom é ativo comercial (enumerar cupons =
// vazar descontos). As Rules restringem leitura ao ORGANIZADOR (writer), fora
// do catch-all de membro do evento — mesma taxonomia de pedidos/pagamentos e a
// lição do catch-all de `inscritos` (A-T2).
//
// `usos` = ∑ contador de ESCRITA EXCLUSIVA de Cloud Function (checkout, E12) —
// o cliente NUNCA o escreve. O "cupom disponível" é DERIVADO (cupomVigente).
// =============================================================================

import type { Timestamp } from '../index';
import { roundMoney } from '../finance/calc';

// ---------------------------------------------------------------------------
// Enums de domínio
// ---------------------------------------------------------------------------

/** Tipo de desconto do cupom. */
export type TipoCupom = 'percentual' | 'fixo';

/** Lista canônica de tipos — única fonte para validação/UI. */
export const TIPOS_CUPOM: readonly TipoCupom[] = ['percentual', 'fixo'];

/** Type guard de TipoCupom. @pure */
export function isTipoCupom(value: unknown): value is TipoCupom {
  return typeof value === 'string' && (TIPOS_CUPOM as readonly string[]).includes(value);
}

/**
 * Escopo do cupom (RN-364 · E18): 'geral' = cupom comum do evento;
 * 'club_parceiro' = condição de desconto EXCLUSIVA de um club parceiro
 * (RN-360) — criado SOMENTE pela Function `definirCondicaoDesconto`
 * (Rules negam cliente) e resolvido no checkout exigindo parceria ATIVA.
 * Ausente == 'geral' (schema evolution — cupons vigentes intocados).
 */
export type EscopoCupom = 'geral' | 'club_parceiro';

export const ESCOPOS_CUPOM: readonly EscopoCupom[] = ['geral', 'club_parceiro'];

/** Type guard de EscopoCupom. @pure */
export function isEscopoCupom(value: unknown): value is EscopoCupom {
  return (
    typeof value === 'string' &&
    (ESCOPOS_CUPOM as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Código
// ---------------------------------------------------------------------------

/** Código normalizado: 3..20 caracteres A–Z/0–9 (após trim + UPPER). */
export const CODIGO_CUPOM_RE = /^[A-Z0-9]{3,20}$/;

/** Normaliza um código bruto para a forma canônica (trim + UPPER). @pure */
export function normalizarCodigoCupom(bruto: string): string {
  return bruto.trim().toUpperCase();
}

/** O código (já normalizado) tem forma canônica válida? @pure */
export function isCodigoCupomValido(codigo: unknown): codigo is string {
  return typeof codigo === 'string' && CODIGO_CUPOM_RE.test(codigo);
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Cupom de desconto — código único por evento (ADR-012 / E04).
 * Subcoleção: `eventos/{eventoId}/cupons/{cupomId}` (docId = código normalizado).
 */
export interface Cupom {
  /** docId = código normalizado (unicidade por chave). */
  id: string;
  /** Propagado do evento pai — isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /** Código normalizado (== id) — único por evento. */
  codigo: string;
  /** Percentual (0<valor≤100) ou fixo (valor>0 em R$). */
  tipo: TipoCupom;
  /** Valor do desconto — % quando percentual, R$ quando fixo. */
  valor: number;
  /** Teto de usos — int ≥ 1, ou `null` = ilimitado. */
  tetoUso: number | null;
  /** Início da janela de validade. */
  inicioEm: Timestamp;
  /** Fim da janela de validade (fimEm > inicioEm). */
  fimEm: Timestamp;
  /**
   * ∑ Usos consumidos — escrita EXCLUSIVA de Cloud Function (checkout, E12).
   * Base do teto de uso. Cliente nunca escreve.
   */
  usos: number;
  /**
   * Escopo (RN-364 · E18) — ausente == 'geral'. Cupom 'club_parceiro' é
   * criado SÓ pela Function `definirCondicaoDesconto` (Rules barram
   * cliente) e o checkout exige a parceria referida ATIVA.
   */
  escopo?: EscopoCupom;
  /** docId do club parceiro — obrigatório quando escopo='club_parceiro'. */
  clubeRef?: string;
  /**
   * Path da parceria (`tenants/{t}/parceirosAssessoria/{docId}`) —
   * obrigatório quando escopo='club_parceiro'; o checkout re-lê este doc
   * (inclusive DENTRO da tx de venda) exigindo status 'ativa'.
   */
  parceriaRef?: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/**
 * Campos do cupom com escrita EXCLUSIVA de Cloud Function — o contador `usos`
 * é mantido pela Function do checkout. As Rules espelham: create exige
 * 0/ausente, update não pode tocá-lo.
 */
export const CAMPOS_FUNCTION_CUPOM = ['usos'] as const;

// ---------------------------------------------------------------------------
// Validação pura (shape isolado)
// ---------------------------------------------------------------------------

/** Millis de um Timestamp estrutural. @pure */
function millis(ts: Timestamp): number {
  return ts.toMillis();
}

/**
 * O valor é coerente com o tipo? (percentual: 0<valor≤100; fixo: valor>0). @pure
 */
export function valorCupomValido(tipo: TipoCupom, valor: unknown): valor is number {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) return false;
  return tipo === 'percentual' ? valor <= 100 : true;
}

// ---------------------------------------------------------------------------
// Derivações puras — vigência e desconto
// ---------------------------------------------------------------------------

/** Cupom atingiu o teto de usos? (ilimitado nunca atinge) @pure */
export function cupomNoTeto(cupom: Pick<Cupom, 'tetoUso' | 'usos'>): boolean {
  return cupom.tetoUso !== null && cupom.usos >= cupom.tetoUso;
}

/** Instante `agora` está dentro da janela de validade? @pure */
export function cupomNaJanela(
  cupom: Pick<Cupom, 'inicioEm' | 'fimEm'>,
  agora: Date
): boolean {
  const t = agora.getTime();
  return t >= millis(cupom.inicioEm) && t < millis(cupom.fimEm);
}

/** Cupom VIGENTE? (dentro da janela E abaixo do teto de usos) @pure */
export function cupomVigente(
  cupom: Pick<Cupom, 'inicioEm' | 'fimEm' | 'tetoUso' | 'usos'>,
  agora: Date
): boolean {
  return cupomNaJanela(cupom, agora) && !cupomNoTeto(cupom);
}

/**
 * Desconto do cupom sobre um valor-base, em R$ (2 casas, clampado a
 * `[0, valorBase]` — nunca desconta mais do que o preço). Percentual aplica %;
 * fixo abate o valor até zerar. NÃO checa vigência — o chamador combina com
 * `cupomVigente` no checkout. @pure
 */
export function descontoDoCupom(
  cupom: Pick<Cupom, 'tipo' | 'valor'>,
  valorBase: number
): number {
  if (valorBase <= 0) return 0;
  const bruto = cupom.tipo === 'percentual' ? (valorBase * cupom.valor) / 100 : cupom.valor;
  return roundMoney(Math.min(Math.max(bruto, 0), valorBase));
}

// ---------------------------------------------------------------------------
// Parse fail-fast (borda de I/O do Firestore)
// ---------------------------------------------------------------------------

/** Parsing defensivo de um doc Firestore em `Cupom` (fail-fast). @pure */
export function parseCupom(id: string, data: Record<string, unknown>): Cupom {
  const tenantId = data['tenantId'];
  const codigo = data['codigo'];
  const tipo = data['tipo'];
  const valor = data['valor'];
  const tetoUso = data['tetoUso'];
  const inicioEm = data['inicioEm'];
  const fimEm = data['fimEm'];
  const usos = data['usos'];

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`Cupom ${id}: campo "tenantId" inválido (ADR-009)`);
  }
  if (!isCodigoCupomValido(codigo)) {
    throw new Error(`Cupom ${id}: "codigo" fora do padrão A-Z0-9 3..20 (normalizado)`);
  }
  // Unicidade por chave: o código É o docId — divergência quebra o invariante.
  if (codigo !== id) {
    throw new Error(`Cupom ${id}: "codigo" (${codigo}) deve ser igual ao docId`);
  }
  if (!isTipoCupom(tipo)) {
    throw new Error(`Cupom ${id}: tipo "${String(tipo)}" fora do enum`);
  }
  if (!valorCupomValido(tipo, valor)) {
    throw new Error(
      `Cupom ${id}: "valor" inválido para tipo ${tipo} (percentual 0<v≤100; fixo v>0)`
    );
  }
  if (
    tetoUso !== null &&
    tetoUso !== undefined &&
    (!Number.isInteger(tetoUso) || (tetoUso as number) < 1)
  ) {
    throw new Error(`Cupom ${id}: "tetoUso" deve ser inteiro ≥ 1 ou null (ilimitado)`);
  }
  if (!isTimestampLike(inicioEm) || !isTimestampLike(fimEm)) {
    throw new Error(`Cupom ${id}: "inicioEm"/"fimEm" devem ser Timestamp`);
  }
  if (fimEm.toMillis() <= inicioEm.toMillis()) {
    throw new Error(`Cupom ${id}: "fimEm" deve ser depois de "inicioEm" (validade)`);
  }
  if (usos !== undefined && (typeof usos !== 'number' || !Number.isInteger(usos) || usos < 0)) {
    throw new Error(`Cupom ${id}: "usos" deve ser inteiro ≥ 0 (∑ de Function)`);
  }

  // Escopo (RN-364 · E18): ausente == 'geral'; 'club_parceiro' exige a
  // amarração completa (clubeRef + parceriaRef) — cupom escopado sem
  // parceria referenciável não tem como ser resolvido no checkout.
  const escopo = data['escopo'];
  if (escopo !== undefined && !isEscopoCupom(escopo)) {
    throw new Error(`Cupom ${id}: "escopo" fora do enum geral|club_parceiro (RN-364)`);
  }
  const clubeRef = data['clubeRef'];
  const parceriaRef = data['parceriaRef'];
  if (escopo === 'club_parceiro') {
    if (typeof clubeRef !== 'string' || clubeRef.length === 0) {
      throw new Error(`Cupom ${id}: escopo club_parceiro exige "clubeRef" (RN-364)`);
    }
    if (typeof parceriaRef !== 'string' || parceriaRef.length === 0) {
      throw new Error(`Cupom ${id}: escopo club_parceiro exige "parceriaRef" (RN-364)`);
    }
  }

  const cupom: Cupom = {
    id,
    tenantId,
    codigo,
    tipo,
    valor: valor as number,
    tetoUso: typeof tetoUso === 'number' ? tetoUso : null,
    inicioEm,
    fimEm,
    usos: typeof usos === 'number' ? usos : 0,
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };
  if (escopo !== undefined) cupom.escopo = escopo as EscopoCupom;
  if (typeof clubeRef === 'string' && clubeRef.length > 0) {
    cupom.clubeRef = clubeRef;
  }
  if (typeof parceriaRef === 'string' && parceriaRef.length > 0) {
    cupom.parceriaRef = parceriaRef;
  }
  return cupom;
}

/** Guard estrutural mínimo de Timestamp (tem toMillis()). @pure */
function isTimestampLike(value: unknown): value is Timestamp {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as Partial<Timestamp>).toMillis === 'function'
  );
}
