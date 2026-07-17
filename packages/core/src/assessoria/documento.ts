// =============================================================================
// packages/core/src/assessoria/documento.ts
//
// Documento da assessoria parceira — CNPJ/CPF (LEELA-E18 · S1800-T1 · RN-361).
//
// Validação PURA de formato + dígito verificador (algoritmo oficial RFB) e
// normalização canônica (só dígitos). O documento normalizado é a CHAVE DE
// DEDUPE do club parceiro dentro do tenant (RN-361): o docId da parceria É o
// documento normalizado — unicidade por chave, mesmo truque do cupom
// (E04/S300) e do commercialTerms/v{n}: empurrar o invariante para a chave e
// deixar o banco garantir (Kleppmann — unicidade cross-doc não é exprimível
// em Rules; via docId é grátis).
//
// CPF (11 dígitos) e CNPJ (14 dígitos) não colidem em comprimento — o docId
// `apenas dígitos` é inequívoco sem prefixo de tipo.
//
// Usos: form do painel (feedback inline — S1800-T1 Opus), Function
// `cadastrarAssessoriaParceira` (fronteira de segurança — S1800-T2) e testes.
// =============================================================================

/** Tipo do documento da assessoria (RN-361). */
export type TipoDocumento = 'cpf' | 'cnpj';

export const TIPOS_DOCUMENTO: readonly TipoDocumento[] = ['cpf', 'cnpj'];

/** Type guard de TipoDocumento. @pure */
export function isTipoDocumento(v: unknown): v is TipoDocumento {
  return typeof v === 'string' && (TIPOS_DOCUMENTO as readonly string[]).includes(v);
}

/** Documento estruturado — persiste no clube e na parceria (RN-361). */
export interface DocumentoAssessoria {
  tipo: TipoDocumento;
  /** Apenas dígitos (11 = CPF, 14 = CNPJ) — forma canônica. */
  valor: string;
}

// ---------------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------------

/**
 * Normaliza um documento bruto para a forma canônica: SÓ dígitos.
 * "12.345.678/0001-95" → "12345678000195"; "111.444.777-35" → "11144477735".
 * @pure
 */
export function normalizarDocumento(bruto: string): string {
  return typeof bruto === 'string' ? bruto.replace(/\D/g, '') : '';
}

/**
 * Deriva o tipo pelo COMPRIMENTO do documento normalizado (11=CPF, 14=CNPJ).
 * `null` = comprimento fora do domínio (nem CPF nem CNPJ). @pure
 */
export function tipoDoDocumento(normalizado: string): TipoDocumento | null {
  if (normalizado.length === 11) return 'cpf';
  if (normalizado.length === 14) return 'cnpj';
  return null;
}

// ---------------------------------------------------------------------------
// Dígitos verificadores (algoritmo oficial)
// ---------------------------------------------------------------------------

/** Todos os caracteres iguais? (CPF/CNPJ "11111111111" passa no DV mas é inválido) @pure */
function todosIguais(s: string): boolean {
  return s.length > 0 && s.split('').every((c) => c === s[0]);
}

/** DV de CPF: soma ponderada decrescente a partir de `peso`, módulo 11. @pure */
function dvCpf(digitos: string, peso: number): number {
  let soma = 0;
  for (let i = 0; i < digitos.length; i++) {
    soma += Number(digitos[i]) * (peso - i);
  }
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

/** CPF válido (11 dígitos + 2 DVs + não-trivial)? Entrada JÁ normalizada. @pure */
export function isCpfValido(valor: string): boolean {
  if (!/^\d{11}$/.test(valor) || todosIguais(valor)) return false;
  const dv1 = dvCpf(valor.slice(0, 9), 10);
  const dv2 = dvCpf(valor.slice(0, 10), 11);
  return dv1 === Number(valor[9]) && dv2 === Number(valor[10]);
}

const PESOS_CNPJ_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const PESOS_CNPJ_DV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

/** DV de CNPJ: soma ponderada pelos pesos oficiais, módulo 11. @pure */
function dvCnpj(digitos: string, pesos: readonly number[]): number {
  let soma = 0;
  for (let i = 0; i < digitos.length; i++) {
    soma += Number(digitos[i]) * (pesos[i] ?? 0);
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** CNPJ válido (14 dígitos + 2 DVs + não-trivial)? Entrada JÁ normalizada. @pure */
export function isCnpjValido(valor: string): boolean {
  if (!/^\d{14}$/.test(valor) || todosIguais(valor)) return false;
  const dv1 = dvCnpj(valor.slice(0, 12), PESOS_CNPJ_DV1);
  const dv2 = dvCnpj(valor.slice(0, 13), PESOS_CNPJ_DV2);
  return dv1 === Number(valor[12]) && dv2 === Number(valor[13]);
}

// ---------------------------------------------------------------------------
// Validação composta (a porta de entrada do form e da Function)
// ---------------------------------------------------------------------------

export interface ResultadoDocumento {
  valido: boolean;
  /** Presente quando válido — documento estruturado canônico. */
  documento?: DocumentoAssessoria;
  /** Mensagem de erro legível (copy-neutra — a tela formata). */
  erro?: string;
}

/**
 * Valida um documento BRUTO (com ou sem máscara): normaliza, deriva o tipo
 * pelo comprimento e confere os dígitos verificadores (RN-361). @pure
 */
export function validarDocumento(bruto: string): ResultadoDocumento {
  const valor = normalizarDocumento(bruto);
  const tipo = tipoDoDocumento(valor);
  if (tipo === null) {
    return {
      valido: false,
      erro: 'Documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ).',
    };
  }
  const ok = tipo === 'cpf' ? isCpfValido(valor) : isCnpjValido(valor);
  if (!ok) {
    return {
      valido: false,
      erro: `${tipo.toUpperCase()} inválido — confira os dígitos.`,
    };
  }
  return { valido: true, documento: { tipo, valor } };
}

/**
 * Formata um documento canônico para exibição (máscara padrão).
 * CPF: 111.444.777-35 · CNPJ: 12.345.678/0001-95. @pure
 */
export function formatarDocumento(doc: DocumentoAssessoria): string {
  const v = doc.valor;
  if (doc.tipo === 'cpf') {
    return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
  }
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
}
