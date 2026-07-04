import { describe, it, expect } from 'vitest';
import {
  estadoBalcao,
  janelaEntregaAberta,
  passoAtual,
  passosStepper,
  resumoBalcao,
} from '../balcao';
import { mkEvento, mkInscrito, ts } from '../../_test/fixtures';

const AGORA = new Date('2026-04-26T09:00:00Z'); // 1 dia antes da prova padrão

describe('passosStepper (RN-205/207/216)', () => {
  it('evento com chip tem 3 passos', () => {
    expect(passosStepper('kit_ouro', true).map((p) => p.id)).toEqual(['kit', 'chip', 'checkin']);
  });
  it('usaChip=false suprime o passo de chip (RN-207)', () => {
    expect(passosStepper('kit_ouro', false).map((p) => p.id)).toEqual(['kit', 'checkin']);
  });
  it('rótulos usam "kit", nunca "tier" (RN-216)', () => {
    expect(passosStepper('kit_ouro', true)[0]!.label).toBe('Entregar kit');
  });
});

describe('passoAtual', () => {
  const passos = passosStepper('kit_ouro', true).map((p) => p.id);
  it('chip pendente (usaChip) → passo chip', () => {
    expect(passoAtual(passos, mkInscrito({ chipNumero: null }), true)).toBe(1);
  });
  it('chip vinculado → passo checkin (fechar)', () => {
    expect(passoAtual(passos, mkInscrito({ chipNumero: 'ABC123' }), true)).toBe(2);
  });
  it('sem chip no evento → vai direto ao checkin (kit concluído antes)', () => {
    const passosSemChip = passosStepper('sem_kit', false).map((p) => p.id);
    expect(passoAtual(passosSemChip, mkInscrito({ chipNumero: null }), false)).toBe(1);
  });
});

describe('janelaEntregaAberta', () => {
  it('abre até 2 dias antes da prova', () => {
    expect(janelaEntregaAberta(mkEvento(), AGORA)).toBe(true);
  });
  it('fecha quando a prova está distante', () => {
    const longe = new Date('2026-03-01T09:00:00Z');
    expect(janelaEntregaAberta(mkEvento(), longe)).toBe(false);
  });
  it('evento encerrado nunca abre', () => {
    expect(janelaEntregaAberta(mkEvento({ status: 'encerrado' }), AGORA)).toBe(false);
  });
});

describe('estadoBalcao', () => {
  it('sem inscrito → vazio', () => {
    expect(estadoBalcao(mkEvento(), null, AGORA)).toBe('vazio');
  });
  it('inscrito com presença → completo', () => {
    const i = mkInscrito({ checkinEm: ts(AGORA) });
    expect(estadoBalcao(mkEvento(), i, AGORA)).toBe('completo');
  });
  it('fora da janela mesmo com inscrito', () => {
    const longe = new Date('2026-03-01T09:00:00Z');
    expect(estadoBalcao(mkEvento(), mkInscrito(), longe)).toBe('fora_janela');
  });
});

describe('resumoBalcao', () => {
  it('conta confirmados/atendidos/pendentes por presença', () => {
    const pool = [
      mkInscrito({ id: '1', status: 'confirmado', checkinEm: ts(AGORA) }),
      mkInscrito({ id: '2', status: 'confirmado' }),
      mkInscrito({ id: '3', status: 'cancelado' }),
    ];
    expect(resumoBalcao(pool)).toEqual({ confirmados: 2, atendidos: 1, pendentes: 1 });
  });
});
