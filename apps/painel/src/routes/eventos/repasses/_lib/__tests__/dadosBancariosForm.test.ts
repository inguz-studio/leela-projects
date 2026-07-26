import { describe, it, expect } from 'vitest';
import {
  DADOS_BANCARIOS_INICIAIS,
  rotuloTipoConta,
  toSaveDadosBancariosInput,
  validarDadosBancarios,
  type DadosBancariosFormValues,
} from '../dadosBancariosForm';

function completo(over: Partial<DadosBancariosFormValues> = {}): DadosBancariosFormValues {
  return {
    banco: '260 — Nubank',
    agencia: '0001',
    conta: '12345-6',
    tipo: 'corrente',
    pix: '',
    titular: 'Marina Castelo',
    cpfCnpj: '000.000.000-00',
    ...over,
  };
}

describe('validarDadosBancarios', () => {
  it('form completo → sem erros', () => {
    expect(validarDadosBancarios(completo())).toEqual([]);
  });

  it('campos obrigatórios vazios → erro inline por campo (aceite T2)', () => {
    const erros = validarDadosBancarios(DADOS_BANCARIOS_INICIAIS);
    expect(erros).toContain('Informe o banco.');
    expect(erros).toContain('Informe a agência.');
    expect(erros).toContain('Informe o número da conta.');
    expect(erros).toContain('Informe o nome do titular.');
    expect(erros).toContain('Informe o CPF/CNPJ do titular.');
  });

  it('PIX é opcional — vazio não gera erro', () => {
    expect(validarDadosBancarios(completo({ pix: '' }))).toEqual([]);
  });

  it('só espaços conta como vazio (trim)', () => {
    expect(validarDadosBancarios(completo({ banco: '   ' }))).toContain('Informe o banco.');
  });
});

describe('toSaveDadosBancariosInput', () => {
  it('faz trim e omite PIX vazio', () => {
    const input = toSaveDadosBancariosInput(completo({ banco: ' Nubank ', pix: '   ' }));
    expect(input.banco).toBe('Nubank');
    expect('pix' in input).toBe(false);
  });

  it('inclui PIX quando preenchido', () => {
    const input = toSaveDadosBancariosInput(completo({ pix: 'marina@pix.com' }));
    expect(input.pix).toBe('marina@pix.com');
  });
});

describe('rotuloTipoConta', () => {
  it('mapeia para pt-BR', () => {
    expect(rotuloTipoConta('corrente')).toBe('Corrente');
    expect(rotuloTipoConta('poupanca')).toBe('Poupança');
  });
});
