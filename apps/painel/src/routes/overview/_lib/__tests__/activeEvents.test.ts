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

// ---------------------------------------------------------------------------
// T5 FIDELIDADE — thumb por modalidade (heurística de APRESENTAÇÃO) + "quando"
// ---------------------------------------------------------------------------

import { quandoDoEvento, thumbVariantDoEvento } from '../activeEvents';
import type { Timestamp } from '@leela/core';

describe('thumbVariantDoEvento (heurística de apresentação, T5)', () => {
  it('detecta ciclismo por modalidade ou nome', () => {
    expect(thumbVariantDoEvento(['MTB 60km'], 'Desafio Serra')).toBe('ciclismo');
    expect(thumbVariantDoEvento([], 'Gran Fondo Bike Tour')).toBe('ciclismo');
  });

  it('detecta yoga/bem-estar/retiro, virtual e crossfit', () => {
    expect(thumbVariantDoEvento(['Pacote completo'], 'Retiro Bem-Estar')).toBe('yoga');
    expect(thumbVariantDoEvento(['Desafio Virtual'], 'Corrida')).toBe('virtual');
    expect(thumbVariantDoEvento(['WOD em dupla'], 'Throwdown')).toBe('crossfit');
  });

  it('default é corrida (domínio LEELA) — errar aqui muda só cor decorativa', () => {
    expect(thumbVariantDoEvento(['5k', '10k', '21k'], 'Meia Maratona Floripa')).toBe('corrida');
    expect(thumbVariantDoEvento([], 'Evento sem sinal')).toBe('corrida');
  });
});

describe('quandoDoEvento (meta "27 Abr · Local", T5)', () => {
  const ts = (iso: string): Timestamp =>
    ({ toMillis: () => new Date(iso).getTime() }) as unknown as Timestamp;

  it('data + local → "27 Abr · Florianópolis/SC"', () => {
    expect(quandoDoEvento(ts('2026-04-27T09:00:00'), 'Florianópolis/SC')).toBe(
      '27 Abr · Florianópolis/SC'
    );
  });

  it('degrada honesto: só local, só data, ou null sem ambos', () => {
    expect(quandoDoEvento(null, 'Cunha/SP')).toBe('Cunha/SP');
    expect(quandoDoEvento(ts('2026-05-11T08:00:00'), '')).toBe('11 Mai');
    expect(quandoDoEvento(null, undefined)).toBeNull();
  });
});
