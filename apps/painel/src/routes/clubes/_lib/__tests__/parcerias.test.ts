import { describe, it, expect } from 'vitest';
import {
  formatBRL,
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
