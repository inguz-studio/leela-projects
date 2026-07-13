// =============================================================================
// packages/core/src/comunicacao/canal.ts
//
// PRIMITIVAS AGNÓSTICAS DE COMUNICAÇÃO — fonte ÚNICA (LEELA-E06-L1-T1).
// Extraídas de `clubs/comunicado.ts` (Camada A do plano E06-L1): literais de
// canal/status/origem, constantes de segurança de push e helpers de corpo.
// O comunicado do CLUBE (E05) e a campanha do EVENTO (E06) importam DAQUI —
// o clube re-exporta em `clubs/comunicado.ts` para manter todos os callers
// existentes válidos (API pública estável, baseline E05 intacto).
//
// POR QUE fonte única (decisão do brief E06-L1): `PUSH_MAX_CHARS` e
// `PUSH_SEMANA_MAX` são constantes de SEGURANÇA que batem no celular real de
// um usuário. Se derivarem entre clube e evento, uma superfície passa a
// permitir 5 push/semana ou 161 chars — bug, não estilo. Qualquer épico
// futuro que envie push (Automações Onda 3, Notificações) DEVE importar
// daqui, nunca redeclarar.
//
// Gênero dos códigos de status (decisão item 9 do brief, verificada no
// código): os códigos persistidos são os MASCULINOS `rascunho`/`agendado`/
// `enviado` nos DOIS lados — código de dado é gênero-neutro por convenção;
// "Enviada/Agendada" é rótulo de UI (glossário), nunca literal de dado.
//
// RNs: RN-130 (3 estados), RN-131 (2 canais), RN-132 (2 origens),
//      RN-133 (4 push/semana), RN-134 (push ≤ 160 chars).
// =============================================================================

// ---------------------------------------------------------------------------
// Literal types (idênticos nos dois lados — Camada A)
// ---------------------------------------------------------------------------

/** Estado da comunicação (RN-130) — códigos compartilhados clube/evento */
export type StatusComunicado = 'rascunho' | 'agendado' | 'enviado';

/** Canal de disparo (RN-131) — `canal[]` aceita um ou ambos */
export type CanalComunicado = 'push' | 'email';

/** Origem do disparo (RN-132) */
export type OrigemComunicado = 'manual' | 'automatizada';

export const STATUS_COMUNICADO: readonly StatusComunicado[] = [
  'rascunho',
  'agendado',
  'enviado',
];
export const CANAIS_COMUNICADO: readonly CanalComunicado[] = ['push', 'email'];
export const ORIGENS_COMUNICADO: readonly OrigemComunicado[] = [
  'manual',
  'automatizada',
];

export function isStatusComunicado(v: unknown): v is StatusComunicado {
  return STATUS_COMUNICADO.includes(v as StatusComunicado);
}

export function isCanalComunicado(v: unknown): v is CanalComunicado {
  return CANAIS_COMUNICADO.includes(v as CanalComunicado);
}

export function isOrigemComunicado(v: unknown): v is OrigemComunicado {
  return ORIGENS_COMUNICADO.includes(v as OrigemComunicado);
}

// ---------------------------------------------------------------------------
// Limites de segurança de push (RN-133/134) — fonte única
// ---------------------------------------------------------------------------

/** Máximo de caracteres do corpo de um push (RN-134) */
export const PUSH_MAX_CHARS = 160;

/** Máximo de comunicações push por agregado-pai (clube/evento) por semana (RN-133) */
export const PUSH_SEMANA_MAX = 4;

/** A comunicação dispara push? (o limite RN-133 só se aplica a estas) */
export function temCanalPush(canal: readonly CanalComunicado[]): boolean {
  return canal.includes('push');
}

// ---------------------------------------------------------------------------
// Helpers de corpo (RN-134)
// ---------------------------------------------------------------------------

/** Conta caracteres por code point (emoji não vira "2 chars"). @pure */
export function contarChars(texto: string): number {
  return Array.from(texto).length;
}

/**
 * Trunca o corpo do push em `PUSH_MAX_CHARS` preservando integridade:
 * corta por CODE POINT (nunca no meio de um surrogate pair/emoji).
 * Texto dentro do limite volta intacto. @pure
 */
export function truncarPush(texto: string): string {
  const pontos = Array.from(texto);
  if (pontos.length <= PUSH_MAX_CHARS) return texto;
  return pontos.slice(0, PUSH_MAX_CHARS).join('');
}
