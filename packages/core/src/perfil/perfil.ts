// =============================================================================
// packages/core/src/perfil/perfil.ts
//
// Perfil público / link-in-bio — E17 · S1700 (Onda 3, DN-1 organizador-only).
// Coleção TOP-LEVEL `perfis/{handle}` — docId = handle NORMALIZADO minúsculo:
// a unicidade GLOBAL case-insensitive (RN-160) é estrutural (dois casings do
// mesmo handle colidem no MESMO docId).
//
// RNs:
//   RN-160 — handle único, IMUTÁVEL após criação, formato `@[a-z0-9_]{3,30}`,
//            exclui reservados; é a chave da URL pública `/@{handle}`.
//   RN-161 — visibilidade: publica (link direto, noindex) | indexavel
//            (buscadores) | privada (404 público) — espelha RN-140 do clube.
//   RN-166 — capa de entidade usa o nome CANÔNICO `imagemUrl` (reconciliação
//            O3-L2SEC: mesmo campo do evento RN-153; `capaUrl` é só capa de
//            email de campanha/comunicado, RN-135).
//
// ESCRITA: exclusiva da Function `salvarPerfil` (registry — Rules congelam o
// cliente). Este módulo é PURO: validação + projeção pública sem PII.
// DN-1 (ratificada 2026-07-17): nesta onda só ORGANIZADOR tem perfil; o tipo
// `atleta` existe no enum para a Onda 4, mas o registry não o aceita ainda.
// =============================================================================

import type { Timestamp } from '../index';
import { isUrlCapaValida } from '../eventos/evento';

/** Nome da coleção top-level — `perfis/{handle}`. */
export const COLECAO_PERFIS = 'perfis';

// ---------------------------------------------------------------------------
// Handle (RN-160)
// ---------------------------------------------------------------------------

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;

/** Formato canônico do handle (JÁ normalizado): minúsculo, sem `@`. */
export const HANDLE_RE = /^[a-z0-9_]{3,30}$/;

/**
 * Handles reservados (RN-160) — marca, rotas, papéis e termos de abuso.
 * A rota pública usa o prefixo `@`, então não há colisão estrutural com
 * slugs de evento; a lista protege identidade da plataforma e phishing
 * ("@suporte", "@admin"). Minúsculos (comparação após normalização).
 */
export const HANDLES_RESERVADOS: readonly string[] = [
  'leela',
  'leela_oficial',
  'oficial',
  'admin',
  'administrador',
  'suporte',
  'ajuda',
  'contato',
  'seguranca',
  'privacidade',
  'termos',
  'api',
  'app',
  'www',
  'blog',
  'sobre',
  'evento',
  'eventos',
  'clube',
  'clubes',
  'inscricao',
  'inscricoes',
  'checkout',
  'painel',
  'login',
  'entrar',
  'cadastrar',
  'conta',
  'perfil',
  'perfis',
  'atleta',
  'atletas',
  'organizador',
  'organizadores',
  'staff',
  'root',
  'sistema',
  'pagamento',
  'pagamentos',
  'financeiro',
  'health',
  'sitemap',
  'robots',
];

/**
 * Normaliza um handle de entrada: trim, remove UM `@` inicial (a UI mostra
 * `@handle`), minúsculas. Retorna `null` para não-string/vazio. A
 * normalização é o que torna a unicidade case-insensitive ESTRUTURAL
 * (docId = handle normalizado). @pure
 */
export function normalizarHandle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const semArroba = raw.trim().replace(/^@/, '');
  if (semArroba.length === 0) return null;
  return semArroba.toLowerCase();
}

/** Handle NORMALIZADO válido: formato RN-160 + fora da lista de reservados. */
export function validarHandle(handle: string): boolean {
  return HANDLE_RE.test(handle) && !HANDLES_RESERVADOS.includes(handle);
}

/**
 * Diagnóstico do handle para copy de erro (Function/painel). `null` = válido.
 * Aceita entrada CRUA (normaliza antes). @pure
 */
export function handleProblema(raw: unknown): string | null {
  const handle = normalizarHandle(raw);
  if (handle === null) return 'handle é obrigatório';
  if (!HANDLE_RE.test(handle)) {
    return `handle inválido — use ${HANDLE_MIN} a ${HANDLE_MAX} caracteres: letras minúsculas, números e _ (RN-160)`;
  }
  if (HANDLES_RESERVADOS.includes(handle)) {
    return `handle "@${handle}" é reservado (RN-160)`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/** DN-1: só `organizador` nesta onda; `atleta` entra na Onda 4. */
export type TipoPerfil = 'organizador' | 'atleta';

/** Visibilidade do perfil (RN-161 — espelha RN-140 do clube). */
export type VisibilidadePerfil = 'publica' | 'indexavel' | 'privada';

export const VISIBILIDADES_PERFIL: readonly VisibilidadePerfil[] = [
  'publica',
  'indexavel',
  'privada',
];

/** Link externo do link-in-bio (parte PÚBLICA do produto). */
export interface LinkExternoPerfil {
  /** Rótulo curto exibido no botão (≤ 40 chars) */
  label: string;
  /** URL http(s) válida (mesma guarda da capa — vira href público) */
  url: string;
}

/**
 * Perfil — `perfis/{handle}` (docId = handle normalizado).
 * `ownerUid`/`tenantId` são INTERNOS: nunca saem na projeção pública.
 */
export interface Perfil {
  /** docId espelhado — handle normalizado minúsculo (RN-160, imutável) */
  handle: string;
  tipo: TipoPerfil;
  /** uid do criador — PRIVADO (fora da projeção pública) */
  ownerUid: string;
  /** Tenant dono (DN-1 organizador-only) — PRIVADO (fora da projeção) */
  tenantId: string;
  /** Nome público exibido (1..80) */
  nome: string;
  /** ≤ 280 chars */
  bio?: string;
  /** Avatar http(s) válida */
  avatarUrl?: string;
  /** Capa do perfil — nome canônico `imagemUrl` (RN-166) */
  imagemUrl?: string;
  visibilidade: VisibilidadePerfil;
  /** ≤ 5 links (link-in-bio) */
  linksExternos?: LinkExternoPerfil[];
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/** Campos que NUNCA entram na projeção pública (teste de PII referencia). */
export const CAMPOS_PRIVADOS_PERFIL = ['ownerUid', 'tenantId'] as const;

// ---------------------------------------------------------------------------
// Validação do input (Function `salvarPerfil` + formulário do painel)
// ---------------------------------------------------------------------------

export const PERFIL_NOME_MAX = 80;
export const PERFIL_BIO_MAX = 280;
export const PERFIL_LINKS_MAX = 5;
export const PERFIL_LINK_LABEL_MAX = 40;

/** Payload de criação/edição do perfil (handle só é usado no CREATE). */
export interface PerfilInput {
  handle: string;
  nome: string;
  bio?: string;
  avatarUrl?: string;
  imagemUrl?: string;
  visibilidade: VisibilidadePerfil;
  linksExternos?: LinkExternoPerfil[];
}

/**
 * Valida o payload do perfil. Retorna lista de erros (vazia = válido).
 * Pura — feedback de formulário no painel e fronteira do servidor. @pure
 */
export function validarPerfilInput(input: unknown): string[] {
  const erros: string[] = [];
  if (input === null || typeof input !== 'object') {
    return ['payload de perfil inválido'];
  }
  const p = input as Partial<PerfilInput>;

  const problemaHandle = handleProblema(p.handle);
  if (problemaHandle !== null) erros.push(problemaHandle);

  if (typeof p.nome !== 'string' || p.nome.trim().length === 0) {
    erros.push('nome é obrigatório');
  } else if (p.nome.length > PERFIL_NOME_MAX) {
    erros.push(`nome excede ${PERFIL_NOME_MAX} caracteres`);
  }

  if (p.bio !== undefined) {
    if (typeof p.bio !== 'string' || p.bio.length > PERFIL_BIO_MAX) {
      erros.push(`bio inválida (texto de até ${PERFIL_BIO_MAX} caracteres)`);
    }
  }

  if (p.avatarUrl !== undefined && !isUrlCapaValida(p.avatarUrl)) {
    erros.push('avatarUrl inválida (use uma URL http(s) de até 2048 caracteres)');
  }
  if (p.imagemUrl !== undefined && !isUrlCapaValida(p.imagemUrl)) {
    erros.push('imagemUrl inválida (use uma URL http(s) de até 2048 caracteres)');
  }

  if (!VISIBILIDADES_PERFIL.includes(p.visibilidade as VisibilidadePerfil)) {
    erros.push('visibilidade inválida (publica | indexavel | privada — RN-161)');
  }

  if (p.linksExternos !== undefined) {
    if (!Array.isArray(p.linksExternos) || p.linksExternos.length > PERFIL_LINKS_MAX) {
      erros.push(`linksExternos inválidos (lista de até ${PERFIL_LINKS_MAX} links)`);
    } else {
      for (const link of p.linksExternos) {
        const l = link as Partial<LinkExternoPerfil> | null;
        if (
          l === null ||
          typeof l !== 'object' ||
          typeof l.label !== 'string' ||
          l.label.trim().length === 0 ||
          l.label.length > PERFIL_LINK_LABEL_MAX ||
          !isUrlCapaValida(l.url)
        ) {
          erros.push(
            `link externo inválido (label 1..${PERFIL_LINK_LABEL_MAX} chars + URL http(s))`
          );
          break;
        }
      }
    }
  }

  return erros;
}

// ---------------------------------------------------------------------------
// Projeção pública SEM PII (S1700-T1)
// ---------------------------------------------------------------------------

/**
 * Projeção pública do perfil — o ÚNICO shape que atravessa a fronteira
 * pública (leitor da landing). Sem `ownerUid`/`tenantId`/`tipo`; URLs
 * revalidadas na saída (defesa em profundidade — o leitor usa Admin SDK e
 * bypassa Rules).
 */
export interface PerfilPublico {
  handle: string;
  nome: string;
  bio?: string;
  avatarUrl?: string;
  imagemUrl?: string;
  /** RN-161: `indexavel` ⇒ index; `publica` ⇒ noindex (link direto) */
  indexavel: boolean;
  linksExternos: LinkExternoPerfil[];
}

/**
 * Projeta um doc de `perfis/{handle}` na visão pública. `null` quando o
 * perfil é `privada` (⇒ 404 público honesto) ou o doc é lixo. ALLOWLIST de
 * campos (nunca spread): campo novo no doc NÃO vaza sem passar por aqui. @pure
 */
export function projetarPerfilPublico(
  handle: string,
  data: Record<string, unknown>
): PerfilPublico | null {
  const visibilidade = data['visibilidade'];
  if (visibilidade !== 'publica' && visibilidade !== 'indexavel') return null;

  const nome = data['nome'];
  if (typeof nome !== 'string' || nome.trim().length === 0) return null;

  const bio = data['bio'];
  const avatarUrl = data['avatarUrl'];
  const imagemUrl = data['imagemUrl'];

  const linksBrutos = Array.isArray(data['linksExternos'])
    ? (data['linksExternos'] as unknown[])
    : [];
  const linksExternos: LinkExternoPerfil[] = [];
  for (const bruto of linksBrutos.slice(0, PERFIL_LINKS_MAX)) {
    const l = bruto as Partial<LinkExternoPerfil> | null;
    if (
      l !== null &&
      typeof l === 'object' &&
      typeof l.label === 'string' &&
      l.label.trim().length > 0 &&
      isUrlCapaValida(l.url)
    ) {
      linksExternos.push({ label: l.label.slice(0, PERFIL_LINK_LABEL_MAX), url: l.url });
    }
  }

  return {
    handle,
    nome,
    indexavel: visibilidade === 'indexavel',
    linksExternos,
    ...(typeof bio === 'string' && bio.length > 0
      ? { bio: bio.slice(0, PERFIL_BIO_MAX) }
      : {}),
    ...(isUrlCapaValida(avatarUrl) ? { avatarUrl } : {}),
    ...(isUrlCapaValida(imagemUrl) ? { imagemUrl } : {}),
  };
}
