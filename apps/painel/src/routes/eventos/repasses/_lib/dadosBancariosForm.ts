// =============================================================================
// Validação PURA do form de dados bancários (E09s-L3-T2). Sem React/DOM.
//
// O servidor (`saveDadosBancarios`) é a autoridade — cifra, mascara e revalida
// (RN-354). Aqui é SÓ o espelho de UX: campos obrigatórios não podem ir vazios
// (aceite T2: "campo vazio ⇒ erro inline sem submit"). Formato de conta/
// CPF-CNPJ/PIX é decisão do servidor — não reimplementamos aqui.
// =============================================================================

import type { SaveDadosBancariosInput, TipoContaBancariaInput } from '@leela/api-client';

export interface DadosBancariosFormValues {
  banco: string;
  agencia: string;
  /** Número em claro — trafega SÓ no callable; o servidor cifra e mascara. */
  conta: string;
  tipo: TipoContaBancariaInput;
  /** PIX opcional (em claro no submit; o servidor mascara). */
  pix: string;
  titular: string;
  /** CPF/CNPJ em claro no submit; o servidor mascara (só o final volta). */
  cpfCnpj: string;
}

export const DADOS_BANCARIOS_INICIAIS: DadosBancariosFormValues = {
  banco: '',
  agencia: '',
  conta: '',
  tipo: 'corrente',
  pix: '',
  titular: '',
  cpfCnpj: '',
};

/** Campos obrigatórios → mensagem inline quando vazios (aceite T2). @pure */
export function validarDadosBancarios(v: DadosBancariosFormValues): string[] {
  const erros: string[] = [];
  if (v.banco.trim() === '') erros.push('Informe o banco.');
  if (v.agencia.trim() === '') erros.push('Informe a agência.');
  if (v.conta.trim() === '') erros.push('Informe o número da conta.');
  if (v.tipo !== 'corrente' && v.tipo !== 'poupanca') erros.push('Selecione o tipo de conta.');
  if (v.titular.trim() === '') erros.push('Informe o nome do titular.');
  if (v.cpfCnpj.trim() === '') erros.push('Informe o CPF/CNPJ do titular.');
  return erros;
}

/** Monta o payload do callable (trim; PIX só quando preenchido). @pure */
export function toSaveDadosBancariosInput(
  v: DadosBancariosFormValues
): SaveDadosBancariosInput {
  const input: SaveDadosBancariosInput = {
    banco: v.banco.trim(),
    agencia: v.agencia.trim(),
    conta: v.conta.trim(),
    tipo: v.tipo,
    titular: v.titular.trim(),
    cpfCnpj: v.cpfCnpj.trim(),
  };
  const pix = v.pix.trim();
  if (pix !== '') input.pix = pix;
  return input;
}

/** Rótulo pt-BR do tipo de conta. @pure */
export function rotuloTipoConta(tipo: TipoContaBancariaInput): string {
  return tipo === 'poupanca' ? 'Poupança' : 'Corrente';
}
