// =============================================================================
// Testes puros do form do editor de campanha (S401-T3 · E06-L3): monta o
// segmento da taxonomia do evento, valida via core (RN-134/135 + segmento),
// preview com truncamento de push (160 code points, RN-134 — reuso de
// truncarPush/contarChars, NÃO reimplementado) e mapeamento Campanha→form.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { PUSH_MAX_CHARS } from '@leela/core';
import type { Campanha, Timestamp } from '@leela/core';
import {
  buildSegmento,
  campanhaToForm,
  previewCampanha,
  toggleCanalForm,
  validarCampanhaForm,
  VALORES_INICIAIS_CAMPANHA,
  type CampanhaFormValues,
} from '../campanhaForm';

const ts = (ms: number): Timestamp =>
  ({ toDate: () => new Date(ms), toMillis: () => ms }) as unknown as Timestamp;

function values(over: Partial<CampanhaFormValues> = {}): CampanhaFormValues {
  return {
    ...VALORES_INICIAIS_CAMPANHA,
    titulo: 'Seu kit está pronto',
    conteudo: 'Retire seu kit no balcão até sexta.',
    ...over,
  };
}

describe('buildSegmento', () => {
  it('todos_inscritos não carrega referência', () => {
    expect(buildSegmento(values({ segmentoTipo: 'todos_inscritos', segmentoRef: 'x' }))).toEqual({
      tipo: 'todos_inscritos',
    });
  });
  it('por_kit carrega a referência (trim)', () => {
    expect(buildSegmento(values({ segmentoTipo: 'por_kit', segmentoRef: ' kit_ouro ' }))).toEqual({
      tipo: 'por_kit',
      referencia: 'kit_ouro',
    });
  });
});

describe('validarCampanhaForm — delega ao core + agendamento da tela', () => {
  it('campanha válida (todos_inscritos) → sem erros', () => {
    expect(validarCampanhaForm(values())).toEqual([]);
  });
  it('por_kit sem referência → erro (taxonomia do evento)', () => {
    const e = validarCampanhaForm(values({ segmentoTipo: 'por_kit', segmentoRef: '' }));
    expect(e.length).toBeGreaterThan(0);
  });
  it('agendar sem data/hora → erro', () => {
    const e = validarCampanhaForm(values({ quando: 'agendar', agendadoData: '', agendadoHora: '' }));
    expect(e).toContain('defina data e hora do agendamento');
  });
  it('capa presente sem e-mail → erro (RN-135)', () => {
    const e = validarCampanhaForm(values({ canais: ['push'], capaUrl: 'https://x/y.png' }));
    expect(e.length).toBeGreaterThan(0);
  });
});

describe('previewCampanha — truncamento de push (RN-134)', () => {
  it('conteúdo ≤ 160 → não truncado', () => {
    const p = previewCampanha(values({ conteudo: 'a'.repeat(160) }));
    expect(p.pushTruncado).toBe(false);
    expect(Array.from(p.push).length).toBe(160);
  });
  it('conteúdo 161 → truncado em 160 code points', () => {
    const p = previewCampanha(values({ conteudo: 'a'.repeat(161) }));
    expect(p.pushTruncado).toBe(true);
    expect(Array.from(p.push).length).toBe(PUSH_MAX_CHARS);
  });
  it('emoji não é cortado no meio (code point)', () => {
    const p = previewCampanha(values({ conteudo: '🏃'.repeat(161) }));
    expect(Array.from(p.push).length).toBe(PUSH_MAX_CHARS);
    expect(p.push.endsWith('🏃')).toBe(true);
  });
  it('capa só entra no preview com e-mail (RN-135)', () => {
    expect(previewCampanha(values({ canais: ['push'], capaUrl: 'https://x/y.png' })).capaUrl).toBeNull();
    expect(previewCampanha(values({ canais: ['email'], capaUrl: 'https://x/y.png' })).capaUrl).toBe(
      'https://x/y.png',
    );
  });
});

describe('toggleCanalForm', () => {
  it('adiciona e remove canal', () => {
    const v = values({ canais: ['push'] });
    expect(toggleCanalForm(v, 'email').canais).toEqual(['push', 'email']);
    expect(toggleCanalForm(v, 'push').canais).toEqual([]);
  });
});

describe('campanhaToForm — edição pré-preenchida', () => {
  const campanha: Campanha = {
    id: 'c1',
    tenantId: 't1',
    titulo: 'Cupom para amigos',
    conteudo: 'Use AMIGOCPS e ganhe desconto.',
    canal: ['email'],
    origem: 'manual',
    status: 'agendado',
    segmento: { tipo: 'por_kit', referencia: 'kit_ouro' },
    agendadoPara: ts(new Date('2026-04-20T09:30:00').getTime()),
    criadoEm: ts(1),
    atualizadoEm: ts(2),
    alcance: 0,
    capaUrl: 'https://x/capa.png',
  };
  it('mapeia canal/segmento/capa e quebra o agendamento em data+hora locais', () => {
    const f = campanhaToForm(campanha);
    expect(f.canais).toEqual(['email']);
    expect(f.segmentoTipo).toBe('por_kit');
    expect(f.segmentoRef).toBe('kit_ouro');
    expect(f.capaUrl).toBe('https://x/capa.png');
    expect(f.quando).toBe('agendar');
    expect(f.agendadoData).toBe('2026-04-20');
    expect(f.agendadoHora).toBe('09:30');
  });
});
