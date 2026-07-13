// =============================================================================
// packages/core/src/platform/planoCobranca.ts
//
// PLANO DE COBRANÇA nomeado da plataforma (LEELA-T2-L4 · CB-T1 · extensão
// do território E16-S1602 — decisão Vitor 2026-07-05 2ª rodada; decisão
// vinculante #15 do onda2-decisoes.md).
//
// O `platform_admin` cria planos nomeados e os APLICA a organizadores.
// SEMÂNTICA CANÔNICA: aplicar = ESTAMPAR SNAPSHOT nos
// `tenants/{id}/commercialTerms/current` (bump de versão + snapshot v{n},
// mecanismo S1602-T1) — SEM vínculo vivo. Editar o plano depois NÃO
// retroage em tenants já aplicados; só reaplicar re-estampa. O tenant não
// "assina" o plano — recebe uma CÓPIA dos valores no momento da aplicação.
//
// Coleção: `planosCobranca/{planoId}` — TOP-LEVEL, platform-scoped (fora
// do namespace de tenant). Nota de normalização: o brief grafou
// `platform/planosCobranca/{planoId}`, que NÃO é caminho de documento
// válido no Firestore (segmentos ímpares); top-level com Rules
// admin-only preserva a semântica. Read E write SÓ platform_admin —
// tenant não enxerga o catálogo de planos (só o resultado estampado nos
// próprios termos).
//
// Defaults iniciais (decisão comercial): 10% cartão / 8% PIX no plano
// "Padrão" — DEFAULTS, não valores fixos; os VALORES da tabela 2x-12x e da
// mensalidade SaaS são a única pendência comercial ("exercitar depois") e
// entram como placeholder 0.
// =============================================================================

import type { Timestamp } from '../index';
import type {
  CommercialTerms,
  TabelaTaxasParcela,
} from './commercialTerms';
import {
  CHAVES_TABELA_PARCELAS,
  isTabelaTaxasParcelaValida,
} from './commercialTerms';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Coleção top-level dos planos (fonte única p/ api-client e Functions). */
export const PLANOS_COBRANCA_COLLECTION = 'planosCobranca';

/** docId canônico do plano default da plataforma. */
export const PLANO_PADRAO_ID = 'padrao';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/**
 * Plano de cobrança nomeado — `planosCobranca/{planoId}`.
 * Carrega os MESMOS eixos comerciais que o plano estampa nos termos:
 * taxa por método (cartão à vista / PIX), tabela por parcela (2x-12x) e
 * mensalidade SaaS.
 */
export interface PlanoCobranca {
  id: string;
  nome: string;
  /** Taxa % por nº de parcelas — chaves '2'..'12' COMPLETAS (RN do modelo). */
  tabelaTaxasParcela: TabelaTaxasParcela;
  /** Taxa % sobre PIX (default inicial 8). */
  taxaPix: number;
  /** Taxa % sobre cartão à vista (default inicial 10). */
  taxaCartaoAVista: number;
  /** Mensalidade SaaS em R$ — 0 é VÁLIDO (RN-405). */
  saasMonthlyFee: number;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/** Payload editável (sem id/carimbos). */
export type PlanoCobrancaInput = Omit<
  PlanoCobranca,
  'id' | 'criadoEm' | 'atualizadoEm'
>;

// ---------------------------------------------------------------------------
// Default canônico — plano "Padrão"
// ---------------------------------------------------------------------------

function tabelaPlaceholder(): TabelaTaxasParcela {
  const tabela: TabelaTaxasParcela = {};
  for (const chave of CHAVES_TABELA_PARCELAS) tabela[chave] = 0;
  return tabela;
}

/**
 * Plano "Padrão": 10% cartão / 8% PIX (decisão 2026-07-05); tabela por
 * parcela e mensalidade em PLACEHOLDER 0 — única pendência comercial
 * ("exercitar depois"; o modelo já comporta, valores não bloqueiam).
 */
export const PLANO_PADRAO: PlanoCobrancaInput = {
  nome: 'Padrão',
  tabelaTaxasParcela: tabelaPlaceholder(),
  taxaPix: 8,
  taxaCartaoAVista: 10,
  saasMonthlyFee: 0,
};

// ---------------------------------------------------------------------------
// Validação pura
// ---------------------------------------------------------------------------

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Valida um payload de plano. Retorna a lista de erros (vazia = válido).
 * A tabela por parcela do PLANO exige as chaves '2'..'12' COMPLETAS
 * (o plano é o template que popula os termos — não pode nascer furado;
 * a edição fina POR TENANT pode ser parcial, ver validateCommercialTerms).
 * @pure
 */
export function validarPlanoCobranca(input: PlanoCobrancaInput): string[] {
  const erros: string[] = [];

  if (
    typeof input.nome !== 'string' ||
    input.nome.trim().length === 0 ||
    input.nome.length > 60
  ) {
    erros.push('nome é obrigatório (1..60 caracteres).');
  }
  for (const [campo, valor] of [
    ['taxaPix', input.taxaPix],
    ['taxaCartaoAVista', input.taxaCartaoAVista],
  ] as const) {
    if (!isFiniteNumber(valor) || valor < 0 || valor > 100) {
      erros.push(`${campo} deve estar entre 0 e 100.`);
    }
  }
  if (!isFiniteNumber(input.saasMonthlyFee) || input.saasMonthlyFee < 0) {
    erros.push('saasMonthlyFee deve ser ≥ 0 (0 = isento, RN-405).');
  }

  if (!isTabelaTaxasParcelaValida(input.tabelaTaxasParcela)) {
    erros.push(
      'tabelaTaxasParcela inválida (chaves fora de 2..12 ou taxas fora de 0..100).'
    );
  } else {
    const faltantes = CHAVES_TABELA_PARCELAS.filter(
      (chave) => !(chave in input.tabelaTaxasParcela)
    );
    if (faltantes.length > 0) {
      erros.push(
        `tabelaTaxasParcela do plano exige as chaves 2..12 completas (faltam: ${faltantes.join(', ')}).`
      );
    }
  }

  return erros;
}

// ---------------------------------------------------------------------------
// Mapeamento plano → termos (ZERO recálculo — cópia fiel)
// ---------------------------------------------------------------------------

/**
 * Subset dos termos que o plano estampa (contrato do aplicarPlano).
 * `Required<Pick<…>>`: nos termos os campos são opcionais (aditivo), mas a
 * ESTAMPA sempre os carrega todos — plano não estampa termo furado.
 */
export type TermosDoPlanoCobranca = Required<
  Pick<CommercialTerms, 'taxaPorMetodo' | 'tabelaTaxasParcela' | 'saasMonthlyFee'>
>;

/**
 * Mapeia o plano para o shape dos termos comerciais:
 *   taxaCartaoAVista/taxaPix → taxaPorMetodo.{credit_card,pix};
 *   tabela por parcela → tabelaTaxasParcela; mensalidade → saasMonthlyFee.
 * ZERO RECÁLCULO — mapeamento fiel campo a campo (cópia defensiva da
 * tabela para o snapshot estampado não compartilhar referência). @pure
 */
export function planoParaTerms(
  plano: Pick<
    PlanoCobranca,
    'taxaPix' | 'taxaCartaoAVista' | 'tabelaTaxasParcela' | 'saasMonthlyFee'
  >
): TermosDoPlanoCobranca {
  return {
    taxaPorMetodo: {
      credit_card: plano.taxaCartaoAVista,
      pix: plano.taxaPix,
    },
    tabelaTaxasParcela: { ...plano.tabelaTaxasParcela },
    saasMonthlyFee: plano.saasMonthlyFee,
  };
}
