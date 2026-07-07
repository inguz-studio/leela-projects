import { describe, expect, it } from 'vitest';
import {
  contarPorFiltro,
  derivarHubEventos,
  filtrarHubEventos,
  toHubEventoView,
} from '../hubRows';
import { mkEvento } from '../../_test/fixtures';
import { formatBRL } from '../../_lib/format';

describe('hubRows — derivação pura do hub', () => {
  it('mapeia métricas Inscritos/Receita/Vagas com formatação pt-BR', () => {
    const view = toHubEventoView(
      mkEvento({ qtdInscritos: 453, receitaConfirmada: 85617, capacidade: 500 }),
    );
    expect(view.metrics).toEqual([
      { value: '453', label: 'Inscritos' },
      { value: formatBRL(85617), label: 'Receita' }, // NBSP no separador pt-BR
      { value: '47', label: 'Vagas' }, // 500 - 453
    ]);
  });

  it('Vagas é "∞" quando a capacidade é desconhecida (honesto)', () => {
    const view = toHubEventoView(mkEvento({ capacidade: null, qtdInscritos: 10 }));
    expect(view.metrics[2]).toEqual({ value: '∞', label: 'Vagas' });
  });

  it('repassa a foto (imagemUrl) e deriva o thumbVariant por modalidade', () => {
    const view = toHubEventoView(
      mkEvento({ modalidades: ['MTB 90km'], imagemUrl: '/seed-images/mtb.jpg' }),
    );
    expect(view.imagemUrl).toBe('/seed-images/mtb.jpg');
    expect(view.thumbVariant).toBe('ciclismo');
  });

  it('sem foto, imagemUrl fica ausente (fallback no gradiente da variante)', () => {
    const view = toHubEventoView(mkEvento()); // fixture-base não tem imagemUrl
    expect(view.imagemUrl).toBeUndefined();
    expect(view.thumbVariant).toBe('corrida');
  });

  it('esgotado quando capacidade conhecida e zero vagas', () => {
    const view = toHubEventoView(
      mkEvento({ status: 'publicado', capacidade: 60, qtdInscritos: 60 }),
    );
    expect(view.esgotado).toBe(true);
  });

  it('categoriza por status para o filtro (ativos/encerrados/rascunhos)', () => {
    expect(toHubEventoView(mkEvento({ status: 'publicado' })).categoria).toBe('ativos');
    expect(toHubEventoView(mkEvento({ status: 'ao_vivo' })).categoria).toBe('ativos');
    expect(toHubEventoView(mkEvento({ status: 'encerrado' })).categoria).toBe('encerrados');
    expect(toHubEventoView(mkEvento({ status: 'rascunho' })).categoria).toBe('rascunhos');
  });

  it('conta e filtra por faceta; "todos" não filtra', () => {
    const views = derivarHubEventos([
      mkEvento({ slug: 'a', status: 'publicado' }),
      mkEvento({ slug: 'b', status: 'encerrado' }),
      mkEvento({ slug: 'c', status: 'rascunho' }),
    ]);
    expect(contarPorFiltro(views)).toEqual({
      todos: 3,
      ativos: 1,
      encerrados: 1,
      rascunhos: 1,
    });
    expect(filtrarHubEventos(views, 'todos')).toHaveLength(3);
    expect(filtrarHubEventos(views, 'encerrados').map((v) => v.slug)).toEqual(['b']);
  });
});
