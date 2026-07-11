// =============================================================================
// packages/core/src/eventos/paginaVendas.ts
//
// Container de configuração da página de vendas — domínio puro
// (LEELA-S300-T1 · E04). Subcoleção: `eventos/{eventoId}/paginaVendas/{docId}`
// — tenant-scoped (ADR-009). Um doc por evento (docId canônico = `config`).
//
// É o SHAPE que S300-T3/T4/T5 (editor de conteúdo, modais) consomem — aqui
// NÃO se constrói UI. Modela as seções agrupadas por canal (Essenciais / Só
// landing / Sistema-Checkout travada) e o card SEO (URL amigável read-only com
// {DOMINIO_LEELA}).
//
// INVARIANTE (S300 · aceite): a seção de CHECKOUT é SEMPRE travada
// (`travada: true`, `ativa: true`) — o organizador liga/desliga as demais, mas
// o checkout nunca desliga. `parsePaginaVendas` recusa doc que viole isso.
//
// PUBLICAÇÃO por Function: `publicada`/`publicadaEm` são carimbos de escrita
// EXCLUSIVA de Cloud Function (a story de publicar, S300-T3, valida completude
// server-side como `publicarEvento`) — o cliente edita seções/SEO, nunca a
// flag de publicação. A leitura PÚBLICA da página publicada é da story do
// checkout/landing (deny-by-default até lá — precedente do TODO de leitura
// pública de eventos).
// =============================================================================

import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Canal das seções
// ---------------------------------------------------------------------------

/** Canal de agrupamento das seções (S300 · aceite). */
export type CanalSecao = 'essenciais' | 'landing' | 'sistema';

/** Lista canônica de canais — única fonte para validação/UI. */
export const CANAIS_SECAO: readonly CanalSecao[] = ['essenciais', 'landing', 'sistema'];

/** Type guard de CanalSecao. @pure */
export function isCanalSecao(value: unknown): value is CanalSecao {
  return typeof value === 'string' && (CANAIS_SECAO as readonly string[]).includes(value);
}

/** docId canônico da página de vendas (1 por evento). */
export const PAGINA_VENDAS_DOC_ID = 'config';

/** Id da seção de checkout — sempre travada (S300 · aceite). */
export const SECAO_CHECKOUT_ID = 'checkout';

// ---------------------------------------------------------------------------
// Seção
// ---------------------------------------------------------------------------

/** Uma seção da página de vendas, com canal e estado de toggle. */
export interface SecaoVendas {
  /** Id estável da seção ('hero', 'sobre', 'checkout'…). */
  id: string;
  /** Canal de agrupamento (aceite S300). */
  canal: CanalSecao;
  /** Ligada/desligada. Checkout é sempre `true`. */
  ativa: boolean;
  /** Travada (não desligável pelo cliente). Checkout é sempre `true`. */
  travada: boolean;
}

/** Type guard de SecaoVendas (shape de I/O). @pure */
export function isSecaoVendas(value: unknown): value is SecaoVendas {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s['id'] === 'string' &&
    s['id'].length > 0 &&
    isCanalSecao(s['canal']) &&
    typeof s['ativa'] === 'boolean' &&
    typeof s['travada'] === 'boolean'
  );
}

/**
 * A seção de checkout existe e está travada+ativa? (invariante S300 · aceite:
 * "Checkout permanece sempre travada"). @pure
 */
export function checkoutTravado(secoes: readonly SecaoVendas[]): boolean {
  const checkout = secoes.find((s) => s.id === SECAO_CHECKOUT_ID);
  return checkout !== undefined && checkout.travada === true && checkout.ativa === true;
}

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

/** Card de SEO da página (URL amigável read-only com {DOMINIO_LEELA}). */
export interface SeoVendas {
  titulo: string;
  descricao: string;
  /** URL amigável read-only (derivada; ex.: `{DOMINIO_LEELA}/meia-floripa-2026`). */
  slugAmigavel: string;
  /** Imagem de compartilhamento (OpenGraph) — opcional. */
  imagemUrl?: string;
}

/** Type guard de SeoVendas (shape de I/O). @pure */
export function isSeoVendas(value: unknown): value is SeoVendas {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s['titulo'] === 'string' &&
    typeof s['descricao'] === 'string' &&
    typeof s['slugAmigavel'] === 'string' &&
    s['slugAmigavel'].length > 0 &&
    (s['imagemUrl'] === undefined ||
      (typeof s['imagemUrl'] === 'string' && s['imagemUrl'].length > 0))
  );
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Página de vendas do evento (config).
 * Subcoleção: `eventos/{eventoId}/paginaVendas/{docId}` (docId = `config`).
 */
export interface PaginaVendas {
  id: string;
  /** Propagado do evento pai — isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /** Evento dono da página (docId do pai). */
  eventoId: string;
  /** Seções agrupadas por canal (checkout sempre travada). */
  secoes: SecaoVendas[];
  seo: SeoVendas;
  /** Publicada? Carimbo de escrita EXCLUSIVA de Function (S300-T3). */
  publicada: boolean;
  /** Quando publicada — carimbo de Function. Ausente = nunca publicada. */
  publicadaEm?: Timestamp;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/**
 * Campos da página com escrita EXCLUSIVA de Cloud Function — a publicação
 * (`publicada`/`publicadaEm`) valida completude server-side. As Rules
 * espelham: create exige `publicada` false/ausente, update não os toca.
 */
export const CAMPOS_FUNCTION_PAGINA_VENDAS = ['publicada', 'publicadaEm'] as const;

// ---------------------------------------------------------------------------
// Seções padrão (base para o editor T3 — não é UI, é o shape inicial)
// ---------------------------------------------------------------------------

/**
 * Catálogo padrão de seções de uma página nova (o editor T3 renderiza a partir
 * disto). Checkout já nasce travada+ativa (invariante S300). @pure
 */
export function secoesVendasPadrao(): SecaoVendas[] {
  return [
    { id: 'hero', canal: 'essenciais', ativa: true, travada: false },
    { id: 'sobre', canal: 'essenciais', ativa: true, travada: false },
    { id: 'percursos', canal: 'essenciais', ativa: true, travada: false },
    { id: 'lotes', canal: 'essenciais', ativa: true, travada: false },
    { id: 'depoimentos', canal: 'landing', ativa: false, travada: false },
    { id: 'patrocinadores', canal: 'landing', ativa: false, travada: false },
    { id: SECAO_CHECKOUT_ID, canal: 'sistema', ativa: true, travada: true },
  ];
}

// ---------------------------------------------------------------------------
// Parse fail-fast (borda de I/O do Firestore)
// ---------------------------------------------------------------------------

/** Parsing defensivo de um doc Firestore em `PaginaVendas` (fail-fast). @pure */
export function parsePaginaVendas(id: string, data: Record<string, unknown>): PaginaVendas {
  const tenantId = data['tenantId'];
  const eventoId = data['eventoId'];
  const secoesRaw = data['secoes'];
  const seoRaw = data['seo'];
  const publicada = data['publicada'];

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`PaginaVendas ${id}: campo "tenantId" inválido (ADR-009)`);
  }
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    throw new Error(`PaginaVendas ${id}: campo "eventoId" inválido`);
  }
  if (!Array.isArray(secoesRaw) || !secoesRaw.every(isSecaoVendas)) {
    throw new Error(`PaginaVendas ${id}: "secoes" inválida (lista de SecaoVendas)`);
  }
  const secoes = secoesRaw as SecaoVendas[];
  if (!checkoutTravado(secoes)) {
    throw new Error(
      `PaginaVendas ${id}: seção "${SECAO_CHECKOUT_ID}" deve existir travada+ativa (aceite S300)`
    );
  }
  if (!isSeoVendas(seoRaw)) {
    throw new Error(`PaginaVendas ${id}: "seo" inválido (titulo/descricao/slugAmigavel)`);
  }
  const seo = seoRaw;

  const pagina: PaginaVendas = {
    id,
    tenantId,
    eventoId,
    secoes,
    seo: {
      titulo: seo.titulo,
      descricao: seo.descricao,
      slugAmigavel: seo.slugAmigavel,
      // exactOptionalPropertyTypes: só entra quando presente.
      ...(seo.imagemUrl !== undefined ? { imagemUrl: seo.imagemUrl } : {}),
    },
    publicada: publicada === true,
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };

  if (data['publicadaEm'] !== undefined) {
    pagina.publicadaEm = data['publicadaEm'] as Timestamp;
  }

  return pagina;
}
