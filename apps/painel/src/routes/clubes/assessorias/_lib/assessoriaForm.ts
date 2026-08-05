// =============================================================================
// Helpers PUROS das telas de assessoria parceira (E18 · S1800/S1802/S1803).
// A validação de FORMA é DELEGADA ao core (`validarDocumento`, `validarEmail`,
// kernel de cupom) — fonte única, a mesma que as Functions rodam na fronteira.
// Aqui só a ponte estado-controlado ↔ input + rótulos de status.
// =============================================================================

import {
  formatarDocumento,
  isCodigoCupomValido,
  normalizarCodigoCupom,
  parseContagemPtBr,
  parseValorPtBr,
  valorCupomValido,
  validarDocumento,
  validarEmail,
  type StatusParceriaAssessoria,
  type TipoCupom,
} from '@leela/core';

// ---------------------------------------------------------------------------
// S1800 — cadastro
// ---------------------------------------------------------------------------

export interface CadastroAssessoriaValues {
  nome: string;
  documento: string;
  responsavelEmail: string;
}

export const CADASTRO_VALORES_INICIAIS: CadastroAssessoriaValues = {
  nome: '',
  documento: '',
  responsavelEmail: '',
};

/** Erro inline do documento no cadastro (`null` = ok ou vazio). @pure */
export function problemaDoDocumento(bruto: string): string | null {
  if (bruto.trim().length === 0) return null;
  const r = validarDocumento(bruto);
  return r.valido ? null : (r.erro ?? 'Documento inválido.');
}

/** Erros de forma do cadastro (vazio = pronto para enviar). @pure */
export function validarCadastro(v: CadastroAssessoriaValues): string[] {
  const erros: string[] = [];
  if (v.nome.trim().length === 0) erros.push('Informe o nome da assessoria.');
  if (v.nome.trim().length > 60) erros.push('Nome da assessoria excede 60 caracteres.');
  if (!validarDocumento(v.documento).valido) {
    erros.push('CNPJ/CPF inválido — confira os dígitos.');
  }
  if (!validarEmail(v.responsavelEmail.trim())) {
    erros.push('E-mail do responsável inválido.');
  }
  return erros;
}

// ---------------------------------------------------------------------------
// Status (RN-123) — rótulo + tom do Badge
// ---------------------------------------------------------------------------

export interface StatusBadgeInfo {
  label: string;
  variant: 'vitoria' | 'alerta' | 'neutro';
}

/** Rótulo/tom do status da parceria (RN-123). @pure */
export function statusParceriaBadge(status: StatusParceriaAssessoria): StatusBadgeInfo {
  switch (status) {
    case 'ativa':
      return { label: 'Ativa', variant: 'vitoria' };
    case 'convite_pendente':
      return { label: 'Convite pendente', variant: 'alerta' };
    case 'inativa':
      return { label: 'Encerrada', variant: 'neutro' };
  }
}

/** Documento canônico → máscara de exibição (CPF/CNPJ). @pure */
export function formatarDocumentoValor(tipo: 'cpf' | 'cnpj', valor: string): string {
  return formatarDocumento({ tipo, valor });
}

// ---------------------------------------------------------------------------
// S1802 — condição de desconto (cupom escopado)
// ---------------------------------------------------------------------------

export interface CondicaoDescontoValues {
  eventoId: string;
  codigo: string;
  tipo: TipoCupom;
  /** valor como string do input (% ou R$) */
  valor: string;
  /** teto de usos como string ('' = ilimitado) */
  tetoUso: string;
  /** datetime-local (YYYY-MM-DDTHH:mm) */
  inicio: string;
  fim: string;
}

export const CONDICAO_VALORES_INICIAIS: CondicaoDescontoValues = {
  eventoId: '',
  codigo: '',
  tipo: 'percentual',
  valor: '',
  tetoUso: '',
  inicio: '',
  fim: '',
};

/** Converte datetime-local em millis epoch; `null` se vazio/ilegível. @pure */
export function millisDeInputLocal(valor: string): number | null {
  if (valor.trim().length === 0) return null;
  const ms = new Date(valor).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Valor da condição de desconto conforme o tipo, ou `null` quando o texto é
 * ilegível/ambíguo. @pure
 *
 * Uma função só para a validação e para o submit: antes cada lado fazia o seu
 * próprio `Number(valor.replace(',', '.'))`, e os dois liam "1.234,56" como
 * 1.234 — a validação aprovava R$ 1,23 e a página gravava R$ 1,23
 * (FIX-PARSE-DINHEIRO). Percentual usa o decimal exato; fixo usa o cent-exato.
 */
export function parseValorCondicao(tipo: TipoCupom, bruto: string): number | null {
  const lido = parseValorPtBr(bruto);
  if (!lido.ok) return null;
  return tipo === 'fixo' ? lido.centavos / 100 : lido.valor;
}

/** Erros de forma da condição de desconto (vazio = pronto). @pure */
export function validarCondicaoDesconto(v: CondicaoDescontoValues): string[] {
  const erros: string[] = [];
  if (v.eventoId.trim().length === 0) erros.push('Escolha o evento onde o cupom vale.');
  const codigo = normalizarCodigoCupom(v.codigo);
  if (!isCodigoCupomValido(codigo)) {
    erros.push('Código do cupom fora do padrão A-Z0-9 (3–20 caracteres).');
  }
  const valorNum = parseValorCondicao(v.tipo, v.valor);
  if (!valorCupomValido(v.tipo, valorNum)) {
    erros.push(
      v.tipo === 'percentual'
        ? 'Percentual inválido (0 < valor ≤ 100).'
        : 'Valor fixo inválido (maior que zero).'
    );
  }
  // O teto passa pela MESMA função que monta o payload (FIX-PARSE-MILHAR).
  // Enquanto eram dois `Number(...)` independentes, a validação e o submit
  // podiam discordar — e a discordância caía do lado ruim: `tetoUsoParaNumero`
  // devolve `null` para texto ilegível, e `null` aqui significa ILIMITADO.
  if (v.tetoUso.trim().length > 0 && tetoUsoParaNumero(v.tetoUso) === null) {
    erros.push('Teto de usos deve ser inteiro ≥ 1 (ou vazio para ilimitado).');
  }
  const inicio = millisDeInputLocal(v.inicio);
  const fim = millisDeInputLocal(v.fim);
  if (inicio === null || fim === null) {
    erros.push('Preencha início e fim da janela de validade.');
  } else if (fim <= inicio) {
    erros.push('O fim da validade deve ser posterior ao início.');
  }
  return erros;
}

/**
 * Teto de usos parseado (`null` = ilimitado). @pure
 *
 * Fonte única do teto — a validação chama esta mesma função. Pelo parser de
 * contagem "1.000" são mil usos; com o `Number(...)` que estava aqui era 1, e
 * `Number.isInteger(1)` aprovava sem nenhum sintoma até o cupom morrer no
 * primeiro resgate (FIX-PARSE-MILHAR).
 */
export function tetoUsoParaNumero(tetoUso: string): number | null {
  if (tetoUso.trim().length === 0) return null;
  const lido = parseContagemPtBr(tetoUso);
  return lido.ok && lido.valor >= 1 ? lido.valor : null;
}
