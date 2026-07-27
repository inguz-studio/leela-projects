/**
 * repasseCore.test.ts — LEELA-E09s-L1-T3
 *
 * Unit PURO (sem I/O, sem Emulator) do núcleo do repasse (E09-slim):
 *   1. computeRetido (RN-350) — % sobre o líquido; encerrado ⇒ 0
 *   2. computeLiquidoProdutor (RN-347) — modo incorporada|repassada como
 *      parâmetro explícito; incorporada REUSA computeReceitaLiquida (RN-406)
 *   3. computeSaldoRepasse (RN-351) — liberado/comprometido/disponível,
 *      NUNCA negativo; arredondamento a centavo (roundMoney); recusa e
 *      cancelamento NÃO comprometem; decisão #7 (sem termo ⇒ bloqueia)
 *   4. validarSolicitacao (RN-352) — 0 < valor ≤ disponível, cent-exato;
 *      ATAQUE de corrida: 2ª solicitação após recompute falha
 *   5. transitionRepasse (RN-353 + decisão #11) — matriz fechada + ator
 *   6. formatarNumeroComprovante (RN-355) — gapless, determinístico
 *   7. janela D+N em dias úteis (RN-348) — seg–sex no fuso do produto
 */

import { describe, expect, it } from 'vitest';
import {
  ATOR_DO_EVENTO_REPASSE,
  COMPROVANTE_PREFIXO,
  comprometeSaldo,
  computeDentroJanelaDN,
  computeDisponivelDoEvento,
  computeDisponivelPorEvento,
  computeLiberadoPorEvento,
  computeLiquidoProdutor,
  computeReceitaLiquida,
  computeRetido,
  computeSaldoRepasse,
  DISPONIBILIZACAO_DIAS_UTEIS_DEFAULT,
  diasUteisDecorridos,
  ESTADOS_REPASSE,
  ESTADOS_REPASSE_COMPROMETIDOS,
  formatarNumeroComprovante,
  isDiaUtil,
  isEstadoRepasse,
  MODO_TAXA_DEFAULT,
  podeTransicionarRepasse,
  RETENCAO_REPASSE_PCT_DEFAULT,
  TRANSICOES_REPASSE,
  transacaoDentroJanelaDN,
  transitionRepasse,
  validarSolicitacao,
  type EstadoRepasse,
  type EventoSaldoInput,
  type RepasseSaldoInput,
} from '@leela/core';

// Datas-âncora (2026-07: 12=dom, 13=seg, 17=sex, 18=sáb, 20=seg, 21=ter)
const SEG_13 = new Date('2026-07-13T15:00:00Z'); // 12:00 BRT segunda
const QUA_15 = new Date('2026-07-15T15:00:00Z');
const SEX_17 = new Date('2026-07-17T15:00:00Z');
const SAB_18 = new Date('2026-07-18T15:00:00Z');
const SEG_20 = new Date('2026-07-20T15:00:00Z');
const TER_21 = new Date('2026-07-21T15:00:00Z');

function evento(over: Partial<EventoSaldoInput> = {}): EventoSaldoInput {
  return {
    eventoId: 'meia-floripa-2026',
    receitaBruta: 11173.18,
    receitaLiquida: 10000,
    encerrado: false,
    ...over,
  };
}

// ── 1. computeRetido (RN-350) ──────────────────────────────────────────────
describe('computeRetido — RN-350', () => {
  it('evento NÃO encerrado retém liquido × pct/100 (aceite: 10000 @ 15 → 1500)', () => {
    expect(computeRetido(10000, 15, false)).toBe(1500);
  });

  it('evento encerrado ⇒ retido 0 (liberação total)', () => {
    expect(computeRetido(10000, 15, true)).toBe(0);
    expect(computeRetido(0.01, 100, true)).toBe(0);
  });

  it('arredonda a centavo half-up (reusa roundMoney)', () => {
    // 33.33 × 15% = 4.9995 → 5.00
    expect(computeRetido(33.33, 15, false)).toBe(5);
    // 10.03 × 15% = 1.5045 → 1.5
    expect(computeRetido(10.03, 15, false)).toBe(1.5);
  });

  it('pct 0 e pct 100 são válidos (bordas do range)', () => {
    expect(computeRetido(500, 0, false)).toBe(0);
    expect(computeRetido(500, 100, false)).toBe(500);
  });

  it('rejeita liquido/pct fora do domínio (fail-fast)', () => {
    expect(() => computeRetido(-1, 15, false)).toThrow(RangeError);
    expect(() => computeRetido(NaN, 15, false)).toThrow(RangeError);
    expect(() => computeRetido(Infinity, 15, false)).toThrow(RangeError);
    expect(() => computeRetido(100, -0.1, false)).toThrow(RangeError);
    expect(() => computeRetido(100, 100.1, false)).toThrow(RangeError);
    expect(() => computeRetido(100, NaN, false)).toThrow(RangeError);
  });

  it('invariante de centavo: liberado + retido == líquido (sempre)', () => {
    for (const liquido of [10000, 33.33, 0.01, 8950, 111.73]) {
      const retido = computeRetido(liquido, 15, false);
      const liberado = computeLiberadoPorEvento(liquido, 15, false);
      expect(liberado + retido).toBeCloseTo(liquido, 10);
    }
    expect(computeLiberadoPorEvento(10000, 15, true)).toBe(10000); // encerrado
  });
});

// ── 2. computeLiquidoProdutor (RN-347) ─────────────────────────────────────
describe('computeLiquidoProdutor — RN-347 (modo como parâmetro explícito)', () => {
  it("modo 'incorporada' = face − taxa, IDÊNTICO a computeReceitaLiquida (RN-406)", () => {
    expect(computeLiquidoProdutor(10000, 10.5, 'incorporada')).toBe(
      computeReceitaLiquida(10000, 10.5)
    );
    expect(computeLiquidoProdutor(10000, 10.5, 'incorporada')).toBe(8950);
  });

  it("modo 'repassada' = valor de face (taxa cobrada por fora do comprador)", () => {
    expect(computeLiquidoProdutor(10000, 10.5, 'repassada')).toBe(10000);
  });

  it("default é 'incorporada' (comportamento vigente até o toggle E04)", () => {
    expect(MODO_TAXA_DEFAULT).toBe('incorporada');
    expect(computeLiquidoProdutor(10000, 10.5)).toBe(8950);
  });

  it('valida taxa do termo nos DOIS modos (termo lixo falha cedo)', () => {
    expect(() => computeLiquidoProdutor(100, 101, 'repassada')).toThrow(RangeError);
    expect(() => computeLiquidoProdutor(100, -1, 'incorporada')).toThrow(RangeError);
    expect(() => computeLiquidoProdutor(-5, 10, 'repassada')).toThrow(RangeError);
  });
});

// ── 3. computeSaldoRepasse (RN-351) ────────────────────────────────────────
// ── 2b. computeDisponivelDoEvento (RN-367/368 · DEC-0727C) ─────────────────
//
// A review CAIXADISP-REV (vetor 5) registrou como dívida que
// `computeDisponivelPorEvento` só era exercitada pelo consumidor (painel). A
// função nova nasce coberta AQUI, na suíte que cobre o core — e a asserção que
// importa é a CONVERGÊNCIA com `computeSaldoRepasse`: se as duas divergirem, a
// Caixa volta a prometer um número que o saque recusa.
describe('computeDisponivelDoEvento — RN-367 (a base única do disponível)', () => {
  /** Mock canônico do repo: bruto 12.000 · líquido 10.000 · retenção 15%. */
  const LIQUIDO = 10000;

  it('em andamento retém; encerrado libera o líquido inteiro (RN-350)', () => {
    expect(
      computeDisponivelDoEvento({
        receitaLiquida: LIQUIDO,
        encerrado: false,
        repassadoVivo: 0,
      }),
    ).toEqual({ liberado: 8500, disponivel: 8500, absorvido: 0, semTermo: false });

    expect(
      computeDisponivelDoEvento({ receitaLiquida: LIQUIDO, encerrado: true, repassadoVivo: 0 })
        .disponivel,
    ).toBe(10000);
  });

  it('CONVERGE com o saldo autoritativo do tenant de um evento só', () => {
    for (const repassadoVivo of [0, 500, 3200.35, 8500]) {
      const doEvento = computeDisponivelDoEvento({
        receitaLiquida: LIQUIDO,
        encerrado: false,
        repassadoVivo,
      });
      const doTenant = computeSaldoRepasse({
        eventos: [evento({ receitaLiquida: LIQUIDO })],
        repasses: repassadoVivo > 0 ? [{ valor: repassadoVivo, estado: 'solicitado' }] : [],
      });
      expect(doEvento.disponivel).toBe(doTenant.disponivel);
    }
  });

  it('a base BRUTA, que a Caixa usava, divergia — e a divergência era fechada', () => {
    // 15% do bruto (12.000) contra 15% do líquido (10.000): 10.200 × 8.500.
    // Esta é a conta que a DEC-0727C matou; o teste existe para que voltar a
    // ela seja um vermelho, não uma regressão silenciosa.
    const baseBruta = 12000 * 0.85;
    expect(baseBruta).toBe(10200);
    expect(
      computeDisponivelDoEvento({ receitaLiquida: LIQUIDO, encerrado: false, repassadoVivo: 0 })
        .disponivel,
    ).toBe(8500);
    expect(baseBruta - 8500).toBe(1700); // 0,85 × taxa da plataforma
  });

  it('abate o repasse vivo e trava em 0 — nunca negativo (RN-351)', () => {
    expect(
      computeDisponivelDoEvento({
        receitaLiquida: LIQUIDO,
        encerrado: false,
        repassadoVivo: 500,
      }).disponivel,
    ).toBe(8000);
    const estourado = computeDisponivelDoEvento({
      receitaLiquida: LIQUIDO,
      encerrado: false,
      repassadoVivo: 9000,
    });
    expect(estourado.disponivel).toBe(0);
    // `absorvido` é o que o clamp de fato descontou — a nota da Caixa não pode
    // afirmar 9.000 (review CAIXADISP-REV, R-2).
    expect(estourado.absorvido).toBe(8500);
  });

  it('é a composição EXATA dos dois helpers que já existiam (nenhuma conta nova)', () => {
    for (const [liquido, pct, encerrado, vivo] of [
      [10000, 15, false, 500],
      [76627.21, 15, false, 3200.35],
      [10000, 0, false, 0],
      [10000, 100, false, 0],
      [9999.99, 7.5, true, 1],
    ] as const) {
      const liberado = computeLiberadoPorEvento(liquido, pct, encerrado);
      expect(
        computeDisponivelDoEvento({
          receitaLiquida: liquido,
          encerrado,
          retencaoPct: pct,
          repassadoVivo: vivo,
        }),
      ).toEqual({
        liberado,
        disponivel: computeDisponivelPorEvento(liberado, vivo),
        absorvido: Math.min(vivo, liberado),
        semTermo: false,
      });
    }
  });

  it('sem termo: null nos dois valores — indeterminado, nunca zero (decisão #7)', () => {
    expect(
      computeDisponivelDoEvento({ receitaLiquida: null, encerrado: false, repassadoVivo: 500 }),
    ).toEqual({ liberado: null, disponivel: null, absorvido: 0, semTermo: true });
  });

  it('% ausente cai no default 15 do core (RN-350)', () => {
    expect(
      computeDisponivelDoEvento({ receitaLiquida: LIQUIDO, encerrado: false, repassadoVivo: 0 }),
    ).toEqual(
      computeDisponivelDoEvento({
        receitaLiquida: LIQUIDO,
        encerrado: false,
        retencaoPct: RETENCAO_REPASSE_PCT_DEFAULT,
        repassadoVivo: 0,
      }),
    );
  });

  it('entrada inválida LANÇA — dinheiro falha cedo, não devolve número torto', () => {
    expect(() =>
      computeDisponivelDoEvento({ receitaLiquida: 100, encerrado: false, repassadoVivo: -1 }),
    ).toThrow(RangeError);
    expect(() =>
      computeDisponivelDoEvento({
        receitaLiquida: 100,
        encerrado: false,
        repassadoVivo: Number.NaN,
      }),
    ).toThrow(RangeError);
    expect(() =>
      computeDisponivelDoEvento({ receitaLiquida: -1, encerrado: false, repassadoVivo: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      computeDisponivelDoEvento({
        receitaLiquida: 100,
        encerrado: false,
        retencaoPct: 101,
        repassadoVivo: 0,
      }),
    ).toThrow(RangeError);
  });
});

describe('computeSaldoRepasse — RN-351', () => {
  it('aceite L2-T1 antecipado: líquido 10000 não encerrado @ 15% ⇒ retido 1500, disponível 8500', () => {
    const saldo = computeSaldoRepasse({ eventos: [evento()], repasses: [] });
    expect(saldo.retido).toBe(1500);
    expect(saldo.disponivel).toBe(8500);
    expect(saldo.vendidoBruto).toBe(11173.18);
    expect(saldo.comprometido).toBe(0);
  });

  it('default de retenção é 15 (RETENCAO_REPASSE_PCT_DEFAULT)', () => {
    expect(RETENCAO_REPASSE_PCT_DEFAULT).toBe(15);
    const a = computeSaldoRepasse({ eventos: [evento()], repasses: [] });
    const b = computeSaldoRepasse({ eventos: [evento()], repasses: [], retencaoPct: 15 });
    expect(a).toEqual(b);
  });

  it('encerrar o evento leva retido → 0 e disponível → líquido − comprometido', () => {
    const repasses: RepasseSaldoInput[] = [{ valor: 3000, estado: 'solicitado' }];
    const saldo = computeSaldoRepasse({
      eventos: [evento({ encerrado: true })],
      repasses,
    });
    expect(saldo.retido).toBe(0);
    expect(saldo.disponivel).toBe(7000);
    expect(saldo.comprometido).toBe(3000);
  });

  it('comprometido soma SÓ {solicitado, aprovado, pago} — recusa/cancelamento devolvem (RN-353)', () => {
    const repasses: RepasseSaldoInput[] = [
      { valor: 1000, estado: 'solicitado' },
      { valor: 2000, estado: 'aprovado' },
      { valor: 3000, estado: 'pago' },
      { valor: 4000, estado: 'recusado' },
      { valor: 5000, estado: 'cancelado' },
    ];
    const saldo = computeSaldoRepasse({ eventos: [evento()], repasses });
    expect(saldo.comprometido).toBe(6000);
    expect(saldo.disponivel).toBe(2500); // 8500 − 6000
    expect(ESTADOS_REPASSE_COMPROMETIDOS).toEqual(['solicitado', 'aprovado', 'pago']);
    expect(comprometeSaldo('recusado')).toBe(false);
    expect(comprometeSaldo('cancelado')).toBe(false);
  });

  it('disponível = 0 quando TUDO está comprometido (aceite do brief)', () => {
    const saldo = computeSaldoRepasse({
      eventos: [evento()],
      repasses: [{ valor: 8500, estado: 'aprovado' }],
    });
    expect(saldo.disponivel).toBe(0);
  });

  it('ATAQUE RN-351: comprometido acima do liberado NUNCA produz disponível negativo', () => {
    // Corrida de solicitações que passou no passado / retenção que subiu:
    const saldo = computeSaldoRepasse({
      eventos: [evento()],
      repasses: [
        { valor: 8000, estado: 'solicitado' },
        { valor: 8000, estado: 'solicitado' },
      ],
    });
    expect(saldo.comprometido).toBe(16000);
    expect(saldo.disponivel).toBe(0); // clamp — nunca < 0
    expect(saldo.disponivel).toBeGreaterThanOrEqual(0);
  });

  it('arredondamento a centavo em cascata (roundMoney em cada parcela)', () => {
    // 3 eventos com líquidos de 3 casas "sujas" pós-taxa não acontecem na
    // fonte (financeiro/current já é roundMoney), mas o core não confia:
    const saldo = computeSaldoRepasse({
      eventos: [
        evento({ eventoId: 'a', receitaLiquida: 33.33, receitaBruta: 37.24 }),
        evento({ eventoId: 'b', receitaLiquida: 33.33, receitaBruta: 37.24 }),
        evento({ eventoId: 'c', receitaLiquida: 33.34, receitaBruta: 37.25 }),
      ],
      repasses: [],
    });
    // retido por evento: 5.00 + 5.00 + 5.00(=5.001→5) ⇒ 15.00
    expect(saldo.retido).toBe(15);
    expect(saldo.disponivel).toBe(85);
    expect(saldo.vendidoBruto).toBe(111.73);
  });

  it('decisão #7: receitaLiquida null (sem termo) conta no bruto, NÃO libera nada', () => {
    const saldo = computeSaldoRepasse({
      eventos: [evento({ receitaLiquida: null })],
      repasses: [],
    });
    expect(saldo.vendidoBruto).toBe(11173.18);
    expect(saldo.retido).toBe(0);
    expect(saldo.disponivel).toBe(0);
    expect(saldo.eventosSemTermo).toBe(1);
  });

  it('RN-348: dentroJanelaDN abate o disponível (e nunca o deixa negativo)', () => {
    const comJanela = computeSaldoRepasse({
      eventos: [evento()],
      repasses: [],
      dentroJanelaDN: 2000,
    });
    expect(comJanela.disponivel).toBe(6500);
    expect(comJanela.dentroJanelaDN).toBe(2000);

    const janelaMaiorQueTudo = computeSaldoRepasse({
      eventos: [evento()],
      repasses: [],
      dentroJanelaDN: 99999,
    });
    expect(janelaMaiorQueTudo.disponivel).toBe(0);
  });

  it('recompute é determinístico/idempotente (mesmo input ⇒ mesmo saldo)', () => {
    const params = {
      eventos: [evento(), evento({ eventoId: 'x', encerrado: true })],
      repasses: [{ valor: 100.55, estado: 'pago' as EstadoRepasse }],
      retencaoPct: 20,
    };
    expect(computeSaldoRepasse(params)).toEqual(computeSaldoRepasse(params));
  });

  it('fail-fast em input inválido (retencaoPct, janela, valores)', () => {
    expect(() =>
      computeSaldoRepasse({ eventos: [], repasses: [], retencaoPct: 101 })
    ).toThrow(RangeError);
    expect(() =>
      computeSaldoRepasse({ eventos: [], repasses: [], dentroJanelaDN: -1 })
    ).toThrow(RangeError);
    expect(() =>
      computeSaldoRepasse({ eventos: [evento({ receitaBruta: NaN })], repasses: [] })
    ).toThrow(RangeError);
    expect(() =>
      computeSaldoRepasse({
        eventos: [],
        repasses: [{ valor: 0, estado: 'solicitado' }],
      })
    ).toThrow(RangeError);
  });
});

// ── 4. validarSolicitacao (RN-352) ─────────────────────────────────────────
describe('validarSolicitacao — RN-352', () => {
  it('aceita 0 < valor ≤ disponível (borda: valor == disponível)', () => {
    expect(validarSolicitacao(0.01, 8500).ok).toBe(true);
    expect(validarSolicitacao(8500, 8500).ok).toBe(true);
  });

  it('rejeita valor ≤ 0', () => {
    expect(validarSolicitacao(0, 8500).ok).toBe(false);
    expect(validarSolicitacao(-10, 8500).ok).toBe(false);
  });

  it('rejeita valor > disponível', () => {
    const r = validarSolicitacao(8500.01, 8500);
    expect(r.ok).toBe(false);
    expect(r.erros.join(' ')).toContain('excede');
  });

  it('rejeita dinheiro sub-centavo e não-finito (espelho de moneyCentExato)', () => {
    expect(validarSolicitacao(10.005, 8500).ok).toBe(false);
    expect(validarSolicitacao(NaN, 8500).ok).toBe(false);
    expect(validarSolicitacao(Infinity, 8500).ok).toBe(false);
  });

  it('rejeita disponível inválido (não valida contra lixo)', () => {
    expect(validarSolicitacao(10, NaN).ok).toBe(false);
    expect(validarSolicitacao(10, -1).ok).toBe(false);
  });

  it('ATAQUE (corrida de solicitações, camada pura): a 2ª releitura falha', () => {
    // Duas solicitações de 5000 sobre disponível 8500. A validação
    // TRANSACIONAL do servidor (L2-T3) relê o saldo após a 1ª criar o
    // repasse comprometido — este teste fixa o comportamento da camada
    // pura em cada releitura (a transação real é aceite do L2).
    const antes = computeSaldoRepasse({ eventos: [evento()], repasses: [] });
    expect(validarSolicitacao(5000, antes.disponivel).ok).toBe(true);

    const depoisDa1a = computeSaldoRepasse({
      eventos: [evento()],
      repasses: [{ valor: 5000, estado: 'solicitado' }],
    });
    expect(depoisDa1a.disponivel).toBe(3500);
    const segunda = validarSolicitacao(5000, depoisDa1a.disponivel);
    expect(segunda.ok).toBe(false); // 2ª NUNCA cria — disponível não negativa
  });
});

// ── 5. transitionRepasse (RN-353 + decisão #11) ────────────────────────────
describe('transitionRepasse — RN-353', () => {
  it('caminho feliz: solicitado→aprovado→pago (admin) e solicitado→recusado', () => {
    expect(transitionRepasse('solicitado', 'aprovar', 'platform_admin')).toEqual({
      ok: true,
      para: 'aprovado',
    });
    expect(transitionRepasse('aprovado', 'pagar', 'platform_admin')).toEqual({
      ok: true,
      para: 'pago',
    });
    expect(transitionRepasse('solicitado', 'recusar', 'platform_admin')).toEqual({
      ok: true,
      para: 'recusado',
    });
  });

  it('decisão #11: owner cancela SÓ enquanto solicitado', () => {
    expect(transitionRepasse('solicitado', 'cancelar', 'tenant_owner')).toEqual({
      ok: true,
      para: 'cancelado',
    });
    expect(transitionRepasse('aprovado', 'cancelar', 'tenant_owner').ok).toBe(false);
    expect(transitionRepasse('pago', 'cancelar', 'tenant_owner').ok).toBe(false);
  });

  it('ATAQUE: solicitado→pago DIRETO (pular aprovação) rejeita', () => {
    const r = transitionRepasse('solicitado', 'pagar', 'platform_admin');
    expect(r.ok).toBe(false);
  });

  it('ATAQUE (escalação): owner não aprova/recusa/paga; admin não cancela', () => {
    expect(transitionRepasse('solicitado', 'aprovar', 'tenant_owner').ok).toBe(false);
    expect(transitionRepasse('solicitado', 'recusar', 'tenant_owner').ok).toBe(false);
    expect(transitionRepasse('aprovado', 'pagar', 'tenant_owner').ok).toBe(false);
    expect(transitionRepasse('solicitado', 'cancelar', 'platform_admin').ok).toBe(false);
    expect(ATOR_DO_EVENTO_REPASSE.cancelar).toBe('tenant_owner');
  });

  it('estados terminais (recusado/pago/cancelado) não saem para lugar nenhum', () => {
    for (const terminal of ['recusado', 'pago', 'cancelado'] as const) {
      expect(TRANSICOES_REPASSE[terminal]).toEqual([]);
      expect(transitionRepasse(terminal, 'aprovar', 'platform_admin').ok).toBe(false);
      expect(transitionRepasse(terminal, 'pagar', 'platform_admin').ok).toBe(false);
      expect(transitionRepasse(terminal, 'cancelar', 'tenant_owner').ok).toBe(false);
    }
  });

  it('matriz fechada: TODAS as células fora da union rejeitam (varredura)', () => {
    const validas = new Set(['solicitado→aprovado', 'solicitado→recusado', 'solicitado→cancelado', 'aprovado→pago']);
    for (const de of ESTADOS_REPASSE) {
      for (const para of ESTADOS_REPASSE) {
        expect(podeTransicionarRepasse(de, para)).toBe(validas.has(`${de}→${para}`));
      }
    }
  });

  it('union fechada EstadoRepasse — guard isEstadoRepasse', () => {
    expect(ESTADOS_REPASSE).toHaveLength(5);
    expect(isEstadoRepasse('pago')).toBe(true);
    expect(isEstadoRepasse('estornado')).toBe(false); // estado de OUTRO domínio
    expect(isEstadoRepasse('')).toBe(false);
  });
});

// ── 6. formatarNumeroComprovante (RN-355) ──────────────────────────────────
describe('formatarNumeroComprovante — RN-355', () => {
  it('formato canônico do brief: REP-2026-0007', () => {
    expect(formatarNumeroComprovante('castelo-producoes', 7, 2026)).toBe('REP-2026-0007');
    expect(COMPROVANTE_PREFIXO).toBe('REP');
  });

  it('gapless: seq vizinhos formatam vizinhos (…0007 e …0008, sem buraco)', () => {
    expect(formatarNumeroComprovante('castelo-producoes', 8, 2026)).toBe('REP-2026-0008');
  });

  it('determinístico: mesmos args ⇒ mesmo número, sempre', () => {
    const a = formatarNumeroComprovante('castelo-producoes', 42, 2026);
    const b = formatarNumeroComprovante('castelo-producoes', 42, 2026);
    expect(a).toBe(b);
  });

  it('acima de 9999 NÃO trunca (colisão proibida)', () => {
    expect(formatarNumeroComprovante('castelo-producoes', 10000, 2026)).toBe('REP-2026-10000');
  });

  it('fail-fast: seq 0/negativo/fracionário, tenant vazio, ano inválido', () => {
    expect(() => formatarNumeroComprovante('castelo-producoes', 0, 2026)).toThrow(RangeError);
    expect(() => formatarNumeroComprovante('castelo-producoes', -1, 2026)).toThrow(RangeError);
    expect(() => formatarNumeroComprovante('castelo-producoes', 1.5, 2026)).toThrow(RangeError);
    expect(() => formatarNumeroComprovante('', 1, 2026)).toThrow(RangeError);
    expect(() => formatarNumeroComprovante('  ', 1, 2026)).toThrow(RangeError);
    expect(() => formatarNumeroComprovante('castelo-producoes', 1, 99)).toThrow(RangeError);
  });
});

// ── 7. Janela D+N em dias úteis (RN-348) ───────────────────────────────────
describe('janela D+N — RN-348 (dias úteis, fuso do produto)', () => {
  it('isDiaUtil: seg–sex true; sáb/dom false (no fuso do produto)', () => {
    expect(isDiaUtil(SEG_13)).toBe(true);
    expect(isDiaUtil(SEX_17)).toBe(true);
    expect(isDiaUtil(SAB_18)).toBe(false);
    expect(isDiaUtil(new Date('2026-07-12T15:00:00Z'))).toBe(false); // domingo
  });

  it('diasUteisDecorridos: seg→qua = 2; sex→seg = 1; mesmo dia = 0', () => {
    expect(diasUteisDecorridos(SEG_13, QUA_15)).toBe(2);
    expect(diasUteisDecorridos(SEX_17, SEG_20)).toBe(1);
    expect(diasUteisDecorridos(SEG_13, SEG_13)).toBe(0);
  });

  it('fim de semana não conta: sáb→seg = 1; sáb→ter = 2', () => {
    expect(diasUteisDecorridos(SAB_18, SEG_20)).toBe(1);
    expect(diasUteisDecorridos(SAB_18, TER_21)).toBe(2);
  });

  it('D+2 default: confirmada sex libera na TERÇA (seg=1 dentro, ter=2 fora)', () => {
    expect(DISPONIBILIZACAO_DIAS_UTEIS_DEFAULT).toBe(2);
    expect(transacaoDentroJanelaDN(SEX_17, SEG_20)).toBe(true);  // ainda retida
    expect(transacaoDentroJanelaDN(SEX_17, TER_21)).toBe(false); // liberou
  });

  it('D+0 libera imediato; N negativo/fracionário rejeita', () => {
    expect(transacaoDentroJanelaDN(SEG_13, SEG_13, 0)).toBe(false);
    expect(() => transacaoDentroJanelaDN(SEG_13, SEG_13, -1)).toThrow(RangeError);
    expect(() => transacaoDentroJanelaDN(SEG_13, SEG_13, 1.5)).toThrow(RangeError);
  });

  it('borda de fuso: 02:00Z de 14/jul é 23:00 BRT de 13/jul (dia civil = seg)', () => {
    const noiteDeSegundaBRT = new Date('2026-07-14T02:00:00Z');
    expect(isDiaUtil(noiteDeSegundaBRT)).toBe(true); // seg no BRT (ter em UTC)
    expect(diasUteisDecorridos(noiteDeSegundaBRT, QUA_15)).toBe(2); // ter+qua
  });

  it('computeDentroJanelaDN soma SÓ transações dentro da janela (a centavo)', () => {
    const total = computeDentroJanelaDN(
      [
        { valorLiquido: 100.1, confirmadaEm: SEG_20 },  // 1 útil decorrido < 2 ⇒ dentro
        { valorLiquido: 200.25, confirmadaEm: SEX_17 }, // 2 úteis ⇒ FORA
        { valorLiquido: 50.05, confirmadaEm: TER_21 },  // 0 útil ⇒ dentro
      ],
      TER_21
    );
    expect(total).toBe(150.15);
  });

  it('computeDentroJanelaDN: lista vazia = 0; valor inválido rejeita', () => {
    expect(computeDentroJanelaDN([], TER_21)).toBe(0);
    expect(() =>
      computeDentroJanelaDN([{ valorLiquido: NaN, confirmadaEm: SEG_20 }], TER_21)
    ).toThrow(RangeError);
  });
});
