import { describe, it, expect } from 'vitest';
import { CATALOGO_ACOES } from '@leela/core';
import {
  buildAcoes,
  desafioToForm,
  resumoDesafio,
  setMetaAcao,
  toggleAcao,
  validarDesafioForm,
  VALORES_INICIAIS_DESAFIO,
  type DesafioFormValues,
} from '../desafioForm';
import { mkDesafio } from '../../_test/fixtures';

function comAcoes(...refs: string[]): DesafioFormValues {
  return refs.reduce((v, r) => toggleAcao(v, r), VALORES_INICIAIS_DESAFIO);
}

describe('toggleAcao / setMetaAcao', () => {
  it('marca e desmarca uma ação', () => {
    const v1 = toggleAcao(VALORES_INICIAIS_DESAFIO, 'correr');
    expect(v1.acoes.correr).toBeDefined();
    const v2 = toggleAcao(v1, 'correr');
    expect(v2.acoes.correr).toBeUndefined();
  });

  it('setMetaAcao só afeta ação já selecionada', () => {
    const v1 = toggleAcao(VALORES_INICIAIS_DESAFIO, 'correr');
    const v2 = setMetaAcao(v1, 'correr', '100');
    expect(v2.acoes.correr?.meta).toBe('100');
    expect(setMetaAcao(VALORES_INICIAIS_DESAFIO, 'correr', '5').acoes.correr).toBeUndefined();
  });
});

describe('resumoDesafio (C16)', () => {
  it('conta ações por pilar e detecta cobertura dos 3 pilares', () => {
    // correr=fisico, ler=mental, meditar=espiritual
    const v = comAcoes('correr', 'ler', 'meditar');
    const r = resumoDesafio(v, CATALOGO_ACOES);
    expect(r.totalAcoes).toBe(3);
    expect(r.porPilar).toEqual({ fisico: 1, mental: 1, espiritual: 1 });
    expect(r.cobreTresPilares).toBe(true);
  });

  it('sem cobertura completa quando falta um pilar', () => {
    const r = resumoDesafio(comAcoes('correr', 'ler'), CATALOGO_ACOES);
    expect(r.cobreTresPilares).toBe(false);
  });
});

describe('validarDesafioForm', () => {
  const datas = { dataInicio: '2026-05-01', dataFim: '2026-05-31' };

  it('Modelo B válido não tem erros', () => {
    const v: DesafioFormValues = {
      ...comAcoes('correr'),
      ...datas,
      nome: 'Constância',
      modelo: 'B',
      metaTotalPontos: '1000',
    };
    expect(validarDesafioForm(v)).toEqual([]);
  });

  it('Modelo A sem meta por ação → erro', () => {
    const v: DesafioFormValues = {
      ...comAcoes('correr'),
      ...datas,
      nome: 'Meta por ação',
      modelo: 'A',
    };
    expect(validarDesafioForm(v).some((e) => e.includes('Modelo A'))).toBe(true);
  });

  it('Modelo C sem mínimo nos 3 pilares → erro RN-111 (aceite)', () => {
    const v: DesafioFormValues = {
      ...comAcoes('correr', 'ler', 'meditar'),
      ...datas,
      nome: 'Equilíbrio',
      modelo: 'C',
      metaTotalPontos: '1500',
      minimoPorPilar: { fisico: '100', mental: '', espiritual: '' },
    };
    const erros = validarDesafioForm(v);
    expect(erros.some((e) => e.includes('RN-111'))).toBe(true);
  });

  it('Modelo C completo publica sem erros', () => {
    const v: DesafioFormValues = {
      ...comAcoes('correr', 'ler', 'meditar'),
      ...datas,
      nome: 'Equilíbrio',
      modelo: 'C',
      metaTotalPontos: '1500',
      minimoPorPilar: { fisico: '100', mental: '80', espiritual: '60' },
    };
    expect(validarDesafioForm(v)).toEqual([]);
  });

  it('sem data de início acusa erro amigável', () => {
    const v: DesafioFormValues = { ...comAcoes('correr'), nome: 'X', modelo: 'B', metaTotalPontos: '10' };
    expect(validarDesafioForm(v).some((e) => e.includes('início'))).toBe(true);
  });
});

describe('buildAcoes / desafioToForm', () => {
  it('buildAcoes inclui meta só quando informada', () => {
    let v = toggleAcao(VALORES_INICIAIS_DESAFIO, 'correr');
    v = setMetaAcao(v, 'correr', '50');
    v = toggleAcao(v, 'ler');
    const acoes = buildAcoes(v);
    expect(acoes).toContainEqual({ acaoRef: 'correr', meta: 50 });
    expect(acoes).toContainEqual({ acaoRef: 'ler' });
  });

  it('desafioToForm pré-preenche identidade/modelo/metas', () => {
    const d = mkDesafio({ nome: 'Editado', modelo: 'C', metaTotalPontos: 900, minimoPorPilar: { fisico: 50 } });
    const form = desafioToForm(d);
    expect(form.nome).toBe('Editado');
    expect(form.modelo).toBe('C');
    expect(form.metaTotalPontos).toBe('900');
    expect(form.minimoPorPilar.fisico).toBe('50');
    expect(form.dataInicio).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
