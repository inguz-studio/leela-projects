import { describe, it, expect } from 'vitest';
import type { Marca, StatusMarca } from '@leela/core';
import {
  eventoNomeLegivel,
  formatBRL,
  kpisParcerias,
  marcasParaAutocomplete,
  modeloComercialLabel,
  separarParcerias,
  statusParceriaBadge,
} from '../parcerias';
import { mkEventoAfiliado, mkPatrocinador } from '../../_test/fixtures';

describe('separarParcerias', () => {
  it('agrupa em convites pendentes, eventos promovidos e patrocinadores', () => {
    const parcerias = [
      mkEventoAfiliado({ id: 'p1', status: 'convite_pendente' }),
      mkEventoAfiliado({ id: 'p2', status: 'ativa' }),
      mkEventoAfiliado({ id: 'p3', status: 'inativa' }),
      mkPatrocinador({ id: 's1', status: 'ativa' }),
      mkPatrocinador({ id: 's2', status: 'inativa' }),
    ];
    const b = separarParcerias(parcerias);
    expect(b.convitesPendentes.map((p) => p.id)).toEqual(['p1']);
    expect(b.eventosPromovidos.map((p) => p.id)).toEqual(['p2']);
    // evento inativo e patrocinador inativo somem
    expect(b.patrocinadores.map((p) => p.id)).toEqual(['s1']);
  });
});

describe('kpisParcerias', () => {
  it('deriva os KPIs dos blocos: ∑ conversões/a-receber dos promovidos, sem inventar dado', () => {
    const parcerias = [
      mkEventoAfiliado({ id: 'p1', status: 'convite_pendente' }),
      mkEventoAfiliado({ id: 'p2', status: 'ativa', conversoes: 10, valorAReceber: 500 }),
      mkEventoAfiliado({ id: 'p3', status: 'ativa', conversoes: 5, valorAReceber: 250 }),
      mkPatrocinador({ id: 's1', status: 'ativa' }),
      mkPatrocinador({ id: 's2', status: 'inativa' }),
    ];
    const kpis = kpisParcerias(separarParcerias(parcerias));
    expect(kpis.eventos).toBe(3); // 2 promovidos + 1 convite pendente
    expect(kpis.conversoes).toBe(15);
    expect(kpis.valorAReceber).toBe(750);
    expect(kpis.patrocinadores).toBe(1); // o inativo some
  });

  it('zera com nenhuma parceria', () => {
    expect(kpisParcerias(separarParcerias([]))).toEqual({
      eventos: 0,
      conversoes: 0,
      valorAReceber: 0,
      patrocinadores: 0,
    });
  });
});

describe('eventoNomeLegivel', () => {
  it('humaniza o slug do evento em nome legível (identificador → rótulo)', () => {
    expect(eventoNomeLegivel('acate-corporativo-2026')).toBe('Acate Corporativo 2026');
    expect(eventoNomeLegivel('meia-floripa-2026')).toBe('Meia Floripa 2026');
    expect(eventoNomeLegivel('trail-ratones-2026')).toBe('Trail Ratones 2026');
  });

  it('tolera underscores, hifens repetidos e slug vazio', () => {
    expect(eventoNomeLegivel('morro_da_cruz')).toBe('Morro Da Cruz');
    expect(eventoNomeLegivel('corrida--ponte')).toBe('Corrida Ponte');
    expect(eventoNomeLegivel('')).toBe('');
  });
});

describe('rótulos e formatação', () => {
  it('status vira badge com variante', () => {
    expect(statusParceriaBadge('convite_pendente').variant).toBe('heroico');
    expect(statusParceriaBadge('ativa').variant).toBe('vitoria');
  });

  it('modelo comercial tem rótulo', () => {
    expect(modeloComercialLabel('financeiro')).toBe('Financeiro');
    expect(modeloComercialLabel('permuta')).toBe('Permuta');
  });

  it('formatBRL formata em reais pt-BR', () => {
    expect(formatBRL(1234.5)).toContain('1.234,50');
    expect(formatBRL(640)).toContain('640,00');
  });
});

// ── PATROCINADOR-TOGGLE (decisão do dono de 09/08 §20) ────────────────────
describe('marcasParaAutocomplete', () => {
  function mkMarca(id: string, status: StatusMarca): Marca {
    return {
      id,
      nome: id,
      modeloComercial: 'financeiro',
      valorAnual: 1000,
      status,
      criadoEm: { seconds: 0, nanoseconds: 0 } as unknown as Marca['criadoEm'],
      atualizadoEm: { seconds: 0, nanoseconds: 0 } as unknown as Marca['atualizadoEm'],
    };
  }

  it('a marca desligada some do autocomplete de patrocínios novos', () => {
    const registro = [mkMarca('cafe-rota', 'ativa'), mkMarca('cdl', 'inativa')];
    expect(marcasParaAutocomplete(registro).map((m) => m.id)).toEqual(['cafe-rota']);
  });

  it('registro que não chegou não vira lista vazia disfarçada de registro vazio', () => {
    expect(marcasParaAutocomplete(null)).toEqual([]);
    expect(marcasParaAutocomplete(undefined)).toEqual([]);
    expect(marcasParaAutocomplete([])).toEqual([]);
  });
});
