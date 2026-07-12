// =============================================================================
// Validação client-side do checkout — REUSA os validadores do core (fonte
// única), nunca reimplementa regra. `validarDadosMinimosInscrito` é a MESMA
// fronteira que o servidor aplica (createInscricaoCharge) — a UI só antecipa o
// erro inline para bloquear o avanço (aceite S1203).
// =============================================================================

import {
  INSCRITO_NOME_MIN,
  cpfValido,
  validarEmail,
} from '@leela/core';
import type { InscritoForm } from './tipos';

/** Erros por campo de um inscrito (chave = campo). Vazio = válido. */
export interface ErrosInscrito {
  nome?: string;
  email?: string;
  cpf?: string;
}

/** Valida nome/email/CPF de um inscrito (etapa Dados). @pure */
export function validarInscrito(inscrito: InscritoForm): ErrosInscrito {
  const erros: ErrosInscrito = {};
  if (inscrito.nome.trim().length < INSCRITO_NOME_MIN) {
    erros.nome = `Informe o nome completo (mínimo ${INSCRITO_NOME_MIN} caracteres).`;
  }
  if (!validarEmail(inscrito.email)) {
    erros.email = 'E-mail inválido.';
  }
  if (!cpfValido(inscrito.cpf)) {
    erros.cpf = 'CPF inválido (11 dígitos + verificadores).';
  }
  return erros;
}

/** Erros do responsável/pagador (só nome + email — ADR-011). */
export interface ErrosResponsavel {
  nome?: string;
  email?: string;
}

/** Valida o responsável/pagador do pedido (etapa Dados). @pure */
export function validarResponsavel(nome: string, email: string): ErrosResponsavel {
  const erros: ErrosResponsavel = {};
  if (nome.trim().length < 3) {
    erros.nome = 'Informe o nome do responsável (mínimo 3 caracteres).';
  }
  if (!validarEmail(email)) {
    erros.email = 'E-mail inválido.';
  }
  return erros;
}

/** Há algum erro no objeto de erros? */
export function temErro<T extends object>(erros: T): boolean {
  return Object.values(erros).some((v) => v !== undefined);
}
