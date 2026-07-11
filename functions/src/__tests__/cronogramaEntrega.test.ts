/**
 * cronogramaEntrega.test.ts — LEELA-FABLE-F-T1 (unit PURO, sem Emulator)
 *
 * Cronograma de entrega do Evento (core/eventos/cronogramaEntrega.ts):
 *   - guards de shape (dia civil ISO, HH:mm, fim > início, local)
 *   - validação de cronograma (teto, janela após a prova)
 *   - derivações com `agora` INJETÁVEL pinadas em FUSO_EVENTO: janela ativa
 *     agora, "Dia N de M", próxima janela
 *   - parseEvento fail-fast estendido (janelasEntrega + faixaChips)
 *
 * Determinismo de TZ (padrão dataEventoContrato.test.ts): todo `agora` é um
 * INSTANTE explícito com offset -03:00 — o resultado independe do fuso do
 * runner porque as derivações pinam em FUSO_EVENTO via Intl.
 */
import { describe, expect, it } from 'vitest';
import {
  JANELAS_ENTREGA_MAX,
  dataEventoParaDate,
  diaDaEntrega,
  diasDeEntrega,
  horaLocalHHmm,
  isHoraJanela,
  isJanelaEntrega,
  janelaEntregaAtiva,
  ordenarJanelasEntrega,
  parseEvento,
  proximaJanelaEntrega,
  validarJanelasEntrega,
  type JanelaEntrega,
  type Timestamp,
} from '@leela/core';

// Cronograma da Meia Floripa 2026 (prova 27/04) — espelho do seed de preview.
const ARENA = 'Arena Meia Floripa — Beira-Mar Norte';
const JANELAS: JanelaEntrega[] = [
  { dia: '2026-04-25', horaInicio: '10:00', horaFim: '20:00', local: ARENA },
  { dia: '2026-04-26', horaInicio: '10:00', horaFim: '18:00', local: ARENA },
  {
    dia: '2026-04-27',
    horaInicio: '05:00',
    horaFim: '06:30',
    local: 'Balcão da largada — retirada tardia',
  },
];

const ts = { seconds: 1, nanoseconds: 0 } as unknown as Timestamp;

function docEvento(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    nome: 'Meia Maratona Floripa 2026',
    tenantId: 'castelo-producoes',
    organizadorId: 'uid-marina',
    local: 'Florianópolis/SC',
    slug: 'meia-floripa-2026',
    status: 'publicado',
    usaChip: true,
    modalidades: ['5k', '10k', '21k'],
    data: ts,
    criadoEm: ts,
    atualizadoEm: ts,
    qtdInscritos: 453,
    receitaConfirmada: 85617,
    ...extra,
  };
}

describe('isHoraJanela — shape HH:mm local', () => {
  it('aceita horários h23 zero-padded', () => {
    expect(isHoraJanela('00:00')).toBe(true);
    expect(isHoraJanela('05:30')).toBe(true);
    expect(isHoraJanela('23:59')).toBe(true);
  });

  it('rejeita 24:00, hora sem zero à esquerda, minuto inválido e lixo', () => {
    expect(isHoraJanela('24:00')).toBe(false);
    expect(isHoraJanela('9:00')).toBe(false);
    expect(isHoraJanela('10:60')).toBe(false);
    expect(isHoraJanela('10h00')).toBe(false);
    expect(isHoraJanela(1000)).toBe(false);
    expect(isHoraJanela(null)).toBe(false);
  });
});

describe('isJanelaEntrega — shape + invariante fim > início', () => {
  it('aceita janela válida', () => {
    expect(isJanelaEntrega(JANELAS[0])).toBe(true);
  });

  it('rejeita fim == início e fim < início (janela vazia/invertida)', () => {
    expect(
      isJanelaEntrega({ dia: '2026-04-25', horaInicio: '10:00', horaFim: '10:00', local: ARENA })
    ).toBe(false);
    expect(
      isJanelaEntrega({ dia: '2026-04-25', horaInicio: '18:00', horaFim: '10:00', local: ARENA })
    ).toBe(false);
  });

  it('rejeita dia datetime/calendário impossível (shape do dia civil)', () => {
    expect(
      isJanelaEntrega({
        dia: '2026-04-25T10:00:00-03:00',
        horaInicio: '10:00',
        horaFim: '20:00',
        local: ARENA,
      })
    ).toBe(false);
    expect(
      isJanelaEntrega({ dia: '2026-02-30', horaInicio: '10:00', horaFim: '20:00', local: ARENA })
    ).toBe(false);
  });

  it('rejeita local vazio/whitespace e não-objeto', () => {
    expect(
      isJanelaEntrega({ dia: '2026-04-25', horaInicio: '10:00', horaFim: '20:00', local: '  ' })
    ).toBe(false);
    expect(isJanelaEntrega(null)).toBe(false);
    expect(isJanelaEntrega([JANELAS[0]])).toBe(false);
  });
});

describe('validarJanelasEntrega — lista de problemas p/ o form', () => {
  it('cronograma válido (com dia da prova incluso) → sem erros', () => {
    const prova = dataEventoParaDate('2026-04-27');
    expect(validarJanelasEntrega(JANELAS, prova)).toEqual([]);
  });

  it('janela DEPOIS do dia civil da prova → erro (entrega não existe pós-prova)', () => {
    const prova = dataEventoParaDate('2026-04-27');
    const erros = validarJanelasEntrega(
      [...JANELAS, { dia: '2026-04-28', horaInicio: '10:00', horaFim: '12:00', local: ARENA }],
      prova
    );
    expect(erros).toHaveLength(1);
    expect(erros[0]).toContain('2026-04-28');
    expect(erros[0]).toContain('depois da prova');
  });

  it('shape inválido aponta a janela (1-based) e não mascara as demais', () => {
    const erros = validarJanelasEntrega([
      JANELAS[0]!,
      { dia: '2026-04-26', horaInicio: '18:00', horaFim: '10:00', local: ARENA },
    ]);
    expect(erros).toHaveLength(1);
    expect(erros[0]).toContain('janela 2');
  });

  it(`mais de ${JANELAS_ENTREGA_MAX} janelas → erro de teto`, () => {
    const muitas = Array.from({ length: JANELAS_ENTREGA_MAX + 1 }, (_, i) => ({
      dia: '2026-04-25',
      horaInicio: '10:00',
      horaFim: '20:00',
      local: `Tenda ${i + 1}`,
    }));
    expect(validarJanelasEntrega(muitas).some((e) => e.includes('máximo'))).toBe(true);
  });

  it('cronograma vazio é válido (evento sem entrega configurada)', () => {
    expect(validarJanelasEntrega([])).toEqual([]);
  });
});

describe('ordenarJanelasEntrega / diasDeEntrega', () => {
  it('ordena por (dia, horaInicio) sem mutar a entrada', () => {
    const desordenadas = [JANELAS[2]!, JANELAS[0]!, JANELAS[1]!];
    const copia = [...desordenadas];
    expect(ordenarJanelasEntrega(desordenadas)).toEqual(JANELAS);
    expect(desordenadas).toEqual(copia);
  });

  it('duas janelas no MESMO dia ordenam por horaInicio', () => {
    const manha = { dia: '2026-04-25', horaInicio: '08:00', horaFim: '12:00', local: ARENA };
    const tarde = { dia: '2026-04-25', horaInicio: '14:00', horaFim: '20:00', local: ARENA };
    expect(ordenarJanelasEntrega([tarde, manha])).toEqual([manha, tarde]);
  });

  it('diasDeEntrega deduplica e ordena (base do "de M")', () => {
    const dupla = [
      ...JANELAS,
      { dia: '2026-04-25', horaInicio: '21:00', horaFim: '22:00', local: ARENA },
    ];
    expect(diasDeEntrega(dupla)).toEqual(['2026-04-25', '2026-04-26', '2026-04-27']);
  });
});

describe('horaLocalHHmm — hora civil no fuso do evento', () => {
  it('pina em America/Sao_Paulo independente do TZ do runner', () => {
    // 13:00Z = 10:00 em UTC-3
    expect(horaLocalHHmm(new Date('2026-04-25T13:00:00Z'))).toBe('10:00');
  });

  it('meia-noite é 00:xx (h23), nunca 24:xx', () => {
    expect(horaLocalHHmm(new Date('2026-04-25T03:00:00Z'))).toBe('00:00');
  });
});

describe('janelaEntregaAtiva — agora injetável, fim EXCLUSIVO', () => {
  it('dentro da janela do dia 1 → ativa', () => {
    const ativa = janelaEntregaAtiva(JANELAS, new Date('2026-04-25T15:30:00-03:00'));
    expect(ativa?.dia).toBe('2026-04-25');
  });

  it('borda de abertura é INCLUSIVA (10:00 em ponto → ativa)', () => {
    expect(janelaEntregaAtiva(JANELAS, new Date('2026-04-25T10:00:00-03:00'))?.dia).toBe(
      '2026-04-25'
    );
    expect(janelaEntregaAtiva(JANELAS, new Date('2026-04-25T09:59:00-03:00'))).toBeNull();
  });

  it('borda de fechamento é EXCLUSIVA (20:00 em ponto → fechada)', () => {
    expect(janelaEntregaAtiva(JANELAS, new Date('2026-04-25T19:59:00-03:00'))?.dia).toBe(
      '2026-04-25'
    );
    expect(janelaEntregaAtiva(JANELAS, new Date('2026-04-25T20:00:00-03:00'))).toBeNull();
  });

  it('madrugada da prova (05:00–06:30) → janela da largada, não a da arena', () => {
    const ativa = janelaEntregaAtiva(JANELAS, new Date('2026-04-27T05:45:00-03:00'));
    expect(ativa?.local).toBe('Balcão da largada — retirada tardia');
  });

  it('dia sem janela e cronograma vazio → null (nunca fabrica)', () => {
    expect(janelaEntregaAtiva(JANELAS, new Date('2026-04-24T12:00:00-03:00'))).toBeNull();
    expect(janelaEntregaAtiva([], new Date('2026-04-25T12:00:00-03:00'))).toBeNull();
  });

  it('janelas sobrepostas no mesmo dia → primeira na ordem canônica', () => {
    const sobrepostas = [
      { dia: '2026-04-25', horaInicio: '12:00', horaFim: '20:00', local: 'Tenda B' },
      { dia: '2026-04-25', horaInicio: '10:00', horaFim: '16:00', local: 'Tenda A' },
    ];
    expect(
      janelaEntregaAtiva(sobrepostas, new Date('2026-04-25T13:00:00-03:00'))?.local
    ).toBe('Tenda A');
  });

  it('dia civil respeita o fuso do evento (23:00Z do dia 25 ainda é 20:00 do 25 em SP)', () => {
    // 2026-04-26T00:30:00Z = 2026-04-25T21:30 em SP → dia 25, mas após 20:00 → null
    expect(janelaEntregaAtiva(JANELAS, new Date('2026-04-26T00:30:00Z'))).toBeNull();
    // 2026-04-25T13:30:00Z = 10:30 em SP → ativa no dia 25
    expect(janelaEntregaAtiva(JANELAS, new Date('2026-04-25T13:30:00Z'))?.dia).toBe('2026-04-25');
  });
});

describe('diaDaEntrega — "Dia N de M" (semântica de DIA civil)', () => {
  it.each([
    ['2026-04-25T11:00:00-03:00', 1],
    ['2026-04-26T11:00:00-03:00', 2],
    ['2026-04-27T05:30:00-03:00', 3],
  ])('%s → Dia %i de 3', (agora, n) => {
    expect(diaDaEntrega(JANELAS, new Date(agora))).toEqual({ dia: n, total: 3 });
  });

  it('num dia de entrega FORA do horário ainda é "Dia N de M" (ativa é da janela)', () => {
    expect(diaDaEntrega(JANELAS, new Date('2026-04-25T08:00:00-03:00'))).toEqual({
      dia: 1,
      total: 3,
    });
  });

  it('hoje fora do cronograma → null; cronograma vazio → null', () => {
    expect(diaDaEntrega(JANELAS, new Date('2026-04-24T12:00:00-03:00'))).toBeNull();
    expect(diaDaEntrega([], new Date('2026-04-25T12:00:00-03:00'))).toBeNull();
  });

  it('dois turnos no mesmo dia contam UM dia', () => {
    const dois = [
      { dia: '2026-04-25', horaInicio: '08:00', horaFim: '12:00', local: ARENA },
      { dia: '2026-04-25', horaInicio: '14:00', horaFim: '20:00', local: ARENA },
    ];
    expect(diaDaEntrega(dois, new Date('2026-04-25T09:00:00-03:00'))).toEqual({
      dia: 1,
      total: 1,
    });
  });
});

describe('proximaJanelaEntrega — insumo do estado "fechada"', () => {
  it('antes da primeira janela → primeira janela', () => {
    expect(proximaJanelaEntrega(JANELAS, new Date('2026-04-24T12:00:00-03:00'))).toEqual(
      JANELAS[0]
    );
  });

  it('hoje após o fechamento → janela do dia seguinte', () => {
    expect(proximaJanelaEntrega(JANELAS, new Date('2026-04-25T21:00:00-03:00'))?.dia).toBe(
      '2026-04-26'
    );
  });

  it('DURANTE uma janela ativa ela não é "próxima" (aponta a seguinte)', () => {
    expect(proximaJanelaEntrega(JANELAS, new Date('2026-04-26T11:00:00-03:00'))?.dia).toBe(
      '2026-04-27'
    );
  });

  it('após a última janela → null', () => {
    expect(proximaJanelaEntrega(JANELAS, new Date('2026-04-27T07:00:00-03:00'))).toBeNull();
  });
});

describe('parseEvento — fail-fast estendido (FABLE-F-T1)', () => {
  it('doc com cronograma + faixa parseia e devolve janelas ORDENADAS', () => {
    const evento = parseEvento(
      'meia-floripa-2026',
      docEvento({
        janelasEntrega: [JANELAS[2], JANELAS[0], JANELAS[1]],
        faixaChips: { inicio: 8001, fim: 8600 },
      })
    );
    expect(evento.janelasEntrega).toEqual(JANELAS);
    expect(evento.faixaChips).toEqual({ inicio: 8001, fim: 8600 });
  });

  it('campos ausentes normalizam para []/null (eventos legados)', () => {
    const evento = parseEvento('meia-floripa-2026', docEvento());
    expect(evento.janelasEntrega).toEqual([]);
    expect(evento.faixaChips).toBeNull();
  });

  it('janela malformada LANÇA apontando o índice (nunca descarta em silêncio)', () => {
    expect(() =>
      parseEvento(
        'meia-floripa-2026',
        docEvento({
          janelasEntrega: [
            JANELAS[0],
            { dia: '2026-04-26', horaInicio: '18:00', horaFim: '10:00', local: ARENA },
          ],
        })
      )
    ).toThrow(/janelasEntrega\[1\]/);
  });

  it('janelasEntrega não-lista e faixaChips malformada LANÇAM', () => {
    expect(() =>
      parseEvento('meia-floripa-2026', docEvento({ janelasEntrega: 'amanhã' }))
    ).toThrow(/janelasEntrega/);
    expect(() =>
      parseEvento('meia-floripa-2026', docEvento({ faixaChips: { inicio: 8600, fim: 8001 } }))
    ).toThrow(/faixaChips/);
    expect(() =>
      parseEvento('meia-floripa-2026', docEvento({ faixaChips: { inicio: 8001.5, fim: 8600 } }))
    ).toThrow(/faixaChips/);
  });

  it('faixaChips null explícito normaliza para null (não configurada)', () => {
    expect(parseEvento('meia-floripa-2026', docEvento({ faixaChips: null })).faixaChips).toBeNull();
  });
});
