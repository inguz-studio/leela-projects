// =============================================================================
// Validação client-side do checkout — REUSA os validadores do core (fonte
// única), nunca reimplementa regra. `validarDadosMinimosInscrito` é a MESMA
// fronteira que o servidor aplica (createInscricaoCharge) — a UI só antecipa o
// erro inline para bloquear o avanço (aceite S1203).
//
// CKFORM (spec §5.1, ratificada 2026-07-18): telefone (responsável),
// nascimento (por atleta) e endereço (1× por pedido) passam a ser COLETADOS —
// obrigatórios AQUI (o form coleta de verdade); no servidor seguem opcionais-
// estritos por compat (o flip duro server-side é só dos ACEITES — F-4a).
// Primitivas de regra continuam as do core: telefoneValido, cepValido,
// isUfBrasil, isDataEventoISO/NASCIMENTO_MIN_ISO, dataLocalISO.
// =============================================================================

import {
  INSCRITO_NOME_MIN,
  NASCIMENTO_MIN_ISO,
  cpfValido,
  cepValido,
  dataLocalISO,
  isDataEventoISO,
  isUfBrasil,
  telefoneValido,
  validarEmail,
} from '@leela/core';
import type { EnderecoForm, InscritoForm } from './tipos';

/** Erros por campo de um inscrito (chave = campo). Vazio = válido. */
export interface ErrosInscrito {
  nome?: string;
  email?: string;
  cpf?: string;
  nascimento?: string;
}

/** Valida nome/email/CPF/nascimento de um inscrito (etapa Dados). @pure */
export function validarInscrito(
  inscrito: InscritoForm,
  hojeISO: string = dataLocalISO(new Date())
): ErrosInscrito {
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
  // CKFORM §5.1 item 2 — mesmas fronteiras do core (validarDadosMinimosInscrito).
  if (inscrito.nascimento.length === 0) {
    erros.nascimento = 'Informe a data de nascimento.';
  } else if (
    !isDataEventoISO(inscrito.nascimento) ||
    inscrito.nascimento < NASCIMENTO_MIN_ISO ||
    inscrito.nascimento >= hojeISO
  ) {
    erros.nascimento = 'Data de nascimento inválida (deve ser no passado).';
  }
  return erros;
}

/** Erros do responsável/pagador (nome + email + telefone — CKFORM §5.1). */
export interface ErrosResponsavel {
  nome?: string;
  email?: string;
  telefone?: string;
}

/** Valida o responsável/pagador do pedido (etapa Dados). @pure */
export function validarResponsavel(
  nome: string,
  email: string,
  telefone: string
): ErrosResponsavel {
  const erros: ErrosResponsavel = {};
  if (nome.trim().length < 3) {
    erros.nome = 'Informe o nome do responsável (mínimo 3 caracteres).';
  }
  if (!validarEmail(email)) {
    erros.email = 'E-mail inválido.';
  }
  // CKFORM §5.1 item 1 — canal de contato do pedido; fonte única telefoneValido.
  if (telefone.trim().length === 0) {
    erros.telefone = 'Informe o telefone celular (canal de contato do pedido).';
  } else if (!telefoneValido(telefone)) {
    erros.telefone = 'Telefone inválido (DDD + número).';
  }
  return erros;
}

/** Erros por campo do endereço do comprador (CKFORM §5.1 item 3). */
export interface ErrosEndereco {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  numero?: string;
}

/**
 * Valida o endereço no avanço da etapa Dados. Primitivas do core (cepValido/
 * isUfBrasil); shape completo é re-validado no servidor por
 * validarEnderecoPedido — aqui é UX imediata, campo a campo. Bairro pode ser
 * vazio (CEP rural/novo); complemento é opcional. @pure
 */
export function validarEndereco(endereco: EnderecoForm): ErrosEndereco {
  const erros: ErrosEndereco = {};
  if (!cepValido(endereco.cep)) {
    erros.cep = 'CEP inválido (8 dígitos).';
  }
  if (endereco.logradouro.trim().length === 0) {
    erros.logradouro = 'Informe o logradouro (rua/avenida).';
  }
  if (endereco.cidade.trim().length === 0) {
    erros.cidade = 'Informe a cidade.';
  }
  if (!isUfBrasil(endereco.uf)) {
    erros.uf = 'Escolha a UF.';
  }
  if (endereco.numero.trim().length === 0) {
    erros.numero = 'Informe o número (ou "s/n").';
  }
  return erros;
}

/** Há algum erro no objeto de erros? */
export function temErro<T extends object>(erros: T): boolean {
  return Object.values(erros).some((v) => v !== undefined);
}
