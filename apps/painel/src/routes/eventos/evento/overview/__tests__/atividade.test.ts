import { describe, it, expect } from 'vitest';
import { derivaAtividade, iniciaisDe, tempoRelativo } from '../atividade';
import { mkInscrito, ts } from '../../../_test/fixtures';

describe('iniciaisDe', () => {
  it('duas iniciais do nome completo', () => {
    expect(iniciaisDe('Marina Silva')).toBe('MS');
    expect(iniciaisDe('  rafael  guimarães ')).toBe('RG');
  });
  it('nome único → uma inicial; vazio → "?"', () => {
    expect(iniciaisDe('Marina')).toBe('M');
    expect(iniciaisDe('')).toBe('?');
  });
});

describe('tempoRelativo', () => {
  const agora = new Date('2026-07-06T12:00:00Z');
  it('minutos, horas e dias', () => {
    expect(tempoRelativo(new Date('2026-07-06T11:48:00Z'), agora)).toBe('há 12 min');
    expect(tempoRelativo(new Date('2026-07-06T10:00:00Z'), agora)).toBe('há 2h');
    expect(tempoRelativo(new Date('2026-07-03T12:00:00Z'), agora)).toBe('há 3d');
  });
  it('menos de 1 min → "agora"', () => {
    expect(tempoRelativo(new Date('2026-07-06T11:59:40Z'), agora)).toBe('agora');
  });
});

describe('derivaAtividade', () => {
  const agora = new Date('2026-07-06T12:00:00Z');

  it('ordena do mais recente ao mais antigo e tipa por status', () => {
    const inscritos = [
      mkInscrito({ id: 'a', atletaNome: 'Ana', status: 'confirmado', criadoEm: ts(new Date('2026-07-06T10:00:00Z')) }),
      mkInscrito({ id: 'b', atletaNome: 'Bruno', status: 'cancelado', criadoEm: ts(new Date('2026-07-06T11:50:00Z')) }),
      mkInscrito({ id: 'c', atletaNome: 'Caio', status: 'pendente', criadoEm: ts(new Date('2026-07-05T12:00:00Z')) }),
    ];
    const feed = derivaAtividade(inscritos, agora);
    expect(feed.map((f) => f.id)).toEqual(['b', 'a', 'c']);
    expect(feed[0]).toMatchObject({ tipo: 'falhou', badge: { label: 'Falha', variant: 'vulcao' } });
    expect(feed[1]).toMatchObject({ tipo: 'confirmado' });
    expect(feed[1]!.badge).toBeUndefined();
    expect(feed[2]).toMatchObject({ tipo: 'pendente', badge: { label: 'Pendente', variant: 'alerta' } });
  });

  it('null → feed vazio', () => {
    expect(derivaAtividade(null)).toEqual([]);
  });
});
