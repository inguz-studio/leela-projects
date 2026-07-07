import { describe, it, expect } from 'vitest';
import { prepararModalidades } from '../modalidades';

describe('prepararModalidades', () => {
  const contagem = { '5k': 119, '10k': 186, '21k': 148 };
  const receita = { '5k': 17124, '10k': 27397, '21k': 41096 };

  it('ordena por receita desc e dá cor estável por modalidade (mesma cor no bar e no donut)', () => {
    const { inscricoes, receita: donut } = prepararModalidades(contagem, receita);
    // 21k (maior receita) primeiro, depois 10k, depois 5k.
    expect(inscricoes.map((d) => d.label)).toEqual(['21k', '10k', '5k']);
    expect(donut!.map((d) => d.label)).toEqual(['21k', '10k', '5k']);
    // colorIndex casa por modalidade entre os dois gráficos.
    for (const m of ['21k', '10k', '5k']) {
      const b = inscricoes.find((d) => d.label === m)!;
      const d = donut!.find((x) => x.label === m)!;
      expect(b.colorIndex).toBe(d.colorIndex);
    }
    expect(inscricoes.find((d) => d.label === '21k')!.value).toBe(148);
    expect(donut!.find((d) => d.label === '21k')!.value).toBe(41096);
  });

  it('sem receita → donut null; barras ainda saem por contagem', () => {
    const { inscricoes, receita: donut } = prepararModalidades(contagem, undefined);
    expect(donut).toBeNull();
    expect(inscricoes).toHaveLength(3);
  });

  it('descarta modalidades com valor zero', () => {
    const { inscricoes } = prepararModalidades({ '5k': 0, '10k': 10 }, undefined);
    expect(inscricoes.map((d) => d.label)).toEqual(['10k']);
  });
});
