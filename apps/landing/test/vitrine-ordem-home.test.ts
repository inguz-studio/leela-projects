// =============================================================================
// apps/landing/test/vitrine-ordem-home.test.ts — lane leela-landing-awwwards-20260826
//
// O defeito que estes casos travam: a home ordenava a vitrine por NOME. No seed
// do mock, medido em 26/08 com o relógio canônico (2026-03-15), isso abria a
// grade com "[Mock] - Campeche Run" — INSCRIÇÕES ENCERRADAS — enquanto duas
// experiências abertas caíam para depois. A primeira linha de um marketplace é
// curadoria; ela estava dizendo "chegou tarde" para quem acabou de chegar.
//
// Os casos afirmam a REGRA, não a lista do seed: o seed muda, a regra fica.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { ordenarVitrine, destaqueDaVitrine, type ItemOrdenavel } from '@/lib/ordemVitrine';

function ev(p: Partial<ItemOrdenavel> & { nome: string }): ItemOrdenavel {
  return {
    dataISO: '2026-10-20T09:00:00-03:00',
    futuro: true,
    estadoVenda: 'aberto',
    ...p,
  };
}

const nomes = (itens: readonly ItemOrdenavel[]): string[] => itens.map((i) => i.nome);

describe('ordenarVitrine — degrau 1: vendável primeiro', () => {
  it('põe aberto antes de esgotado, e esgotado antes de encerrado', () => {
    const fora = [
      ev({ nome: 'C encerrado', estadoVenda: 'encerrado' }),
      ev({ nome: 'A aberto', estadoVenda: 'aberto' }),
      ev({ nome: 'B esgotado', estadoVenda: 'esgotado' }),
    ];
    expect(nomes(ordenarVitrine(fora))).toEqual(['A aberto', 'B esgotado', 'C encerrado']);
  });

  it('o estado vence o alfabeto — que é exatamente o que o defeito fazia ao contrário', () => {
    const fora = [
      // Alfabeticamente primeiro, mas encerrado: era ele que abria a grade.
      ev({ nome: '[Mock] - Campeche Run', estadoVenda: 'encerrado' }),
      ev({ nome: 'Zumbi Trail', estadoVenda: 'aberto' }),
    ];
    expect(nomes(ordenarVitrine(fora))[0]).toBe('Zumbi Trail');
  });
});

describe('ordenarVitrine — degrau 2: proximidade dentro do grupo', () => {
  it('futuro antes de passado, com o mesmo estado de venda', () => {
    const fora = [
      ev({ nome: 'Já foi', futuro: false, dataISO: '2026-01-10T09:00:00-03:00' }),
      ev({ nome: 'Vem aí', futuro: true, dataISO: '2026-12-01T09:00:00-03:00' }),
    ];
    expect(nomes(ordenarVitrine(fora))).toEqual(['Vem aí', 'Já foi']);
  });

  it('entre futuros, a data MAIS PRÓXIMA primeiro', () => {
    const fora = [
      ev({ nome: 'Dezembro', dataISO: '2026-12-01T09:00:00-03:00' }),
      ev({ nome: 'Abril', dataISO: '2026-04-05T09:00:00-03:00' }),
      ev({ nome: 'Setembro', dataISO: '2026-09-03T09:00:00-03:00' }),
    ];
    expect(nomes(ordenarVitrine(fora))).toEqual(['Abril', 'Setembro', 'Dezembro']);
  });

  it('entre passados, a MAIS RECENTE primeiro (arquivo lê-se do fim)', () => {
    const passado = { futuro: false, estadoVenda: 'encerrado' as const };
    const fora = [
      ev({ nome: 'Antiga', dataISO: '2025-02-01T09:00:00-03:00', ...passado }),
      ev({ nome: 'Recente', dataISO: '2026-02-01T09:00:00-03:00', ...passado }),
    ];
    expect(nomes(ordenarVitrine(fora))).toEqual(['Recente', 'Antiga']);
  });
});

describe('ordenarVitrine — degrau 3: determinismo', () => {
  it('empate de estado e de data desempata por nome em pt-BR', () => {
    const fora = [
      ev({ nome: 'Ônibus' }),
      ev({ nome: 'Abadá' }),
      ev({ nome: 'Ácaro' }),
    ];
    expect(nomes(ordenarVitrine(fora))).toEqual(['Abadá', 'Ácaro', 'Ônibus']);
  });

  it('data ilegível cai no desempate por nome em vez de embaralhar a grade', () => {
    const fora = [
      ev({ nome: 'B', dataISO: 'nao-e-data' }),
      ev({ nome: 'A', dataISO: 'tambem-nao' }),
    ];
    expect(nomes(ordenarVitrine(fora))).toEqual(['A', 'B']);
  });

  it('não muta a entrada — o Server Component não deve ver a ordem trocada por baixo', () => {
    const fora = [ev({ nome: 'Z' }), ev({ nome: 'A' })];
    const antes = nomes(fora);
    ordenarVitrine(fora);
    expect(nomes(fora)).toEqual(antes);
  });
});

describe('destaqueDaVitrine — o convite do hero', () => {
  it('é a primeira experiência ABERTA e FUTURA da lista já ordenada', () => {
    const ordenados = ordenarVitrine([
      ev({ nome: 'Encerrada', estadoVenda: 'encerrado' }),
      ev({ nome: 'Aberta perto', dataISO: '2026-04-05T09:00:00-03:00' }),
      ev({ nome: 'Aberta longe', dataISO: '2026-12-05T09:00:00-03:00' }),
    ]);
    expect(destaqueDaVitrine(ordenados)?.nome).toBe('Aberta perto');
  });

  it('nunca convida para evento esgotado ou encerrado', () => {
    const ordenados = ordenarVitrine([
      ev({ nome: 'Esgotada', estadoVenda: 'esgotado' }),
      ev({ nome: 'Encerrada', estadoVenda: 'encerrado' }),
    ]);
    expect(destaqueDaVitrine(ordenados)).toBeNull();
  });

  it('nunca convida para experiência ABERTA que já aconteceu', () => {
    const ordenados = ordenarVitrine([ev({ nome: 'Aberta mas passada', futuro: false })]);
    expect(destaqueDaVitrine(ordenados)).toBeNull();
  });

  it('sem nenhum evento, devolve null — o hero volta a uma coluna, sem slot vazio', () => {
    expect(destaqueDaVitrine([])).toBeNull();
  });
});
