// =============================================================================
// Agenda da Visão Geral (HIFI-REC) — derivação pura do calendário do
// protótipo v3 sobre a lista REAL de eventos. O que os testes protegem: o dia
// civil no fuso do produto (borda meia-noite), eventos sem data fora da grade
// e o molde do mês (offset de semana + rótulo pt-BR).
// =============================================================================

import { describe, expect, it } from 'vitest';
import {
  DIAS_DA_SEMANA,
  ROTULO_STATUS,
  anoMesDoISO,
  derivarAgenda,
  isoDoDia,
  itensPorDia,
  mesDaAgenda,
  mesVizinho,
  rotuloDoDia,
  type EventoAgendaInput,
} from '../agenda';
import { ts } from '../../_test/fixtures';

function mkEvento(over: Partial<EventoAgendaInput> = {}): EventoAgendaInput {
  return {
    nome: 'Meia Maratona Floripa 2026',
    slug: 'meia-floripa-2026',
    status: 'publicado',
    data: ts(new Date('2026-09-21T09:00:00Z')),
    local: 'Parque de Coqueiros, Florianópolis/SC',
    ...over,
  };
}

describe('derivarAgenda', () => {
  it('evento com data vira item ancorado no dia civil do produto', () => {
    const itens = derivarAgenda([mkEvento()]);
    expect(itens).toHaveLength(1);
    expect(itens[0]!.iso).toBe('2026-09-21');
    expect(itens[0]!.slug).toBe('meia-floripa-2026');
  });

  it('BORDA de fuso: 01:00Z ainda é o dia ANTERIOR em São Paulo (UTC-3)', () => {
    const itens = derivarAgenda([mkEvento({ data: ts(new Date('2026-09-21T01:00:00Z')) })]);
    expect(itens[0]!.iso).toBe('2026-09-20');
  });

  it('evento sem data fica fora da grade (ponto sem dia não existe)', () => {
    const itens = derivarAgenda([mkEvento({ data: null }), mkEvento({ slug: 'ok' })]);
    expect(itens).toHaveLength(1);
    expect(itens[0]!.slug).toBe('ok');
  });

  it('ordena por dia', () => {
    const itens = derivarAgenda([
      mkEvento({ slug: 'depois', data: ts(new Date('2026-10-05T12:00:00Z')) }),
      mkEvento({ slug: 'antes', data: ts(new Date('2026-08-01T12:00:00Z')) }),
    ]);
    expect(itens.map((i) => i.slug)).toEqual(['antes', 'depois']);
  });
});

describe('itensPorDia', () => {
  it('agrupa por dia civil, preservando a ordem', () => {
    const dia = '2026-09-21';
    const mapa = itensPorDia(
      derivarAgenda([mkEvento(), mkEvento({ slug: 'segundo', nome: 'Prova 2' })])
    );
    expect(mapa.get(dia)?.map((i) => i.slug)).toEqual(['meia-floripa-2026', 'segundo']);
    expect(mapa.has('2026-09-22')).toBe(false);
  });
});

describe('mesDaAgenda (molde da grade)', () => {
  it('Agosto 2026: 31 dias, dia 1 é sábado (offset 6), rótulo pt-BR', () => {
    const mes = mesDaAgenda(2026, 7);
    expect(mes.rotulo).toBe('Agosto 2026');
    expect(mes.dias).toBe(31);
    expect(mes.offset).toBe(6);
  });

  it('Setembro 2026: 30 dias, dia 1 é terça (offset 2)', () => {
    const mes = mesDaAgenda(2026, 8);
    expect(mes.dias).toBe(30);
    expect(mes.offset).toBe(2);
  });

  it('fevereiro bissexto: 29 dias em 2028', () => {
    expect(mesDaAgenda(2028, 1).dias).toBe(29);
  });
});

describe('navegação e rótulos', () => {
  it('mesVizinho atravessa a virada do ano nos dois sentidos', () => {
    expect(mesVizinho(2026, 11, 1)).toEqual({ ano: 2027, mes: 0 });
    expect(mesVizinho(2026, 0, -1)).toEqual({ ano: 2025, mes: 11 });
  });

  it('anoMesDoISO + isoDoDia são inversos', () => {
    expect(anoMesDoISO('2026-08-06')).toEqual({ ano: 2026, mes: 7 });
    expect(isoDoDia(2026, 7, 6)).toBe('2026-08-06');
  });

  it('rotuloDoDia no formato do protótipo ("6 de Agosto 2026")', () => {
    expect(rotuloDoDia('2026-08-06')).toBe('6 de Agosto 2026');
  });

  it('a linha de semana tem 7 letras, domingo primeiro', () => {
    expect(DIAS_DA_SEMANA).toEqual(['D', 'S', 'T', 'Q', 'Q', 'S', 'S']);
  });

  it('etiqueta de status é o status REAL, sem inventar', () => {
    expect(ROTULO_STATUS.publicado).toBe('Publicado');
    expect(ROTULO_STATUS.rascunho).toBe('Rascunho');
    expect(ROTULO_STATUS.ao_vivo).toBe('Ao vivo');
    expect(ROTULO_STATUS.encerrado).toBe('Encerrado');
  });
});
