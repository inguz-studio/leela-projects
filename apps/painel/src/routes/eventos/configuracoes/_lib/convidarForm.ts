// =============================================================================
// Validação pura do form de convite de membro (S304-T3 · E04-L5). `nome` é
// obrigatório (a Rule exige nome não-vazio no convite); `email` é opcional mas,
// quando informado, precisa ter forma de e-mail; `papel` precisa estar entre os
// papéis que o gestor pode convidar (`papeisConvidaveis`). Sem React.
// =============================================================================

import { isPapelEvento, type PapelEvento } from '@leela/core';

/** Estado controlado do form de convite. */
export interface ConvidarValues {
  nome: string;
  email: string;
  papel: string;
}

/** Erros por campo — chave ausente = válido. */
export interface ErrosConvidar {
  nome?: string;
  email?: string;
  papel?: string;
}

// Forma mínima de e-mail (não é validação de entrega — só evita lixo óbvio).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida o convite. `papeisPermitidos` vem de `papeisConvidaveis(gestor)` — o
 * papel escolhido precisa estar nela (e ser um PapelEvento válido). @pure
 */
export function validaConvidar(
  v: ConvidarValues,
  papeisPermitidos: readonly PapelEvento[]
): { valido: boolean; erros: ErrosConvidar } {
  const erros: ErrosConvidar = {};

  if (v.nome.trim().length === 0) {
    erros.nome = 'Informe o nome do membro.';
  }

  const email = v.email.trim();
  if (email.length > 0 && !EMAIL_RE.test(email)) {
    erros.email = 'E-mail inválido.';
  }

  if (
    !isPapelEvento(v.papel) ||
    !papeisPermitidos.includes(v.papel)
  ) {
    erros.papel = 'Escolha um papel válido.';
  }

  return { valido: Object.keys(erros).length === 0, erros };
}
