import { describe, it, expect } from 'vitest';
import {
  alertasChipBalcao,
  estadoBalcao,
  itensDoKit,
  janelaEntregaAberta,
  kitDocId,
  passoAtual,
  passosStepper,
  resumoBalcao,
  resumoBalcaoDetalhado,
  ritmoAtendimentos,
} from '../balcao';
import type { ItemKit } from '@leela/core';
import { mkEvento, mkInscrito, ts } from '../../_test/fixtures';

const AGORA = new Date('2026-04-26T09:00:00Z'); // 1 dia antes da prova padrão

function mkItem(over: Partial<ItemKit> = {}): ItemKit {
  return {
    id: over.id ?? 'item-1',
    tenantId: 'castelo',
    eventoId: 'meia-floripa-2026',
    nome: over.nome ?? 'Item',
    tamanhado: over.tamanhado ?? false,
    origem: over.origem ?? 'organizador',
    exibirLogo: over.exibirLogo ?? false,
    kits: over.kits ?? ['kit-ouro'],
    criadoEm: ts(AGORA),
    atualizadoEm: ts(AGORA),
    ...over,
  };
}

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

describe('resumoBalcaoDetalhado', () => {
  it('conta kits elegíveis/entregues e chips vinculados (confirmados)', () => {
    const pool = [
      // atendido com kit + chip
      mkInscrito({ id: '1', kit: 'kit_ouro', chipNumero: 'C1', kitEntregueEm: ts(AGORA), checkinEm: ts(AGORA) }),
      // confirmado com kit, ainda sem retirar
      mkInscrito({ id: '2', kit: 'kit_prata', chipNumero: null }),
      // sem_kit não conta como elegível a kit
      mkInscrito({ id: '3', kit: 'sem_kit', chipNumero: 'C3' }),
      // cancelado é ignorado
      mkInscrito({ id: '4', status: 'cancelado', kit: 'kit_ouro', chipNumero: 'C4' }),
    ];
    const r = resumoBalcaoDetalhado(pool);
    expect(r.kitElegiveis).toBe(2); // ouro + prata (sem_kit fora, cancelado fora)
    expect(r.kitsEntregues).toBe(1);
    expect(r.chipsVinculados).toBe(2); // C1 + C3 (C4 cancelado fora)
  });
});

describe('ritmoAtendimentos', () => {
  it('sem presença → série vazia (Sparkline não desenha)', () => {
    expect(ritmoAtendimentos([mkInscrito()])).toEqual({ porHora: [], ultimaHora: 0, total: 0 });
  });
  it('agrupa checkinEm em baldes horários, última hora no fim', () => {
    const agora = new Date('2026-04-27T12:00:00Z');
    const h = (n: number) => ts(new Date(agora.getTime() - n * 3600_000));
    const pool = [
      mkInscrito({ id: '1', checkinEm: h(0.5) }), // última hora
      mkInscrito({ id: '2', checkinEm: h(0.2) }), // última hora
      mkInscrito({ id: '3', checkinEm: h(2.5) }), // ~3 horas atrás
    ];
    const r = ritmoAtendimentos(pool, 12, agora);
    expect(r.total).toBe(3);
    expect(r.porHora).toHaveLength(12);
    expect(r.ultimaHora).toBe(2);
    expect(r.porHora.reduce((a, b) => a + b, 0)).toBe(3);
  });
});

describe('kitDocId / itensDoKit (RN-215)', () => {
  it('mapeia enum → docId (underscore → hyphen)', () => {
    expect(kitDocId('kit_ouro')).toBe('kit-ouro');
    expect(kitDocId('sem_kit')).toBe('sem-kit');
  });
  it('filtra itens do kit do atleta e ordena tamanhados primeiro', () => {
    const itens = [
      mkItem({ id: 'whey', nome: 'Whey', kits: ['kit-ouro', 'kit-prata'] }),
      mkItem({ id: 'camiseta', nome: 'Camiseta', tamanhado: true, kits: ['kit-ouro'] }),
      mkItem({ id: 'so-basico', nome: 'Básico', kits: ['kit-basico'] }),
    ];
    const out = itensDoKit(itens, 'kit_ouro');
    expect(out.map((i) => i.id)).toEqual(['camiseta', 'whey']); // tamanhado primeiro
  });
  it('sem_kit → nenhum item', () => {
    expect(itensDoKit([mkItem({ kits: ['sem-kit'] })], 'sem_kit')).toEqual([]);
  });
});

describe('alertasChipBalcao (FRENTE F — chip órfão / estoque / fora da faixa)', () => {
  const faixa = { inicio: 8001, fim: 8600 };

  it('usaChip=false → nenhum alerta e estoque null', () => {
    const pool = [mkInscrito({ chipNumero: null, kitEntregueEm: ts(AGORA) })];
    expect(alertasChipBalcao(pool, faixa, false)).toEqual({
      orfaos: [],
      foraDaFaixa: [],
      estoque: null,
    });
  });

  it('chip órfão: retirou kit sem vincular chip (chipOrfao · RN-207)', () => {
    const pool = [
      mkInscrito({ id: '1', atletaNome: 'Ana', chipNumero: null, kitEntregueEm: ts(AGORA) }),
      mkInscrito({ id: '2', atletaNome: 'Bia', chipNumero: '8100', kitEntregueEm: ts(AGORA) }),
    ];
    const out = alertasChipBalcao(pool, faixa, true);
    expect(out.orfaos).toEqual(['Ana']);
    expect(out.foraDaFaixa).toEqual([]);
  });

  it('chip fora da faixa é sinalizado (chipForaDaFaixa) e não consome estoque', () => {
    const pool = [mkInscrito({ atletaNome: 'Caio', chipNumero: '9999', kitEntregueEm: ts(AGORA) })];
    const out = alertasChipBalcao(pool, faixa, true);
    expect(out.foraDaFaixa).toEqual(['Caio']);
    expect(out.estoque?.foraDaFaixa).toBe(1);
    expect(out.estoque?.vinculados).toBe(0);
  });

  it('estoque esgotado quando a faixa de 1 chip está ocupada', () => {
    const pool = [mkInscrito({ chipNumero: '8001', kitEntregueEm: ts(AGORA) })];
    const out = alertasChipBalcao(pool, { inicio: 8001, fim: 8001 }, true);
    expect(out.estoque?.esgotado).toBe(true);
    expect(out.estoque?.disponiveis).toBe(0);
  });

  it('cancelado não conta como órfão nem consome estoque', () => {
    const pool = [
      mkInscrito({ atletaNome: 'Duda', chipNumero: null, kitEntregueEm: ts(AGORA), status: 'cancelado' }),
    ];
    const out = alertasChipBalcao(pool, faixa, true);
    expect(out.orfaos).toEqual([]);
    expect(out.estoque?.vinculados).toBe(0);
  });

  it('sem faixa configurada → estoque null, mas órfão ainda alerta', () => {
    const pool = [mkInscrito({ atletaNome: 'Edu', chipNumero: null, kitEntregueEm: ts(AGORA) })];
    const out = alertasChipBalcao(pool, null, true);
    expect(out.orfaos).toEqual(['Edu']);
    expect(out.estoque).toBeNull();
  });
});
