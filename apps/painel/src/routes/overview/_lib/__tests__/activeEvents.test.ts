import { describe, expect, it } from 'vitest';
import { derivarEventosAtivos } from '../activeEvents';
import { mkEventoAtivo } from '../../_test/fixtures';

describe('derivarEventosAtivos (S601-T1)', () => {
  it('lista eventos não encerrados; Meia (453/500, esgotando, publicado) + Retiro (rascunho)', () => {
    const views = derivarEventosAtivos([
      mkEventoAtivo({ nome: 'Meia Maratona', slug: 'meia-floripa-2026', status: 'publicado', qtdInscritos: 453, capacidade: 500 }),
      mkEventoAtivo({ nome: 'Retiro', slug: 'retiro-serra', status: 'rascunho', qtdInscritos: 0, capacidade: null }),
    ]);
    expect(views).toHaveLength(2);
    const meia = views[0]!;
    expect(meia.esgotando).toBe(true); // 453/500 = 90,6% ≥ limiar
    expect(meia.vagasRestantes).toBe(47);
    expect(meia.href).toBe('/eventos/meia-floripa-2026');
    const retiro = views[1]!;
    expect(retiro.status).toBe('rascunho');
    expect(retiro.esgotando).toBe(false);
    expect(retiro.vagasRestantes).toBeNull();
  });

  it('filtra eventos encerrados', () => {
    const views = derivarEventosAtivos([
      mkEventoAtivo({ slug: 'ativo', status: 'publicado' }),
      mkEventoAtivo({ slug: 'velho', status: 'encerrado' }),
    ]);
    expect(views.map((v) => v.slug)).toEqual(['ativo']);
  });

  it('rascunho não entra em esgotamento mesmo lotado (só evento público)', () => {
    const [view] = derivarEventosAtivos([
      mkEventoAtivo({ status: 'rascunho', qtdInscritos: 500, capacidade: 500 }),
    ]);
    expect(view!.esgotando).toBe(false);
  });
});
