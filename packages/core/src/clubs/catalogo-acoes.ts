// =============================================================================
// packages/core/src/clubs/catalogo-acoes.ts
//
// Catálogo global de ações — coleção `catalogoAcoes/{acaoId}` (LEELA-E05 ·
// S105-T1). Seed FIXO de 16 ações em 3 pilares (RN-114: 7 Físico, 5 Mental,
// 4 Espiritual) — fonte canônica: HANDOFF-05.
//
// O catálogo é dado de PRODUTO (não mock): as 16 ações são a taxonomia
// oficial dos desafios, versionada aqui em core e semeada pelo
// functions/src/seed/catalogoAcoes.seed.ts. Rules: leitura global
// autenticada; escrita NEGADA a cliente (write: if false).
//
// Pontuação: `pontosBase` pontos a cada `unidadeBase` unidades de `unidade`.
// Ex.: Ler = 2 pts / 10 páginas → pontosBase 2, unidadeBase 10, unidade
// 'paginas'. O cálculo (com bônus RN-115) vive em pontuacao.ts (S106-T1).
// =============================================================================

// ---------------------------------------------------------------------------
// Pilar
// ---------------------------------------------------------------------------

/** Os 3 pilares do produto (Físico · Mental · Espiritual) */
export type Pilar = 'fisico' | 'mental' | 'espiritual';

export const PILARES: readonly Pilar[] = ['fisico', 'mental', 'espiritual'];

export function isPilar(v: unknown): v is Pilar {
  return PILARES.includes(v as Pilar);
}

// ---------------------------------------------------------------------------
// Ação do catálogo
// ---------------------------------------------------------------------------

/** Ação do catálogo global (`catalogoAcoes/{acaoId}`) */
export interface CatalogoAcao {
  /** docId estável (slug) — referenciado pela junção `desafios/{id}/acoes` */
  id: string;
  nome: string;
  pilar: Pilar;
  /** Unidade de registro (km, min, sessões, …) */
  unidade: string;
  /** Pontos ganhos a cada `unidadeBase` unidades */
  pontosBase: number;
  /** Quantidade de `unidade` que rende `pontosBase` pontos (default 1) */
  unidadeBase: number;
  /** Nome do ícone Lucide */
  icone: string;
}

/**
 * As 16 ações canônicas (RN-114) — HANDOFF-05, tabela "Catálogo Be Hero".
 * NÃO alterar sem revisão de produto: apps e seeds derivam daqui.
 */
export const CATALOGO_ACOES: readonly CatalogoAcao[] = [
  // ── Pilar Físico (7) ─────────────────────────────────────────────────────
  { id: 'correr', nome: 'Correr', pilar: 'fisico', unidade: 'km', pontosBase: 2, unidadeBase: 1, icone: 'footprints' },
  { id: 'caminhar', nome: 'Caminhar', pilar: 'fisico', unidade: 'km', pontosBase: 1, unidadeBase: 1, icone: 'activity' },
  { id: 'pedalar', nome: 'Pedalar', pilar: 'fisico', unidade: 'km', pontosBase: 0.7, unidadeBase: 1, icone: 'bike' },
  { id: 'musculacao', nome: 'Treinar musculação', pilar: 'fisico', unidade: 'sessoes', pontosBase: 10, unidadeBase: 1, icone: 'dumbbell' },
  { id: 'yoga-alongamento', nome: 'Yoga / alongamento', pilar: 'fisico', unidade: 'min', pontosBase: 2, unidadeBase: 10, icone: 'flower' },
  { id: 'nadar', nome: 'Nadar', pilar: 'fisico', unidade: 'metros', pontosBase: 1, unidadeBase: 100, icone: 'waves' },
  { id: 'dormir-7h', nome: 'Dormir 7h+', pilar: 'fisico', unidade: 'noites', pontosBase: 3, unidadeBase: 1, icone: 'moon' },
  // ── Pilar Mental (5) ─────────────────────────────────────────────────────
  { id: 'ler', nome: 'Ler', pilar: 'mental', unidade: 'paginas', pontosBase: 2, unidadeBase: 10, icone: 'book-open' },
  { id: 'estudar-curso', nome: 'Estudar / curso', pilar: 'mental', unidade: 'min', pontosBase: 5, unidadeBase: 30, icone: 'graduation-cap' },
  { id: 'journaling', nome: 'Escrever / journaling', pilar: 'mental', unidade: 'sessoes', pontosBase: 8, unidadeBase: 1, icone: 'edit-3' },
  { id: 'limitar-tela-noite', nome: 'Limitar tela à noite', pilar: 'mental', unidade: 'dias', pontosBase: 5, unidadeBase: 1, icone: 'smartphone' },
  { id: 'trabalho-focado', nome: 'Trabalho focado', pilar: 'mental', unidade: 'sessoes', pontosBase: 8, unidadeBase: 1, icone: 'zap' },
  // ── Pilar Espiritual (4) ─────────────────────────────────────────────────
  { id: 'meditar', nome: 'Meditar', pilar: 'espiritual', unidade: 'min', pontosBase: 5, unidadeBase: 10, icone: 'sparkles' },
  { id: 'respiracao-consciente', nome: 'Respiração consciente', pilar: 'espiritual', unidade: 'sessoes', pontosBase: 5, unidadeBase: 1, icone: 'wind' },
  { id: 'gratidao-diaria', nome: 'Gratidão diária', pilar: 'espiritual', unidade: 'dias', pontosBase: 4, unidadeBase: 1, icone: 'heart' },
  { id: 'desconexao-digital', nome: 'Desconexão digital', pilar: 'espiritual', unidade: 'horas', pontosBase: 3, unidadeBase: 1, icone: 'unlink' },
];

/** Total canônico do catálogo (RN-114) */
export const TOTAL_ACOES_CATALOGO = 16;

/** Distribuição canônica por pilar (RN-114: 7/5/4) */
export const ACOES_POR_PILAR: Readonly<Record<Pilar, number>> = {
  fisico: 7,
  mental: 5,
  espiritual: 4,
};

/** Lookup por id — null se a ação não existe no catálogo. */
export function getAcaoCatalogo(id: string): CatalogoAcao | null {
  return CATALOGO_ACOES.find((a) => a.id === id) ?? null;
}
