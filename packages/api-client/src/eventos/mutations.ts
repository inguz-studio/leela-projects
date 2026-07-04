// =============================================================================
// packages/api-client/src/eventos/mutations.ts
//
// Wrappers tipados das Cloud Functions de evento (LEELA-S201-T2 · E03).
//
// ADR-005: escrita transacional/sensível de evento passa por Cloud Function —
// o cliente NUNCA grava status/slug/agregados diretamente. Estes wrappers só
// tipam o contrato; validação e autorização REAIS acontecem no servidor.
//
// Uso (painel):
//   const fns = getLeelaFunctions();
//   const { eventoId } = await criarEvento(fns, { nome, data, local, modalidades });
//   const { url, qrUrl } = await publicarEvento(fns, eventoId);
// =============================================================================

import { httpsCallable, type Functions } from 'firebase/functions';

// ---------------------------------------------------------------------------
// Contratos (espelham functions/src/eventos — fonte única no servidor)
// ---------------------------------------------------------------------------

/** Percurso com preço independente (S201-T1, RN-200). Preço em reais, ≥ 0. */
export interface CriarEventoPercurso {
  nome: string;
  preco: number;
}

/**
 * Input de criação de evento (validado NO SERVIDOR — S201-T2).
 * Shape confirmado com o L3 (`apps/painel/.../eventos/_data/contracts.ts`).
 */
export interface CriarEventoInput {
  nome: string;
  /** Data da prova — ISO 8601, futura */
  data: string;
  local: string;
  /** Nomes de percursos/modalidades — mínimo 1 */
  modalidades: string[];
  /** Percursos com preço independente — mínimo 1 (RN-200) */
  percursos: CriarEventoPercurso[];
  /** Usa chip de cronometragem (RN-207) — default false */
  usaChip?: boolean;
  descricao?: string;
}

export interface CriarEventoResult {
  eventoId: string;
  slug: string;
}

export interface PublicarEventoResult {
  /** URL pública da página do evento (beh.ro/{slug} — RN-201) */
  url: string;
  /** Data URI (image/png) do QR com a URL como payload (RN-201) */
  qrUrl: string;
  /** true quando o evento já estava publicado (retry idempotente) */
  replay: boolean;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Cria um evento como rascunho via Cloud Function `criarEvento`.
 * Servidor valida input, gera slug único e carimba organizadorId = caller.
 */
export async function criarEvento(
  functions: Functions,
  input: CriarEventoInput
): Promise<CriarEventoResult> {
  const call = httpsCallable<CriarEventoInput, CriarEventoResult>(
    functions,
    'criarEvento'
  );
  return (await call(input)).data;
}

/**
 * Publica um rascunho via Cloud Function `publicarEvento` (RN-201).
 * Idempotente: republicar devolve o mesmo { url, qrUrl } com replay=true.
 */
export async function publicarEvento(
  functions: Functions,
  eventoId: string
): Promise<PublicarEventoResult> {
  const call = httpsCallable<{ eventoId: string }, PublicarEventoResult>(
    functions,
    'publicarEvento'
  );
  return (await call({ eventoId })).data;
}
