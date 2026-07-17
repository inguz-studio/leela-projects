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

/** Erros de forma da condição de desconto (vazio = pronto). @pure */
export function validarCondicaoDesconto(v: CondicaoDescontoValues): string[] {
  const erros: string[] = [];
  if (v.eventoId.trim().length === 0) erros.push('Escolha o evento onde o cupom vale.');
  const codigo = normalizarCodigoCupom(v.codigo);
  if (!isCodigoCupomValido(codigo)) {
    erros.push('Código do cupom fora do padrão A-Z0-9 (3–20 caracteres).');
  }
  const valorNum = Number(v.valor.replace(',', '.'));
  if (!valorCupomValido(v.tipo, valorNum)) {
    erros.push(
      v.tipo === 'percentual'
        ? 'Percentual inválido (0 < valor ≤ 100).'
        : 'Valor fixo inválido (maior que zero).'
    );
  }
  if (v.tetoUso.trim().length > 0) {
    const teto = Number(v.tetoUso);
    if (!Number.isInteger(teto) || teto < 1) {
      erros.push('Teto de usos deve ser inteiro ≥ 1 (ou vazio para ilimitado).');
    }
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

/** Teto de usos parseado (`null` = ilimitado). @pure */
export function tetoUsoParaNumero(tetoUso: string): number | null {
  if (tetoUso.trim().length === 0) return null;
  const n = Number(tetoUso);
  return Number.isInteger(n) && n >= 1 ? n : null;
}
