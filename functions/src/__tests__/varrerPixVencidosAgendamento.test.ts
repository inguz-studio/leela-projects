/**
 * varrerPixVencidosAgendamento.test.ts — S322-T3 · RN-545.
 *
 * Molde: `adminVisaoOnda1Agendamento.test.ts`, o teste que nasceu da REV da
 * Onda 1 em 10/08. A lição que ele comprou: `.schedule('every N minutes')`
 * (sintaxe App Engine) NÃO fixa minuto nenhum — o Cloud Scheduler escolhe o
 * horário-base (na prática, derivado do deploy) e o cron pode aterrissar
 * dentro do bloco noturno 03:00-03:20, onde já partem `coletaDiaria` (03:05),
 * `encerrarEventos` (03:10), `expurgarSaude` (03:20) e
 * `recalcularStatusMembros` (03:00).
 *
 * Este arquivo falsifica o agendamento DECLARADO da function construída
 * (manifest `__endpoint.scheduleTrigger`), sem deploy e sem rede:
 *
 *   - cron explícito `3-58/5 * * * *` — grade :03/:08/:13/…/:58, cadência de
 *     5 minutos sobre um vencimento de 30 (atraso máximo de ~5 min na
 *     devolução da vaga), e nenhum dos minutos da grade coincide com os
 *     quatro instantes de partida dos noturnos;
 *   - `timeZone: 'America/Sao_Paulo'` — o mesmo dos crons da casa.
 *
 * Falsificação real: trocar a expressão por `every 5 minutes` derruba o
 * primeiro caso (o manifest passaria a declarar `schedule: 'every 5
 * minutes'`); remover o `.timeZone()` derruba o segundo (`timeZone: null`).
 */
import { describe, expect, it } from 'vitest';
import { varrerPixVencidos } from '../checkout/varrerPixVencidos';

// O getter __endpoint do firebase-functions v1 exige GCLOUD_PROJECT no env
// (triggerResource) — qualquer valor serve, nada é deployado nem conectado.
process.env['GCLOUD_PROJECT'] ??= 'demo-leela-estouro';

interface EndpointComSchedule {
  __endpoint: {
    scheduleTrigger?: { schedule?: string; timeZone?: string | null };
  };
}

/** Minutos de partida dos crons noturnos da casa (o bloco a evitar). */
const MINUTOS_NOTURNOS = [0, 5, 10, 20];

describe('varrerPixVencidos — o agendamento é explícito, e o minuto é nosso (S322-T3)', () => {
  const endpoint = (varrerPixVencidos as unknown as EndpointComSchedule)
    .__endpoint;

  it('cron explícito `3-58/5 * * * *` — minuto fixado pela expressão, nunca pelo Scheduler', () => {
    expect(endpoint.scheduleTrigger?.schedule).toBe('3-58/5 * * * *');
  });

  it('timeZone America/Sao_Paulo — o mesmo dos crons noturnos da casa', () => {
    expect(endpoint.scheduleTrigger?.timeZone).toBe('America/Sao_Paulo');
  });

  it('a grade da expressão foge do bloco 03:00-03:20 dos noturnos', () => {
    // A conta que o comentário do arquivo promete, feita de verdade: os
    // minutos que `3-58/5` produz não encostam em 00/05/10/20.
    const minutos: number[] = [];
    for (let m = 3; m <= 58; m += 5) minutos.push(m);

    expect(minutos).toEqual([3, 8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58]);
    for (const noturno of MINUTOS_NOTURNOS) {
      expect(minutos).not.toContain(noturno);
    }
  });

  it('a cadência é de 5 minutos — o atraso máximo na devolução da vaga', () => {
    const minutos: number[] = [];
    for (let m = 3; m <= 58; m += 5) minutos.push(m);
    for (let i = 1; i < minutos.length; i++) {
      expect(minutos[i]! - minutos[i - 1]!).toBe(5);
    }
    // A volta da hora (58 → 03 da hora seguinte) também são 5 minutos.
    expect(60 - minutos[minutos.length - 1]! + minutos[0]!).toBe(5);
  });
});
