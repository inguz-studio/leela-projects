// =============================================================================
// Helpers PUROS do formulário de cupom (S300-T5 · E04). Sem React/DOM — 100%
// testável. A validação é do KERNEL (`@leela/core` cupom): regex de código,
// coerência tipo↔valor (`valorCupomValido`), janela de validade. NENHUMA regra
// de cupom é reinventada aqui — só se aplica o core, que é o mesmo shape que a
// Rule (`shapeCupomValido`) impõe no servidor.
//
// UNICIDADE POR EVENTO: o docId do cupom É o código normalizado (trim+UPPER —
// `normalizarCodigoCupom`). Salvar com merge sobre um docId existente ATUALIZA
// o doc; logo a colisão de código na CRIAÇÃO tem de ser barrada AQUI, contra os
// códigos já carregados (a Rule não itera irmãos). Em edição o código é imutável
// (é o docId) — a UI desabilita o campo e a checagem de duplicidade não se aplica.
//
// `usos` (≡ usosFeitos) NUNCA entra no payload (∑ de Function/checkout — E12).
// Vigência/desconto são DERIVAÇÃO do core (cupomVigente/descontoDoCupom) —
// aplicados no checkout, não aqui.
// =============================================================================

import {
  cupomNaJanela,
  cupomNoTeto,
  dataHoraLocalISO,
  dataHoraLocalParaDate,
  isCodigoCupomValido,
  isDataHoraLocalISO,
  mensagemContagemInvalida,
  mensagemValorInvalido,
  normalizarCodigoCupom,
  parseContagemPtBr,
  parseValorPtBr,
  valorCupomValido,
  type Cupom,
  type TipoCupom,
  type Timestamp,
} from '@leela/core';

/** Campo do form ao qual uma mensagem de erro se ancora (erro inline). */
export type CampoCupom = 'codigo' | 'valor' | 'tetoUso' | 'janela';

/** Valores brutos do formulário (strings dos inputs). */
export interface CupomFormValues {
  /** Código bruto (o form normaliza para UPPER na validação/persistência). */
  codigo: string;
  tipo: TipoCupom;
  /** Percentual ("10") ou valor em R$ ("50,00"), conforme `tipo`. */
  valor: string;
  /** Limite de usos ("" = ilimitado; inteiro ≥ 1 caso contrário). */
  tetoUso: string;
  /** datetime-local `YYYY-MM-DDTHH:mm` — início da validade. */
  inicioEm: string;
  /** datetime-local `YYYY-MM-DDTHH:mm` — fim da validade. */
  fimEm: string;
}

/** Payload de escrita de cupom (sem tenantId — injetado da sessão). */
export interface CupomPayload {
  /** Código normalizado (== docId). */
  codigo: string;
  tipo: TipoCupom;
  valor: number;
  tetoUso: number | null;
  inicioEm: Date;
  fimEm: Date;
}

export type ResultadoValidacaoCupom =
  | { ok: true; input: CupomPayload }
  | { ok: false; erro: string; campo: CampoCupom };

// ---------------------------------------------------------------------------
// Parsing puro
// ---------------------------------------------------------------------------

/**
 * Parse do valor conforme o tipo. Percentual: número exato (aceita fração, ex.
 * 12,5); fixo: R$ cent-exato (condição de `moneyCentExato` na Rule).
 * `null` quando ilegível ou ambíguo. @pure
 *
 * Lê pelo `parseValorPtBr` do core (FIX-PARSE-DINHEIRO). O `replace(',', '.')`
 * anterior fazia "R$ 1.234,56" de desconto virar R$ 1,23 no cupom, calado. O
 * cent-exato do fixo agora sai dos DÍGITOS e não de `roundMoney` sobre float:
 * é a mesma regra half-up, sem o erro binário que ela precisava compensar.
 */
export function parseValorCupom(tipo: TipoCupom, s: string): number | null {
  const lido = parseValorPtBr(s);
  if (!lido.ok) return null;
  return tipo === 'fixo' ? lido.centavos / 100 : lido.valor;
}

/** Date → valor de `<input type="datetime-local">` pinado em FUSO_EVENTO. @pure */
export function dateParaInputLocal(d: Date): string {
  return dataHoraLocalISO(d);
}

/** Timestamp → valor de datetime-local (vazio quando ausente/ilegível). @pure */
export function timestampParaInputLocal(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '';
  return dateParaInputLocal(ts.toDate());
}

/**
 * Valor de datetime-local → instante, com a parede interpretada em FUSO_EVENTO
 * (nunca no fuso do navegador); `null` quando vazio/inválido. @pure
 */
export function inputLocalParaDate(s: string): Date | null {
  if (!isDataHoraLocalISO(s)) return null;
  return dataHoraLocalParaDate(s);
}

// ---------------------------------------------------------------------------
// Validação do formulário — shape do core + unicidade cross-doc (por evento)
// ---------------------------------------------------------------------------

export interface ValidarFormCupomParams {
  values: CupomFormValues;
  /** docIds (≡ códigos normalizados) dos cupons já existentes no evento. */
  codigosExistentes: readonly string[];
  /** Cupom em edição (null = criando); em edição o código é imutável. */
  cupomEmEdicaoId: string | null;
}

/**
 * Valida o formulário e devolve o payload (sem tenantId) ou a 1ª mensagem de
 * erro + o campo âncora. Ordem: código (regex do core) → unicidade por evento →
 * valor (coerência tipo↔valor do core) → teto de usos → janela de validade.
 * Nenhuma regra de cupom é inventada aqui — só se aplica o kernel. @pure
 */
export function validarFormCupom(params: ValidarFormCupomParams): ResultadoValidacaoCupom {
  const { values, codigosExistentes, cupomEmEdicaoId } = params;

  // 1. Código — regex do core (mesma que a Rule espelha).
  const codigo = normalizarCodigoCupom(values.codigo);
  if (!isCodigoCupomValido(codigo)) {
    return {
      ok: false,
      campo: 'codigo',
      erro: 'O código deve ter 3 a 20 letras ou números (sem espaços ou acentos).',
    };
  }

  // 2. Unicidade por evento — só na CRIAÇÃO (o código é o docId, imutável em
  // edição). Merge sobre docId existente ATUALIZARIA silenciosamente outro
  // cupom; a colisão é barrada aqui contra os códigos já carregados.
  const criando = cupomEmEdicaoId === null;
  if (criando && codigosExistentes.includes(codigo)) {
    return {
      ok: false,
      campo: 'codigo',
      erro: `Já existe um cupom com o código ${codigo} neste evento.`,
    };
  }

  // 3. Valor — coerência tipo↔valor pelo core. Percentual fora de 0–100 é
  // bloqueado com mensagem própria (aceite S300-T5); fixo exige R$ > 0.
  //
  // PARSE-1: texto ILEGÍVEL passa a usar a frase do parser, que ensina a
  // pontuação. "Informe um percentual maior que zero" respondia igual para
  // "1,234.56" e para campo em branco — e o desconto é dinheiro.
  // O `vazio` fica com a frase daqui, que diz de qual campo se trata (mesma
  // exceção do lote e do `CapacidadeModal`).
  const lidoValor = parseValorPtBr(values.valor);
  if (!lidoValor.ok && lidoValor.motivo !== 'vazio') {
    return { ok: false, campo: 'valor', erro: mensagemValorInvalido(lidoValor.motivo) };
  }
  const valor = parseValorCupom(values.tipo, values.valor);
  if (valor === null || valor <= 0) {
    return {
      ok: false,
      campo: 'valor',
      erro:
        values.tipo === 'percentual'
          ? 'Informe um percentual de desconto maior que zero.'
          : 'Informe um valor de desconto em R$ maior que zero.',
    };
  }
  if (values.tipo === 'percentual' && valor > 100) {
    return {
      ok: false,
      campo: 'valor',
      erro: 'O desconto percentual deve estar entre 0 e 100.',
    };
  }
  if (!valorCupomValido(values.tipo, valor)) {
    return { ok: false, campo: 'valor', erro: 'Valor de desconto inconsistente com o tipo.' };
  }

  // 4. Teto de usos — opcional (vazio = ilimitado = null); senão inteiro ≥ 1.
  let tetoUso: number | null = null;
  const tetoBruto = values.tetoUso.trim();
  if (tetoBruto.length > 0) {
    // Teto pelo parser único de contagem (FIX-PARSE-MILHAR). Ele substitui o
    // round-trip `String(n) !== tetoBruto`, que era a defesa certa contra o
    // truncamento do `parseInt` mas recusava junto o milhar legítimo: "1.000"
    // caía como texto sujo em vez de virar mil usos.
    // PARSE-1: o motivo da recusa deixa de ser descartado; a faixa (≥ 1) fica
    // com a frase de sempre.
    const lido = parseContagemPtBr(tetoBruto);
    if (!lido.ok) {
      return { ok: false, campo: 'tetoUso', erro: mensagemContagemInvalida(lido.motivo) };
    }
    const n = lido.valor;
    if (!Number.isInteger(n) || n < 1) {
      return {
        ok: false,
        campo: 'tetoUso',
        erro: 'O limite de usos deve ser um inteiro ≥ 1 (ou vazio para ilimitado).',
      };
    }
    tetoUso = n;
  }

  // 5. Janela de validade — obrigatória no kernel (inicioEm < fimEm).
  const inicioEm = inputLocalParaDate(values.inicioEm);
  const fimEm = inputLocalParaDate(values.fimEm);
  if (!inicioEm || !fimEm) {
    return { ok: false, campo: 'janela', erro: 'Informe o início e o fim da validade.' };
  }
  if (fimEm.getTime() <= inicioEm.getTime()) {
    return { ok: false, campo: 'janela', erro: 'O fim da validade deve ser depois do início.' };
  }

  return { ok: true, input: { codigo, tipo: values.tipo, valor, tetoUso, inicioEm, fimEm } };
}

// ---------------------------------------------------------------------------
// Estado/vigência do cupom (DERIVAÇÃO do kernel — nada recalculado à mão)
// ---------------------------------------------------------------------------

export interface EstadoCupomBadge {
  label: string;
  /** Variante do Badge do DS. */
  variant: 'vitoria' | 'vulcao' | 'alerta' | 'neutro';
}

/**
 * Rótulo/variante de estado de um cupom no instante `agora`, DERIVADO do kernel
 * (cupomNoTeto/cupomNaJanela) — a UI não reimplementa vigência. Esgotado tem
 * prioridade (teto batido), depois a janela (agendado/expirado), senão vigente.
 * @pure
 */
export function estadoCupomBadge(cupom: Cupom, agora: Date): EstadoCupomBadge {
  if (cupomNoTeto(cupom)) return { label: 'Esgotado', variant: 'vulcao' };
  if (!cupomNaJanela(cupom, agora)) {
    return agora.getTime() < cupom.inicioEm.toMillis()
      ? { label: 'Agendado', variant: 'alerta' }
      : { label: 'Expirado', variant: 'neutro' };
  }
  return { label: 'Vigente', variant: 'vitoria' };
}

/** Rótulo legível do desconto do cupom ("10%" ou "R$ 50,00"). @pure */
export function labelDesconto(cupom: Pick<Cupom, 'tipo' | 'valor'>): string {
  if (cupom.tipo === 'percentual') return `${cupom.valor}%`;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cupom.valor);
}

/** Rótulo de usos ("3 / 100" ou "3 · ilimitado"). @pure */
export function labelUsos(cupom: Pick<Cupom, 'usos' | 'tetoUso'>): string {
  return cupom.tetoUso === null ? `${cupom.usos} · ilimitado` : `${cupom.usos} / ${cupom.tetoUso}`;
}
