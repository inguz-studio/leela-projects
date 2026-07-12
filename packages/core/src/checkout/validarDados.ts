// =============================================================================
// packages/core/src/checkout/validarDados.ts
//
// Validação MÍNIMA dos dados do inscrito no checkout (LEELA-E12 · fundação).
//
// Escopo travado pelo brief: nome/email/CPF — o suficiente para criar o
// pedido e emitir a cobrança. O bloco `[reg]` COMPLETO (telefone, nascimento,
// gênero, cidade/UF, emergência, restrições) é compliance S1207 (outro lote);
// quando a UI coletar o bloco inteiro, `parseDadosPessoais` (dadosPessoais.ts)
// é a fronteira — esta validação NÃO o substitui.
//
// REUSO: CPF via `cpfValido` (dadosPessoais.ts — DV módulo 11); email via
// `validarEmail` (clubs/convite.ts — fonte única de validação de email).
// Padrão de retorno: lista de erros (vazia = válido) — mesmo idioma de
// `validateCommercialTerms`/`validarCriarEventoInput`.
// =============================================================================

import { cpfValido } from '../eventos/dadosPessoais';
import { validarEmail } from '../clubs/convite';

/** Dados mínimos de UM inscrito no checkout (fundação E12). */
export interface DadosMinimosInscrito {
  nome: string;
  email: string;
  /** CPF com ou sem máscara — validado com DV (cpfValido). */
  cpf: string;
}

/** Limites de shape (alinhados a validarCriarEventoInput). */
export const INSCRITO_NOME_MIN = 3;
export const INSCRITO_NOME_MAX = 120;

/**
 * Valida os dados mínimos de um inscrito (nome/email/CPF).
 * Retorna a lista de erros — vazia = válido. NÃO ecoa o CPF na mensagem
 * (PII em log — LGPD, mesma regra de idadeNaData). @pure
 */
export function validarDadosMinimosInscrito(raw: unknown): string[] {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Dados do inscrito são obrigatórios (nome, email, cpf).'];
  }
  const dados = raw as Record<string, unknown>;
  const erros: string[] = [];

  const nome = dados['nome'];
  if (typeof nome !== 'string' || nome.trim().length < INSCRITO_NOME_MIN) {
    erros.push(`"nome" é obrigatório (mínimo ${INSCRITO_NOME_MIN} caracteres).`);
  } else if (nome.trim().length > INSCRITO_NOME_MAX) {
    erros.push(`"nome" excede ${INSCRITO_NOME_MAX} caracteres.`);
  }

  const email = dados['email'];
  if (typeof email !== 'string' || !validarEmail(email)) {
    erros.push('"email" inválido.');
  }

  if (!cpfValido(dados['cpf'])) {
    erros.push('"cpf" inválido (11 dígitos + dígitos verificadores).');
  }

  return erros;
}
