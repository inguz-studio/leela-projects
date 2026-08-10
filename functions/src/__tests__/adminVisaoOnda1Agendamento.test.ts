/**
 * adminVisaoOnda1Agendamento.test.ts — ONDA1-FIX · D-1 (review ONDA1-REV).
 *
 * O cabeçalho de `platform/rollups.ts` promete "roda no minuto 15 para não
 * colidir com o bloco 03:00-03:20 dos crons noturnos". `.schedule('every 1
 * hours')` (sintaxe App Engine) NÃO fixa minuto nenhum — o Cloud Scheduler
 * escolhe o horário-base (na prática, derivado do deploy) e o cron pode
 * aterrissar dentro do bloco noturno. Este teste falsifica o agendamento
 * DECLARADO da função construída (manifest `__endpoint.scheduleTrigger`),
 * sem deploy:
 *
 *   - cron explícito `15 * * * *` (minuto 15 de cada hora — o que o
 *     comentário do arquivo sempre prometeu);
 *   - `timeZone: 'America/Sao_Paulo'` — o MESMO dos quatro crons noturnos
 *     da casa (coletaDiaria :223-224, encerrarEventos :155-156 via
 *     FUSO_EVENTO, expurgarSaude :148-149, recalcularStatusMembros :22-23).
 *
 * Falsificação real: contra o código velho (`every 1 hours`, sem
 * `.timeZone()`) as duas asserções falham — o manifest declarava
 * `schedule: 'every 1 hours'` e `timeZone: null`.
 */
import { describe, expect, it } from 'vitest';
import { agendarRecomputePlatformRollups } from '../platform/rollups';

// O getter __endpoint do firebase-functions v1 exige GCLOUD_PROJECT no env
// (triggerResource) — qualquer valor serve, nada é deployado nem conectado.
process.env['GCLOUD_PROJECT'] ??= 'demo-leela-admin-visao';

interface EndpointComSchedule {
  __endpoint: {
    scheduleTrigger?: { schedule?: string; timeZone?: string | null };
  };
}

describe('agendarRecomputePlatformRollups — o agendamento cumpre o que o comentário promete (D-1)', () => {
  it('cron explícito 15 * * * * — minuto 15, fora do bloco 03:00-03:20', () => {
    const endpoint = (
      agendarRecomputePlatformRollups as unknown as EndpointComSchedule
    ).__endpoint;
    expect(endpoint.scheduleTrigger?.schedule).toBe('15 * * * *');
  });

  it('timeZone America/Sao_Paulo — o mesmo dos quatro crons noturnos da casa', () => {
    const endpoint = (
      agendarRecomputePlatformRollups as unknown as EndpointComSchedule
    ).__endpoint;
    expect(endpoint.scheduleTrigger?.timeZone).toBe('America/Sao_Paulo');
  });
});
