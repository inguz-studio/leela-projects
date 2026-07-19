// =============================================================================
// packages/core/src/checkout/validarDados.ts
//
// Validação dos dados do inscrito no checkout (LEELA-E12 · fundação ·
// CKMOD: telefone/nascimento DESTRAVADOS — spec CHECKOUT-UX §5.1, ratificada
// 2026-07-18).
//
// Escopo vigente: nome/email/CPF obrigatórios + `nascimento` OPCIONAL por
// atleta (novo — o form §5.1 coleta por atleta; opcional enquanto a UI nova
// não é o único produtor: inscrição da UI antiga segue válida — compat
// Postel, demografia/CRM já tratam ausência) + `telefone` OPCIONAL (o form
// §5.1 coleta telefone do RESPONSÁVEL; o campo por atleta fica aceito para o
// inscrito-responsável e produtores futuros). O bloco `[reg]` COMPLETO
// (gênero, cidade/UF, emergência, restrições) segue compliance S1207;
// `parseDadosPessoais` (dadosPessoais.ts) é a fronteira de leitura.
//
// REUSO: CPF via `cpfValido`, telefone via `telefoneValido` (dadosPessoais.ts
// — fontes únicas); nascimento via `isDataEventoISO` (data civil date-only,
// mesma fonte do bloco [reg]); email via `validarEmail` (clubs/convite.ts).
// Padrão de retorno: lista de erros (vazia = válido) — mesmo idioma de
// `validateCommercialTerms`/`validarCriarEventoInput`.
// =============================================================================

import {
  cpfValido,
  isGeneroInscrito,
  telefoneValido,
  type GeneroInscrito,
} from '../eventos/dadosPessoais';
import { isDataEventoISO } from '../eventos/dataEvento';
import { validarEmail } from '../clubs/convite';

/** Dados de UM inscrito no checkout (fundação E12 + CKMOD §5.1 + CK2). */
export interface DadosMinimosInscrito {
  nome: string;
  email: string;
  /** CPF com ou sem máscara — validado com DV (cpfValido). */
  cpf: string;
  /** Telefone BR com máscara livre (10–13 dígitos) — opcional (CKMOD). */
  telefone?: string;
  /** Nascimento date-only `yyyy-mm-dd`, no passado — opcional (CKMOD). */
  nascimento?: string;
  /**
   * Gênero POR INSCRITO (CK2 · RN-154) — enum canônico GENEROS_INSCRITO
   * (REUSO do vocabulário do agregado demográfico RN-820/822; nunca enum
   * paralelo). Opcional (compat UI antiga); presente deve estar no enum —
   * `'nao_informado'` é valor legítimo (respeita quem não declara).
   */
  genero?: GeneroInscrito;
}

/** Limites de shape (alinhados a validarCriarEventoInput). */
export const INSCRITO_NOME_MIN = 3;
export const INSCRITO_NOME_MAX = 120;

/**
 * Piso de plausibilidade do nascimento (CKMOD): ninguém correndo prova
 * nasceu antes disso — data menor é erro de digitação/forja, não atleta.
 */
export const NASCIMENTO_MIN_ISO = '1900-01-01';

/**
 * Valida os dados de um inscrito (nome/email/CPF + telefone/nascimento
 * opcionais — CKMOD). Retorna a lista de erros — vazia = válido. NÃO ecoa
 * CPF/telefone/nascimento na mensagem (PII em log — LGPD, mesma regra de
 * idadeNaData).
 *
 * `hojeISO` (data civil `yyyy-mm-dd` do RELÓGIO INJETADO do chamador —
 * dataLocalISO(agora)): quando presente, nascimento deve ser ANTERIOR a hoje
 * ("passado válido"); ausente, valida só formato/piso (chamadas puras sem
 * relógio). @pure
 */
export function validarDadosMinimosInscrito(
  raw: unknown,
  hojeISO?: string
): string[] {
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

  // CKMOD — telefone: opcional; presente deve ser plausível (fonte única).
  if (dados['telefone'] !== undefined && !telefoneValido(dados['telefone'])) {
    erros.push('"telefone" inválido (10–13 dígitos).');
  }

  // CKMOD — nascimento: opcional; presente deve ser data civil válida,
  // ≥ 1900-01-01 e ANTERIOR a hoje (quando o relógio foi injetado).
  // Comparação LEXICOGRÁFICA de yyyy-mm-dd (ordem de string = ordem de dia
  // civil — mesma técnica de idadeNaData, sem Date/fuso).
  const nascimento = dados['nascimento'];
  if (nascimento !== undefined) {
    if (!isDataEventoISO(nascimento)) {
      erros.push('"nascimento" deve ser data civil yyyy-mm-dd válida.');
    } else if (nascimento < NASCIMENTO_MIN_ISO) {
      erros.push(`"nascimento" deve ser a partir de ${NASCIMENTO_MIN_ISO}.`);
    } else if (hojeISO !== undefined && nascimento >= hojeISO) {
      erros.push('"nascimento" deve ser data no passado.');
    }
  }

  // CK2 (RN-154) — gênero: opcional; presente deve estar no enum canônico
  // (fonte única GENEROS_INSCRITO — o mesmo que a demografia RN-820/822 lê).
  if (dados['genero'] !== undefined && !isGeneroInscrito(dados['genero'])) {
    erros.push('"genero" fora do enum canônico (RN-154).');
  }

  return erros;
}
