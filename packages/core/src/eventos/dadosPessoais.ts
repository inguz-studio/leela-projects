// =============================================================================
// packages/core/src/eventos/dadosPessoais.ts
//
// Bloco `[reg]` do Inscrito — dados pessoais do TITULAR (ADR-011 · S203-T3 ·
// LEELA-FABLE-A-T2). Coletados no checkout (S1202/S1203) POR INSCRITO: em
// pedido em grupo cada inscrito tem titular próprio; nada aqui é herdado do
// responsável/pagador do pedido (ADR-011).
//
// ⚠️ PII (LGPD): CPF, telefone, nascimento, contato de emergência e
// restrições médicas (dado SENSÍVEL — LGPD art. 5º, II). Quem lê: SÓ o
// organizador do tenant (Rules de `inscritos` — leitura via tenant do evento
// pai). Escrita: EXCLUSIVA da Function do checkout (S1203-T5) — o bloco
// inteiro entra em CAMPOS_FUNCTION_INSCRITO (ver inscrito.ts). O cliente
// (A-T3) deve MASCARAR CPF e telefone na renderização default.
//
// Nascimento é DATE-ONLY (`yyyy-mm-dd`): dia civil não tem fuso — reusa
// `isDataEventoISO` (fonte única de validação de data civil do produto).
// Timestamp UTC-midnight renderizaria o dia anterior no Brasil (mesma classe
// de bug do fix Onda1 #01/#02). Data sobrevive ao código — formato portável.
//
// `tamanhos` (RN-223 · S209-T1) vive junto por ser coletado no MESMO passo
// do checkout: map `itemId → tamanho`, um valor POR ITEM TAMANHADO do kit
// (nunca um campo único "camisa" — RN-212). A validação fina contra
// `tamanhosDisponiveis` do item é S209-T2 (fora desta task); aqui o parse
// garante só o SHAPE do map.
// =============================================================================

import { isDataEventoISO, dataLocalISO } from './dataEvento';

// ---------------------------------------------------------------------------
// Enums de domínio
// ---------------------------------------------------------------------------

/** Gênero declarado no checkout (S1202) */
export type GeneroInscrito = 'feminino' | 'masculino' | 'outro' | 'nao_informado';

/** Lista canônica de gêneros — única fonte para validação/UI */
export const GENEROS_INSCRITO: readonly GeneroInscrito[] = [
  'feminino',
  'masculino',
  'outro',
  'nao_informado',
];

/** Type guard de GeneroInscrito */
export function isGeneroInscrito(value: unknown): value is GeneroInscrito {
  return (
    typeof value === 'string' &&
    (GENEROS_INSCRITO as readonly string[]).includes(value)
  );
}

/** UFs do Brasil — produto Brasil-only na V1 (mesma premissa de FUSO_EVENTO) */
export const UFS_BRASIL: readonly string[] = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
];

/** Type guard de UF */
export function isUfBrasil(value: unknown): value is string {
  return typeof value === 'string' && UFS_BRASIL.includes(value);
}

// ---------------------------------------------------------------------------
// Validações puras de PII
// ---------------------------------------------------------------------------

/**
 * CPF válido? Aceita com ou sem máscara (`529.982.247-25` ou `52998224725`);
 * exige 11 dígitos, rejeita sequência de dígito único (000… a 999…) e
 * valida os DOIS dígitos verificadores (módulo 11). @pure
 */
export function cpfValido(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const digitos = value.replace(/\D/g, '');
  if (digitos.length !== 11 || value.replace(/[\d.\-\s]/g, '').length > 0) {
    return false;
  }
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  const dv = (corte: number): number => {
    let soma = 0;
    for (let i = 0; i < corte; i++) {
      soma += Number(digitos[i]) * (corte + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return dv(9) === Number(digitos[9]) && dv(10) === Number(digitos[10]);
}

/**
 * Telefone plausível? Aceita máscara livre (`(48) 99999-0001`, `+55 48 …`);
 * exige 10–13 dígitos (fixo BR a móvel com DDI). Validação PERMISSIVA de
 * propósito: telefone é dado de contato, não chave — rejeitar formato real
 * do checkout seria pior que aceitar variação de máscara. @pure
 */
export function telefoneValido(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const digitos = value.replace(/\D/g, '');
  return digitos.length >= 10 && digitos.length <= 13;
}

/**
 * Idade completa (anos) na data de referência, em dia civil do fuso do
 * produto (o slide-in mostra "Nascimento (+ idade)" — S203). @pure
 */
export function idadeNaData(
  nascimentoISO: string,
  referencia: Date,
  fuso?: string
): number {
  if (!isDataEventoISO(nascimentoISO)) {
    // Não ecoar a data de nascimento na mensagem (PII em log — LGPD).
    throw new Error('idadeNaData: nascimento não é data civil yyyy-mm-dd válida');
  }
  const refISO = dataLocalISO(referencia, fuso);
  const anos = Number(refISO.slice(0, 4)) - Number(nascimentoISO.slice(0, 4));
  // Ainda não fez aniversário no ano de referência? (compara mm-dd)
  return refISO.slice(5) < nascimentoISO.slice(5) ? anos - 1 : anos;
}

// ---------------------------------------------------------------------------
// Value objects
// ---------------------------------------------------------------------------

/** Contato de emergência (por inscrito — ADR-011; exigível por evento) */
export interface ContatoEmergencia {
  nome: string;
  telefone: string;
}

/**
 * Dados pessoais `[reg]` do titular da inscrição (aba Geral do slide-in —
 * S203). TODO o bloco é PII; escrita só pela Function do checkout.
 *
 * SCHEMA EVOLUTION (CKMOD · spec CHECKOUT-UX §5.1): o checkout ratificado
 * coleta POR ATLETA só CPF + nascimento (telefone é do RESPONSÁVEL → pedido;
 * gênero não ratificado; cidade/UF não coletados — endereço é do pedido).
 * O bloco gravado pelo checkout novo é PARCIAL; o leitor (parseDadosPessoais)
 * é Postel: campo AUSENTE normaliza para valor vazio/`nao_informado` (os
 * consumidores de exibição já degradam — máscaras/format do painel são
 * ''-safe); campo PRESENTE segue validação estrita (PII errada é pior que
 * ausente). `''` nestes campos significa "não coletado".
 */
export interface DadosPessoaisInscrito {
  /** CPF do titular (com ou sem máscara) — MASCARAR no cliente (A-T3) */
  cpf: string;
  /** Telefone de contato — MASCARAR no cliente (A-T3). '' = não coletado. */
  telefone: string;
  /** Nascimento date-only `yyyy-mm-dd` (dia civil). '' = não coletado. */
  nascimento: string;
  /** `nao_informado` quando o checkout não coletou (enum canônico). */
  genero: GeneroInscrito;
  /** '' = não coletado (checkout §5 não coleta cidade por atleta). */
  cidade: string;
  /** UF (sigla, ex.: "SC") — produto Brasil-only na V1. '' = não coletado. */
  uf: string;
  /** Presente quando o evento exige (ADR-011 — por inscrito, não herdado) */
  contatoEmergencia?: ContatoEmergencia;
  /** Dado SENSÍVEL (LGPD art. 5º, II) — texto livre do checkout */
  restricoesMedicas?: string;
}

// ---------------------------------------------------------------------------
// Parsing defensivo (fail-fast)
// ---------------------------------------------------------------------------

/**
 * Parsing do bloco `[reg]`. PII errada é pior que ausente — campo PRESENTE
 * fora do contrato lança em vez de renderizar dado corrompido. Leitura
 * POSTEL (CKMOD): campo AUSENTE (checkout §5 grava bloco PARCIAL —
 * cpf+nascimento; telefone só no inscrito-responsável) normaliza para
 * ''/`nao_informado` em vez de lançar — inscrição nova não pode quebrar o
 * slide-in/listagem do painel. CPF segue OBRIGATÓRIO (todo produtor do
 * bloco o coleta). `contexto` prefixa a mensagem: "Inscrito insc-0001". @pure
 */
export function parseDadosPessoais(
  contexto: string,
  raw: unknown
): DadosPessoaisInscrito {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${contexto}: "dadosPessoais" inválido (bloco [reg])`);
  }
  const data = raw as Record<string, unknown>;

  if (!cpfValido(data['cpf'])) {
    throw new Error(`${contexto}: "dadosPessoais.cpf" inválido (11 dígitos + DV)`);
  }
  if (data['telefone'] !== undefined && !telefoneValido(data['telefone'])) {
    throw new Error(`${contexto}: "dadosPessoais.telefone" inválido (10–13 dígitos)`);
  }
  if (data['nascimento'] !== undefined && !isDataEventoISO(data['nascimento'])) {
    throw new Error(
      `${contexto}: "dadosPessoais.nascimento" deve ser data civil yyyy-mm-dd válida`
    );
  }
  if (data['genero'] !== undefined && !isGeneroInscrito(data['genero'])) {
    throw new Error(
      `${contexto}: genero "${String(data['genero'])}" fora do enum canônico`
    );
  }
  if (
    data['cidade'] !== undefined &&
    (typeof data['cidade'] !== 'string' || data['cidade'].length === 0)
  ) {
    throw new Error(`${contexto}: "dadosPessoais.cidade" inválida`);
  }
  if (data['uf'] !== undefined && !isUfBrasil(data['uf'])) {
    throw new Error(`${contexto}: uf "${String(data['uf'])}" fora da lista de UFs`);
  }

  const dados: DadosPessoaisInscrito = {
    cpf: data['cpf'] as string,
    telefone: typeof data['telefone'] === 'string' ? data['telefone'] : '',
    nascimento: typeof data['nascimento'] === 'string' ? data['nascimento'] : '',
    genero: isGeneroInscrito(data['genero']) ? data['genero'] : 'nao_informado',
    cidade: typeof data['cidade'] === 'string' ? data['cidade'] : '',
    uf: typeof data['uf'] === 'string' ? data['uf'] : '',
  };

  if (data['contatoEmergencia'] !== undefined) {
    const contatoRaw = data['contatoEmergencia'];
    if (contatoRaw === null || typeof contatoRaw !== 'object') {
      throw new Error(`${contexto}: "dadosPessoais.contatoEmergencia" inválido`);
    }
    const contato = contatoRaw as Record<string, unknown>;
    if (typeof contato['nome'] !== 'string' || contato['nome'].length === 0) {
      throw new Error(`${contexto}: "contatoEmergencia.nome" inválido`);
    }
    if (!telefoneValido(contato['telefone'])) {
      throw new Error(`${contexto}: "contatoEmergencia.telefone" inválido`);
    }
    dados.contatoEmergencia = {
      nome: contato['nome'],
      telefone: contato['telefone'] as string,
    };
  }

  if (data['restricoesMedicas'] !== undefined) {
    if (
      typeof data['restricoesMedicas'] !== 'string' ||
      data['restricoesMedicas'].length === 0
    ) {
      throw new Error(
        `${contexto}: "dadosPessoais.restricoesMedicas" deve ser texto não-vazio ` +
          `(quando ausente, omitir o campo)`
      );
    }
    dados.restricoesMedicas = data['restricoesMedicas'];
  }

  return dados;
}

/**
 * Parsing do map `tamanhos` (RN-223 · S209-T1): `itemId → tamanho`, um valor
 * por item TAMANHADO do kit. Ausente/null normaliza para `{}` (kit sem item
 * tamanhado e docs legados pré-S209). Shape-only: a validação contra
 * `tamanhosDisponiveis` do item é S209-T2. @pure
 */
export function parseTamanhos(
  contexto: string,
  raw: unknown
): Record<string, string> {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${contexto}: "tamanhos" deve ser map itemId → tamanho (RN-223)`);
  }
  const tamanhos: Record<string, string> = {};
  for (const [itemId, tamanho] of Object.entries(raw as Record<string, unknown>)) {
    if (itemId.length === 0 || typeof tamanho !== 'string' || tamanho.length === 0) {
      throw new Error(
        `${contexto}: tamanhos["${itemId}"] inválido — tamanho deve ser ` +
          `string não-vazia por item tamanhado (RN-223)`
      );
    }
    tamanhos[itemId] = tamanho;
  }
  return tamanhos;
}
