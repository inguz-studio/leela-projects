// =============================================================================
// apps/landing/test/vitrine-estado-venda.test.ts — lane VITRINE-FIX
//
// O defeito que estes casos travam: a vitrine decidia "está vendendo?" olhando
// SÓ os lotes, enquanto o checkout (`resolverItem`) também cobra pelo
// preço-base legado do percurso quando a modalidade não tem lote nenhum. Como
// `criarEvento` exige `percursos` e não cria lote, todo evento nascido pelo
// painel caía exatamente nessa fresta: publicado, vendável no servidor,
// "Inscrições encerradas" na página.
//
// Os fixtures de regressão NÃO são inventados — são as formas reais lidas de
// produção (`leela-hub`) em 2026-08-04: meia-floripa-2026,
// desafio-mtb-costa-lagoa-2026 e teste-taxa-repassada.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  deriveEstadoVenda,
  diagnosticoVitrine,
  precoVitrine,
  type LoteVitrine,
  type ModalidadeVitrine,
} from '@leela/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Timestamp estrutural (o core só exige toDate/toMillis). */
function ts(iso: string): LoteVitrine['inicioEm'] {
  const d = new Date(iso);
  return {
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
    toMillis: () => d.getTime(),
  };
}

function lote(p: {
  ordem: number;
  inicio: string;
  fim: string;
  preco: number;
  limite: number;
  vendidos: number;
}): LoteVitrine {
  return {
    ordem: p.ordem,
    inicioEm: ts(p.inicio),
    fimEm: ts(p.fim),
    preco: p.preco,
    quantidadeLimite: p.limite,
    vendidos: p.vendidos,
  };
}

/** O instante de observação de toda a suíte (dado real de produção). */
const AGORA = new Date('2026-08-04T04:00:00Z');

// ---------------------------------------------------------------------------
// O DEFEITO — evento legado-only (percursos, zero lote)
// ---------------------------------------------------------------------------

describe('evento publicado sem lote e com preço-base legado', () => {
  // A forma EXATA em que `criarEvento` deixa todo evento novo: percursos com
  // preço, subcoleção `lotes` vazia.
  const recemCriado: ModalidadeVitrine[] = [
    { modalidade: '5k', lotes: [], precoLegado: 80 },
    { modalidade: '10k', lotes: [], precoLegado: 120 },
  ];
  const dataEvento = new Date('2026-11-20T09:00:00Z');

  it('vende — a régua anterior devolvia "encerrado" aqui', () => {
    expect(deriveEstadoVenda(recemCriado, dataEvento, AGORA)).toBe('aberto');
  });

  it('anuncia o preço que o servidor cobraria, não null', () => {
    expect(precoVitrine(recemCriado[0]!, AGORA)).toBe(80);
    expect(precoVitrine(recemCriado[1]!, AGORA)).toBe(120);
  });

  it('o diagnóstico do organizador não acusa problema', () => {
    const d = diagnosticoVitrine(recemCriado, dataEvento, AGORA);
    expect(d.vende).toBe(true);
    expect(d.motivo).toBeNull();
    expect(d.modalidadesSemPreco).toEqual([]);
  });

  it('uma modalidade sem preço no meio de outras que vendem aparece na lista', () => {
    const misto: ModalidadeVitrine[] = [
      { modalidade: '5k', lotes: [], precoLegado: 80 },
      { modalidade: '10k', lotes: [] },
    ];
    const d = diagnosticoVitrine(misto, dataEvento, AGORA);
    expect(d.vende).toBe(true);
    expect(d.modalidadesSemPreco).toEqual(['10k']);
  });
});

// ---------------------------------------------------------------------------
// O outro estado — sem preço nenhum (os dois eventos quebrados em produção)
// ---------------------------------------------------------------------------

describe('evento publicado sem lote E sem percursos', () => {
  // noturna-beira-mar-2026 e retiro-bem-estar-rio-vermelho-2026, lidos de
  // produção em 2026-08-04: `percursos` ausente no doc, zero lotes. O servidor
  // também recusa a venda — a vitrine está certa, o silêncio é que não está.
  const semPreco: ModalidadeVitrine[] = [
    { modalidade: '5k', lotes: [] },
    { modalidade: '10k', lotes: [] },
  ];
  const dataEvento = new Date('2026-08-17T00:00:00Z');

  it('continua encerrado — a régua não fabrica preço', () => {
    expect(deriveEstadoVenda(semPreco, dataEvento, AGORA)).toBe('encerrado');
  });

  it('o organizador recebe o motivo e a lista do que falta cadastrar', () => {
    const d = diagnosticoVitrine(semPreco, dataEvento, AGORA);
    expect(d.vende).toBe(false);
    expect(d.motivo).toBe('sem_preco');
    expect(d.modalidadesSemPreco).toEqual(['5k', '10k']);
  });
});

// ---------------------------------------------------------------------------
// REGRESSÃO — quem vende hoje continua vendendo
// ---------------------------------------------------------------------------

describe('regressão sobre os eventos que vendem em produção', () => {
  // Formas reais de `leela-hub` em 2026-08-04. Todos com lotes e SEM percursos:
  // o ramo legado não os alcança, e por construção `precoVigente` devolve
  // exatamente o que `loteAtivo` devolvia antes.
  const dataMeia = new Date('2026-08-05T09:00:00Z');
  const meiaFloripa: ModalidadeVitrine[] = [
    {
      modalidade: '5k',
      lotes: [
        lote({ ordem: 1, inicio: '2026-04-16T03:00:00Z', fim: '2026-06-17T03:00:00Z', preco: 60, limite: 150, vendidos: 150 }),
        lote({ ordem: 2, inicio: '2026-06-17T03:00:00Z', fim: '2026-08-15T03:00:00Z', preco: 75, limite: 200, vendidos: 120 }),
        lote({ ordem: 3, inicio: '2026-08-15T03:00:00Z', fim: '2026-09-10T02:59:00Z', preco: 90, limite: 200, vendidos: 0 }),
      ],
    },
    {
      modalidade: '21k',
      lotes: [
        lote({ ordem: 1, inicio: '2026-04-16T03:00:00Z', fim: '2026-06-17T03:00:00Z', preco: 120, limite: 150, vendidos: 150 }),
        lote({ ordem: 2, inicio: '2026-06-17T03:00:00Z', fim: '2026-08-15T03:00:00Z', preco: 150, limite: 200, vendidos: 120 }),
      ],
    },
  ];

  it('meia-floripa-2026 segue aberta, no preço do lote 2', () => {
    expect(deriveEstadoVenda(meiaFloripa, dataMeia, AGORA)).toBe('aberto');
    expect(precoVitrine(meiaFloripa[0]!, AGORA)).toBe(75);
    expect(precoVitrine(meiaFloripa[1]!, AGORA)).toBe(150);
  });

  const desafioMtb: ModalidadeVitrine[] = [
    {
      modalidade: 'MTB 45km',
      lotes: [
        lote({ ordem: 1, inicio: '2026-04-16T03:00:00Z', fim: '2026-06-17T03:00:00Z', preco: 90, limite: 100, vendidos: 100 }),
        lote({ ordem: 2, inicio: '2026-06-17T03:00:00Z', fim: '2026-08-15T03:00:00Z', preco: 113, limite: 150, vendidos: 60 }),
        lote({ ordem: 3, inicio: '2026-08-15T03:00:00Z', fim: '2026-09-10T02:59:00Z', preco: 135, limite: 150, vendidos: 0 }),
      ],
    },
  ];

  it('desafio-mtb-costa-lagoa-2026 segue aberto, no preço do lote 2', () => {
    expect(deriveEstadoVenda(desafioMtb, new Date('2026-09-07T00:00:00Z'), AGORA)).toBe('aberto');
    expect(precoVitrine(desafioMtb[0]!, AGORA)).toBe(113);
  });

  // O único evento de produção que tem os DOIS modelos ao mesmo tempo: um lote
  // ativo E um percurso legado de R$ 10. O lote tem precedência (ADR-012) — se
  // esta asserção virar 10, a correção inverteu a ordem dos modelos.
  const testeTaxa: ModalidadeVitrine[] = [
    {
      modalidade: 'Inscrição de teste',
      precoLegado: 10,
      lotes: [
        lote({ ordem: 1, inicio: '2026-08-01T03:00:00Z', fim: '2026-12-19T02:59:00Z', preco: 10, limite: 100, vendidos: 0 }),
      ],
    },
  ];

  it('teste-taxa-repassada segue aberto e o LOTE tem precedência sobre o legado', () => {
    expect(deriveEstadoVenda(testeTaxa, new Date('2026-12-20T03:00:00Z'), AGORA)).toBe('aberto');
    const comLoteMaisCaro: ModalidadeVitrine = {
      ...testeTaxa[0]!,
      lotes: [
        lote({ ordem: 1, inicio: '2026-08-01T03:00:00Z', fim: '2026-12-19T02:59:00Z', preco: 42, limite: 100, vendidos: 0 }),
      ],
    };
    expect(precoVitrine(comLoteMaisCaro, AGORA)).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// A fronteira que NÃO pode mover: legado nunca reabre venda fechada
// ---------------------------------------------------------------------------

describe('o preço legado não reabre uma venda que os lotes fecharam (RN-300/S300 #1)', () => {
  const dataEvento = new Date('2026-11-20T09:00:00Z');

  it('lotes todos esgotados + preço legado ⇒ esgotado, não aberto', () => {
    const esgotado: ModalidadeVitrine[] = [
      {
        modalidade: '5k',
        precoLegado: 80,
        lotes: [
          lote({ ordem: 1, inicio: '2026-07-01T03:00:00Z', fim: '2026-09-01T03:00:00Z', preco: 60, limite: 100, vendidos: 100 }),
        ],
      },
    ];
    expect(deriveEstadoVenda(esgotado, dataEvento, AGORA)).toBe('esgotado');
    expect(precoVitrine(esgotado[0]!, AGORA)).toBeNull();
    expect(diagnosticoVitrine(esgotado, dataEvento, AGORA).motivo).toBe('esgotado');
  });

  it('janelas de lote vencidas + preço legado ⇒ encerrado, com motivo próprio', () => {
    const vencido: ModalidadeVitrine[] = [
      {
        modalidade: '5k',
        precoLegado: 80,
        lotes: [
          lote({ ordem: 1, inicio: '2026-04-01T03:00:00Z', fim: '2026-06-01T03:00:00Z', preco: 60, limite: 100, vendidos: 10 }),
        ],
      },
    ];
    expect(deriveEstadoVenda(vencido, dataEvento, AGORA)).toBe('encerrado');
    const d = diagnosticoVitrine(vencido, dataEvento, AGORA);
    expect(d.motivo).toBe('lotes_encerrados');
    expect(d.modalidadesSemPreco).toEqual([]);
  });

  it('prova já realizada ⇒ encerrado, e o motivo diz que o evento passou', () => {
    const passado: ModalidadeVitrine[] = [{ modalidade: '5k', lotes: [], precoLegado: 80 }];
    const d = diagnosticoVitrine(passado, new Date('2026-07-01T09:00:00Z'), AGORA);
    expect(d.estado).toBe('encerrado');
    expect(d.motivo).toBe('evento_passou');
  });
});
