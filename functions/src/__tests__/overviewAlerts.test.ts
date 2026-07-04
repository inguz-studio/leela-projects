/**
 * overviewAlerts.test.ts — LEELA-S600-T2 (backend de alertas do S602-T2)
 *
 * Unit (puro, sem Emulator): regras de derivação de alertas operacionais
 * em @leela/core (overview/alerts.ts).
 *
 * Cobre o aceite do S602-T2 (parte servidor, dona = E02-L1):
 *   - ocupação ≥ 90% → alerta `warn` "…90% das vagas preenchidas";
 *   - 3 inscrições pendentes > 24h → alerta `info` correspondente;
 *   - nenhum sinal → lista vazia (UI mostra "Tudo em dia.");
 *   - rascunho com prova a ≤ 14 dias → `warn` de publicação;
 *   - ordenação por recência; tempo relativo pt-BR.
 */
import { describe, expect, it } from 'vitest';
import {
  PENDENTE_ALERTA_HORAS,
  PRAZO_PUBLICACAO_DIAS,
  derivarAlertas,
  formatarRelativo,
  type EventoAlertaInput,
} from '@leela/core';

const AGORA = new Date('2026-04-19T12:00:00Z');
const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

function horasAtras(n: number): Date {
  return new Date(AGORA.getTime() - n * HORA_MS);
}

const MEIA: EventoAlertaInput = {
  nome: 'Meia Maratona Floripa',
  slug: 'meia-floripa-2026',
  status: 'publicado',
  qtdInscritos: 450, // 450/500 = 90% exato
  capacidade: 500,
  dataProva: new Date('2026-04-27T09:00:00Z'),
  atualizadoEm: horasAtras(2),
};

const SEM_PENDENTES = { qtd: 0, maisRecenteEm: null };

describe('overview/alerts — derivarAlertas (S600-T2/S602-T2)', () => {
  it('aceite: ocupação ≥ 90% → warn "…90% das vagas preenchidas"', () => {
    const alertas = derivarAlertas([MEIA], SEM_PENDENTES, AGORA);
    expect(alertas).toHaveLength(1);
    const alerta = alertas[0]!;
    expect(alerta.severidade).toBe('warn');
    expect(alerta.titulo).toBe(
      'Meia Maratona Floripa está com 90% das vagas preenchidas'
    );
    expect(alerta.href).toBe('/eventos/meia-floripa-2026');
    expect(alerta.quando).toBe('há 2h');
  });

  it('aceite: 3 pendentes > 24h → alerta info correspondente', () => {
    const alertas = derivarAlertas(
      [],
      { qtd: 3, maisRecenteEm: horasAtras(30) },
      AGORA
    );
    expect(alertas).toHaveLength(1);
    const alerta = alertas[0]!;
    expect(alerta.severidade).toBe('info');
    expect(alerta.titulo).toBe(
      `3 inscrições pendentes aguardam pagamento há mais de ${PENDENTE_ALERTA_HORAS}h`
    );
  });

  it('pendência única usa singular', () => {
    const alertas = derivarAlertas([], { qtd: 1, maisRecenteEm: horasAtras(26) }, AGORA);
    expect(alertas[0]!.titulo).toBe(
      `1 inscrição pendente aguarda pagamento há mais de ${PENDENTE_ALERTA_HORAS}h`
    );
  });

  it('aceite: nenhum sinal → lista vazia ("Tudo em dia." na UI)', () => {
    const tranquilo: EventoAlertaInput = {
      ...MEIA,
      qtdInscritos: 100, // 20% — sem risco
    };
    expect(derivarAlertas([tranquilo], SEM_PENDENTES, AGORA)).toEqual([]);
  });

  it('rascunho com prova a ≤ 14 dias → warn de publicação com prazo', () => {
    const retiro: EventoAlertaInput = {
      nome: 'Retiro Bem-Estar',
      slug: 'retiro-bem-estar',
      status: 'rascunho',
      qtdInscritos: 78,
      capacidade: 120,
      dataProva: new Date(AGORA.getTime() + 14 * DIA_MS),
      atualizadoEm: horasAtras(30),
    };
    const alertas = derivarAlertas([retiro], SEM_PENDENTES, AGORA);
    expect(alertas).toHaveLength(1);
    expect(alertas[0]!.severidade).toBe('warn');
    expect(alertas[0]!.titulo).toBe(
      'Retiro Bem-Estar ainda não foi publicado · prazo 14 dias'
    );
    expect(alertas[0]!.quando).toBe('ontem');
  });

  it('rascunho com prova além do prazo (15 dias) → sem alerta', () => {
    const longe: EventoAlertaInput = {
      ...MEIA,
      status: 'rascunho',
      qtdInscritos: 0,
      dataProva: new Date(AGORA.getTime() + (PRAZO_PUBLICACAO_DIAS + 1) * DIA_MS),
    };
    expect(derivarAlertas([longe], SEM_PENDENTES, AGORA)).toEqual([]);
  });

  it('rascunho com prova no passado → sem alerta de prazo (evento perdido não é prazo)', () => {
    const passado: EventoAlertaInput = {
      ...MEIA,
      status: 'rascunho',
      qtdInscritos: 0,
      dataProva: new Date(AGORA.getTime() - DIA_MS),
    };
    expect(derivarAlertas([passado], SEM_PENDENTES, AGORA)).toEqual([]);
  });

  it('rascunho NÃO gera alerta de ocupação (só evento público vende)', () => {
    const rascunhoCheio: EventoAlertaInput = {
      ...MEIA,
      status: 'rascunho',
      dataProva: new Date(AGORA.getTime() + 60 * DIA_MS), // longe do prazo
    };
    expect(derivarAlertas([rascunhoCheio], SEM_PENDENTES, AGORA)).toEqual([]);
  });

  it('ordena por recência (desc); mais recente primeiro', () => {
    const retiro: EventoAlertaInput = {
      nome: 'Retiro Bem-Estar',
      slug: 'retiro-bem-estar',
      status: 'rascunho',
      qtdInscritos: 0,
      capacidade: null,
      dataProva: new Date(AGORA.getTime() + 5 * DIA_MS),
      atualizadoEm: horasAtras(40), // mais velho
    };
    const alertas = derivarAlertas(
      [MEIA, retiro], // MEIA atualizado há 2h
      { qtd: 2, maisRecenteEm: horasAtras(25) },
      AGORA
    );
    expect(alertas.map((a) => a.id)).toEqual([
      'ocupacao-meia-floripa-2026', // há 2h
      'pendentes-24h', // há 25h
      'publicacao-retiro-bem-estar', // há 40h
    ]);
  });

  it('ocupação acima de 100% não estoura o texto (cap em 100%)', () => {
    const lotado: EventoAlertaInput = {
      ...MEIA,
      qtdInscritos: 510, // 102%
    };
    const alertas = derivarAlertas([lotado], SEM_PENDENTES, AGORA);
    expect(alertas[0]!.titulo).toContain('100% das vagas');
  });

  it('é determinística: mesma entrada → mesma saída (idempotência do agregado)', () => {
    const a = derivarAlertas([MEIA], { qtd: 3, maisRecenteEm: horasAtras(30) }, AGORA);
    const b = derivarAlertas([MEIA], { qtd: 3, maisRecenteEm: horasAtras(30) }, AGORA);
    expect(a).toEqual(b);
  });
});

describe('overview/alerts — formatarRelativo (pt-BR)', () => {
  it('cobre agora/minutos/horas/ontem/dias', () => {
    expect(formatarRelativo(new Date(AGORA.getTime() - 30_000), AGORA)).toBe('agora');
    expect(formatarRelativo(new Date(AGORA.getTime() - 35 * 60_000), AGORA)).toBe('há 35min');
    expect(formatarRelativo(horasAtras(2), AGORA)).toBe('há 2h');
    expect(formatarRelativo(horasAtras(30), AGORA)).toBe('ontem');
    expect(formatarRelativo(horasAtras(3 * 24), AGORA)).toBe('há 3 dias');
  });
});
