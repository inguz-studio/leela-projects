// =============================================================================
// Helpers de CEP/telefone do checkout (LEELA-CKFORM · spec CHECKOUT-UX §5.2).
//
// Máscaras são UX PURA (a validação é dos validadores do core — cepValido/
// telefoneValido — e o servidor persiste canônico via normalizarCep/
// normalizarTelefone). Nada aqui decide regra de negócio.
//
// Lookup ViaCEP (https://viacep.com.br/ws/{cep}/json/ — client-side, sem
// chave): FAIL-OPEN por contrato — API fora / CEP não encontrado nunca
// bloqueia a compra; a UI cai no preenchimento manual (spec §5.2, estado
// "fallback manual honesto"). Privacidade: a request carrega SÓ o CEP —
// nunca nome/CPF/qualquer outro dado (spec §5.2).
//
// SEO-first: zero dependência nova — `fetch` nativo, disparado on-demand
// (8º dígito/blur), nunca no load da página.
// =============================================================================

import { normalizarCep } from '@leela/core';

/** Máscara visual `00000-000` (aplica conforme digita; nunca valida). @pure */
export function mascaraCep(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Máscara visual `(00) 0000-0000` / `(00) 00000-0000` (10–11 dígitos). @pure */
export function mascaraTelefone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// ---------------------------------------------------------------------------
// Data de nascimento por digitação (D-0729-7 · achado 18)
//
// Verbatim do dono, testando no celular: "voce abre um calendário para colocar
// a data de nascimento, mas isso demanda muitos cliques por parte do usuário.
// DEixe apenas a opção dele preencher com teclado numérico."
//
// O `<input type="date">` do mobile abre o seletor de calendário e não tem como
// desligá-lo — para chegar a 1990 a pessoa navega ano a ano. Trocamos por campo
// de TEXTO com máscara `dd/mm/aaaa` e `inputMode="numeric"`: o teclado que sobe
// é o numérico e a data se digita de uma vez.
//
// O ESTADO continua em `yyyy-mm-dd` (formato do core, o que o servidor valida e
// persiste) — a máscara é só apresentação, como as de CEP e telefone. A
// conversão é explícita nas duas direções e sem inventar dado: entrada
// incompleta devolve string vazia, e o validador do core segue sendo a
// autoridade sobre "é uma data civil no passado".
// ---------------------------------------------------------------------------

/** Máscara visual `dd/mm/aaaa` (aplica conforme digita; nunca valida). @pure */
export function mascaraDataBr(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/**
 * `dd/mm/aaaa` → `yyyy-mm-dd`. Devolve `''` enquanto a data não estiver
 * completa: meia data não vira data, e o campo não pode "quase" ter valor.
 * @pure
 */
export function dataBrParaIso(value: string): string {
  const d = value.replace(/\D/g, '');
  if (d.length !== 8) return '';
  return `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
}

/** `yyyy-mm-dd` → `dd/mm/aaaa` (para hidratar prefill/estado). @pure */
export function isoParaDataBr(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m === null) return mascaraDataBr(value);
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Endereço devolvido pelo lookup — SÓ os campos que o form autopreenche. */
export interface EnderecoLookup {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/** Resultado do lookup: achou / não achou (CEP inexistente) / API fora. */
export type ResultadoLookupCep =
  | { status: 'sucesso'; endereco: EnderecoLookup }
  | { status: 'nao_encontrado' }
  | { status: 'indisponivel' };

const VIACEP_TIMEOUT_MS = 6000;

/**
 * Busca o endereço de um CEP no ViaCEP. `cep` pode vir com máscara — a URL
 * leva só os 8 dígitos. Qualquer falha (rede, timeout, shape inesperado)
 * degrada para `indisponivel` — quem chama cai no fallback manual (fail-open;
 * a compra NUNCA fica refém do lookup). `signal` cancela (CEP re-editado).
 */
export async function buscarEnderecoPorCep(
  cep: string,
  signal?: AbortSignal
): Promise<ResultadoLookupCep> {
  const digitos = normalizarCep(cep);
  if (digitos.length !== 8) return { status: 'nao_encontrado' };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VIACEP_TIMEOUT_MS);
    const onAbort = (): void => controller.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    let data: Record<string, unknown>;
    // O timeout cobre headers E corpo (review antagonista CKFORM: ViaCEP
    // hostil servindo o body a conta-gotas não pode pendurar o lookup e
    // soft-lockar o form em "carregando" — abortar rejeita o res.json()).
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, {
        signal: controller.signal,
      });
      if (!res.ok) return { status: 'indisponivel' };
      data = (await res.json()) as Record<string, unknown>;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
    if (data['erro'] === true || data['erro'] === 'true') {
      return { status: 'nao_encontrado' };
    }
    // Shape defensivo: campo ausente vira '' (CEP rural/novo não devolve
    // bairro/logradouro — seguem editáveis/manuais). UF fora do shape ⇒
    // lookup não confiável ⇒ manual.
    const texto = (v: unknown): string => (typeof v === 'string' ? v : '');
    const uf = texto(data['uf']);
    if (uf.length === 0) return { status: 'indisponivel' };
    return {
      status: 'sucesso',
      endereco: {
        logradouro: texto(data['logradouro']),
        bairro: texto(data['bairro']),
        cidade: texto(data['localidade']),
        uf,
      },
    };
  } catch {
    return { status: 'indisponivel' };
  }
}
