// =============================================================================
// packages/core/src/pedidos/endereco.ts
//
// Endereço do PEDIDO — NOVO no core (LEELA-CKMOD · spec CHECKOUT-UX §5.1/§5.2,
// ratificada pelo Vitor 2026-07-18).
//
// ONDE MORA (premissa ratificável da spec §5.4-ii): o endereço é do
// COMPRADOR/RESPONSÁVEL — 1× por pedido, coletado no checkout DEPOIS dos
// atletas. Vive em `pedidos/{id}.endereco`, NUNCA por inscrito (ADR-011 não
// se aplica: endereço não é dado do titular da inscrição, é logística do
// pagador). Escrita EXCLUSIVA da Function do checkout — as Rules de `pedidos`
// negam TODA escrita de cliente (write false), então o campo é inforjável
// por construção.
//
// ⚠️ PII + MINIMIZAÇÃO (RN-172/LGPD): endereço é dado pessoal. Leitura segue
// a do pedido (tenant writer + platform_admin). O doc do CRM
// (`tenants/{t}/clientes`) NÃO ganha endereço — a agregação do CRM lê
// INSCRITOS (nunca o pedido), e a allowlist RN-172 do cliente não inclui
// endereço; incluir exige decisão explícita registrada (premissa CKMOD).
// O lookup de CEP (ViaCEP) recebe SÓ o CEP — nunca nome/CPF junto (spec §5.2).
//
// CEP: persistido NORMALIZADO (8 dígitos, sem máscara) — formato portável;
// máscara `00000-000` é da UI. Fallback manual da spec §5.2 (lookup fora):
// os campos chegam DIGITADOS — a validação daqui é a mesma (fail-open de UI,
// fail-closed de shape no servidor).
// =============================================================================

import { isUfBrasil } from '../eventos/dadosPessoais';

// ---------------------------------------------------------------------------
// Limites de shape (tetos sanitários — payload direto não vira doc-bomba)
// ---------------------------------------------------------------------------

export const ENDERECO_LOGRADOURO_MAX = 200;
export const ENDERECO_CAMPO_MAX = 120;
export const ENDERECO_NUMERO_MAX = 20;

/** Endereço do comprador/responsável — 1× por pedido (spec §5.1 item 3). */
export interface EnderecoPedido {
  /** CEP normalizado: EXATAMENTE 8 dígitos, sem máscara. */
  cep: string;
  logradouro: string;
  /** Bairro pode ser vazio (CEP rural/novo — lookup não devolve). */
  bairro: string;
  cidade: string;
  /** UF (sigla) — mesma lista canônica do bloco [reg] (UFS_BRASIL). */
  uf: string;
  /** Número — texto ("s/n" é endereço legítimo). */
  numero: string;
  complemento?: string;
}

/**
 * Normaliza um CEP de entrada (com ou sem máscara) para 8 dígitos.
 * NÃO valida — devolve só os dígitos; `cepValido` decide. @pure
 */
export function normalizarCep(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

/**
 * CEP plausível? 8 dígitos exatos após normalização, e a entrada não carrega
 * lixo além de dígitos/hífen/espaço (mesma postura de `cpfValido`). @pure
 */
export function cepValido(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (value.replace(/[\d\-\s]/g, '').length > 0) return false;
  return normalizarCep(value).length === 8;
}

/**
 * Valida o SHAPE de um endereço de pedido (payload do checkout). Retorna a
 * lista de erros — vazia = válido (mesmo idioma de validarPoliticaVendas).
 * NÃO ecoa valores nas mensagens (endereço é PII — LGPD). @pure
 */
export function validarEnderecoPedido(raw: unknown): string[] {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['"endereco" deve ser objeto {cep, logradouro, bairro, cidade, uf, numero, complemento?}.'];
  }
  const e = raw as Record<string, unknown>;
  const erros: string[] = [];

  if (!cepValido(e['cep'])) {
    erros.push('"endereco.cep" inválido (8 dígitos).');
  }
  const logradouro = e['logradouro'];
  if (
    typeof logradouro !== 'string' ||
    logradouro.trim().length === 0 ||
    logradouro.length > ENDERECO_LOGRADOURO_MAX
  ) {
    erros.push(`"endereco.logradouro" é obrigatório (1..${ENDERECO_LOGRADOURO_MAX} caracteres).`);
  }
  const bairro = e['bairro'];
  if (typeof bairro !== 'string' || bairro.length > ENDERECO_CAMPO_MAX) {
    erros.push(`"endereco.bairro" deve ser texto ≤ ${ENDERECO_CAMPO_MAX} caracteres (pode ser vazio).`);
  }
  const cidade = e['cidade'];
  if (
    typeof cidade !== 'string' ||
    cidade.trim().length === 0 ||
    cidade.length > ENDERECO_CAMPO_MAX
  ) {
    erros.push(`"endereco.cidade" é obrigatória (1..${ENDERECO_CAMPO_MAX} caracteres).`);
  }
  if (!isUfBrasil(e['uf'])) {
    erros.push('"endereco.uf" fora da lista de UFs.');
  }
  const numero = e['numero'];
  if (
    typeof numero !== 'string' ||
    numero.trim().length === 0 ||
    numero.length > ENDERECO_NUMERO_MAX
  ) {
    erros.push(`"endereco.numero" é obrigatório (1..${ENDERECO_NUMERO_MAX} caracteres).`);
  }
  const complemento = e['complemento'];
  if (
    complemento !== undefined &&
    (typeof complemento !== 'string' ||
      complemento.trim().length === 0 ||
      complemento.length > ENDERECO_CAMPO_MAX)
  ) {
    erros.push(
      `"endereco.complemento" deve ser texto não-vazio ≤ ${ENDERECO_CAMPO_MAX} caracteres (quando ausente, omitir).`
    );
  }
  return erros;
}

/**
 * Parsing defensivo do endereço persistido no pedido (fail-fast — PII errada
 * é pior que ausente, mesma regra de parseDadosPessoais). Normaliza o CEP
 * para 8 dígitos (docs sempre canônicos). @pure
 */
export function parseEnderecoPedido(contexto: string, raw: unknown): EnderecoPedido {
  const erros = validarEnderecoPedido(raw);
  if (erros.length > 0) {
    throw new Error(`${contexto}: "endereco" inválido — ${erros.join(' ')}`);
  }
  const e = raw as Record<string, unknown>;
  const endereco: EnderecoPedido = {
    cep: normalizarCep(e['cep']),
    logradouro: (e['logradouro'] as string).trim(),
    bairro: (e['bairro'] as string).trim(),
    cidade: (e['cidade'] as string).trim(),
    uf: e['uf'] as string,
    numero: (e['numero'] as string).trim(),
  };
  if (e['complemento'] !== undefined) {
    endereco.complemento = (e['complemento'] as string).trim();
  }
  return endereco;
}
