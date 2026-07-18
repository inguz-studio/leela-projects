/**
 * afiliadoCore.test.ts — LEELA-R9E · S-R9-11-T1/T5 (RN-313..318)
 *
 * Unit (sem emulator): domínio puro do afiliado — refCodigo (geração/
 * validação/unicidade por chave), gate de desconto RN-315, validação de
 * input e parse fail-fast.
 */
import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import {
  ALFABETO_REF_CODIGO,
  descontoAfiliadoAtivo,
  gerarRefCodigo,
  isRefCodigoValido,
  montarLinkAfiliado,
  normalizarRefCodigo,
  parseAfiliado,
  REF_CODIGO_TAMANHO,
  validarSalvarAfiliadoInput,
} from '@leela/core';

describe('refCodigo (unicidade por chave — padrão cupom E04)', () => {
  it('gera código válido do alfabeto sem ambíguos', () => {
    const codigo = gerarRefCodigo(() => 0.42);
    expect(codigo).toHaveLength(REF_CODIGO_TAMANHO);
    expect(isRefCodigoValido(codigo)).toBe(true);
    for (const ch of codigo) expect(ALFABETO_REF_CODIGO).toContain(ch);
    // sem ambíguos por construção
    expect(ALFABETO_REF_CODIGO).not.toMatch(/[0OIL1]/);
  });

  it('normaliza (trim+UPPER) e valida o padrão A-Z0-9 4..20', () => {
    expect(normalizarRefCodigo('  dioney10 ')).toBe('DIONEY10');
    expect(isRefCodigoValido('DIONEY10')).toBe(true);
    expect(isRefCodigoValido('ABC')).toBe(false); // curto
    expect(isRefCodigoValido('A'.repeat(21))).toBe(false); // longo
    expect(isRefCodigoValido('COM ESPACO')).toBe(false);
    expect(isRefCodigoValido('minusculo1')).toBe(false);
    expect(isRefCodigoValido(42)).toBe(false);
  });

  it('monta o link copiável {base}/{slug}?ref=', () => {
    expect(montarLinkAfiliado('https://leela.dev/', 'meia-floripa', 'DIONEY10')).toBe(
      'https://leela.dev/meia-floripa?ref=DIONEY10'
    );
  });
});

describe('descontoAfiliadoAtivo (gate RN-315 — sem retroativo)', () => {
  it('sem mínimo = ativo desde a 1ª venda; inativo nunca', () => {
    expect(
      descontoAfiliadoAtivo({ status: 'ativo', minimoInscricoes: null, conversoes: 0 })
    ).toBe(true);
    expect(
      descontoAfiliadoAtivo({ status: 'inativo', minimoInscricoes: null, conversoes: 99 })
    ).toBe(false);
    expect(
      descontoAfiliadoAtivo({
        status: 'convite_pendente',
        minimoInscricoes: null,
        conversoes: 0,
      })
    ).toBe(false);
  });

  it('com mínimo: fecha abaixo, abre AO CRUZAR (>=)', () => {
    const base = { status: 'ativo' as const, minimoInscricoes: 5 };
    expect(descontoAfiliadoAtivo({ ...base, conversoes: 4 })).toBe(false);
    expect(descontoAfiliadoAtivo({ ...base, conversoes: 5 })).toBe(true);
    expect(descontoAfiliadoAtivo({ ...base, conversoes: 6 })).toBe(true);
  });
});

describe('validarSalvarAfiliadoInput', () => {
  const ok = {
    eventoId: 'meia',
    tipo: 'clube',
    nome: 'Floripa Run',
    janelaAtribuicaoDias: 7,
  };

  it('aceita input válido; acumula erros no inválido', () => {
    expect(validarSalvarAfiliadoInput(ok)).toEqual([]);
    const erros = validarSalvarAfiliadoInput({
      eventoId: '',
      tipo: 'robo',
      nome: '',
      refCodigo: '@@',
      janelaAtribuicaoDias: 400,
      minimoInscricoes: 0,
      status: 'convite_pendente',
    });
    expect(erros.length).toBeGreaterThanOrEqual(6);
    expect(erros.join(' ')).toMatch(/convite é da Function/);
  });

  it('minimoInscricoes null é válido (sem gate); ≥1 válido; 0/float não', () => {
    expect(validarSalvarAfiliadoInput({ ...ok, minimoInscricoes: null })).toEqual([]);
    expect(validarSalvarAfiliadoInput({ ...ok, minimoInscricoes: 10 })).toEqual([]);
    expect(validarSalvarAfiliadoInput({ ...ok, minimoInscricoes: 1.5 })).not.toEqual([]);
  });
});

describe('parseAfiliado (fail-fast)', () => {
  const now = Timestamp.fromDate(new Date('2026-07-18T12:00:00Z'));
  const docOk = {
    tenantId: 'castelo-producoes',
    eventoId: 'meia',
    tipo: 'clube',
    status: 'ativo',
    nome: 'Floripa Run',
    refCodigo: 'FLORIPA10',
    janelaAtribuicaoDias: 7,
    minimoInscricoes: 5,
    cupomCodigo: 'FLORIPA10OFF',
    conversoes: 3,
    valorAtribuido: 450.5,
    criadoEm: now,
    atualizadoEm: now,
  };

  it('parseia doc válido com defaults', () => {
    const a = parseAfiliado('FLORIPA10', docOk);
    expect(a.minimoInscricoes).toBe(5);
    expect(a.conversoes).toBe(3);
    const semSomas = parseAfiliado('FLORIPA10', {
      ...docOk,
      conversoes: undefined,
      valorAtribuido: undefined,
      minimoInscricoes: undefined,
      cupomCodigo: undefined,
    });
    expect(semSomas.conversoes).toBe(0);
    expect(semSomas.valorAtribuido).toBe(0);
    expect(semSomas.minimoInscricoes).toBeNull();
    expect(semSomas.cupomCodigo).toBeNull();
  });

  it('refCodigo ≠ docId quebra o invariante de chave', () => {
    expect(() => parseAfiliado('OUTRO123', docOk)).toThrow(/igual ao docId/);
  });

  it('∑ negativos/float e enums fora morrem', () => {
    expect(() => parseAfiliado('FLORIPA10', { ...docOk, conversoes: -1 })).toThrow();
    expect(() => parseAfiliado('FLORIPA10', { ...docOk, conversoes: 1.5 })).toThrow();
    expect(() => parseAfiliado('FLORIPA10', { ...docOk, status: 'zumbi' })).toThrow();
    expect(() => parseAfiliado('FLORIPA10', { ...docOk, tipo: 'cnpj' })).toThrow();
    expect(() =>
      parseAfiliado('FLORIPA10', { ...docOk, janelaAtribuicaoDias: 0 })
    ).toThrow();
  });

  it('PF convite_pendente exige responsavelEmail (RN-316)', () => {
    expect(() =>
      parseAfiliado('FLORIPA10', {
        ...docOk,
        tipo: 'pessoa_fisica',
        status: 'convite_pendente',
      })
    ).toThrow(/responsavelEmail/);
    const pf = parseAfiliado('FLORIPA10', {
      ...docOk,
      tipo: 'pessoa_fisica',
      status: 'convite_pendente',
      responsavelEmail: 'dioney@exemplo.com',
      documentoMascarado: '***4725',
    });
    expect(pf.responsavelEmail).toBe('dioney@exemplo.com');
    expect(pf.documentoMascarado).toBe('***4725');
  });
});
