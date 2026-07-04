// =============================================================================
// Portas reais das mutations de membros/convites (E05-L4 · wire dos containers).
//
// Os wrappers `removerMembro` / `transferirPropriedade` / `enviarConvites`
// (packages/api-client/src/clubs.ts · lote E05-L2, PUBLICADOS) recebem a
// instância de `Functions` como 1º argumento; aqui a injetamos com
// `getLeelaFunctions()` para expor assinaturas finas que os containers de tela
// consomem sem conhecer o Firebase. Em teste injeta-se um mock destas portas.
//
// Autorização, guardas (owner não removível — `failed-precondition`, RN-106
// revalidada no servidor) e recontagem de agregados ∑ são do SERVIDOR.
// =============================================================================

import {
  enviarConvites,
  getLeelaFunctions,
  removerMembro,
  transferirPropriedade,
  type EnviarConvitesResult,
  type RemoverMembroResult,
  type TransferirPropriedadeResult,
} from '@leela/api-client';

/** Porta fina: remove um membro do clube (recontagem ∑ no servidor). */
export const removerMembroPadrao = (
  clubeId: string,
  membroId: string,
): Promise<RemoverMembroResult> =>
  removerMembro(getLeelaFunctions(), clubeId, membroId);

/** Porta fina: transfere a propriedade do clube (transação atômica). */
export const transferirPropriedadePadrao = (
  clubeId: string,
  membroId: string,
): Promise<TransferirPropriedadeResult> =>
  transferirPropriedade(getLeelaFunctions(), clubeId, membroId);

/** Porta fina: envia convites por email (RN-106 revalidada no servidor). */
export const enviarConvitesPadrao = (
  clubeId: string,
  emails: string[],
): Promise<EnviarConvitesResult> =>
  enviarConvites(getLeelaFunctions(), clubeId, emails);

// ---------------------------------------------------------------------------
// Helper de erro — a UI distingue "owner não removível" (failed-precondition)
// dos demais erros de rede para dar o feedback certo (§2.12).
// ---------------------------------------------------------------------------

/** True se o erro do callable é um `failed-precondition` (guarda de servidor). */
export function isFailedPrecondition(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' && code.includes('failed-precondition');
}
