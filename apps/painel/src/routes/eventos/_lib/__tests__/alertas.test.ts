import { describe, it, expect } from 'vitest';
import { derivaAlertas } from '../alertas';
import { ts } from '../../_test/fixtures';

const AGORA = new Date('2026-04-20T12:00:00Z');

describe('derivaAlertas', () => {
  it('rascunho gera aviso para publicar', () => {
    const alertas = derivaAlertas(
      { status: 'rascunho', data: ts(new Date('2026-06-01T00:00:00Z')), qtdInscritos: 0 },
      AGORA,
    );
    expect(alertas.some((a) => a.id === 'rascunho' && a.severidade === 'aviso')).toBe(true);
  });

  it('evento próximo (≤2 dias) publicado é crítico', () => {
    const alertas = derivaAlertas(
      { status: 'publicado', data: ts(new Date('2026-04-21T12:00:00Z')), qtdInscritos: 100 },
      AGORA,
    );
    const prox = alertas.find((a) => a.id === 'proximidade');
    expect(prox?.severidade).toBe('critico');
  });

  it('evento distante não gera alerta de proximidade', () => {
    const alertas = derivaAlertas(
      { status: 'publicado', data: ts(new Date('2026-08-01T00:00:00Z')), qtdInscritos: 100 },
      AGORA,
    );
    expect(alertas.some((a) => a.id === 'proximidade')).toBe(false);
  });

  it('publicado sem inscritos avisa para divulgar', () => {
    const alertas = derivaAlertas(
      { status: 'publicado', data: ts(new Date('2026-08-01T00:00:00Z')), qtdInscritos: 0 },
      AGORA,
    );
    expect(alertas.some((a) => a.id === 'sem-inscritos')).toBe(true);
  });

  it('ordena crítico antes de aviso/info', () => {
    const alertas = derivaAlertas(
      { status: 'publicado', data: ts(new Date('2026-04-21T12:00:00Z')), qtdInscritos: 0 },
      AGORA,
    );
    expect(alertas[0]?.severidade).toBe('critico');
  });
});
