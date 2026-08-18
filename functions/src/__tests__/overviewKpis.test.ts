/**
 * overviewKpis.test.ts — LEELA-S600-T2
 *
 * Unit (puro, sem Emulator): derivação dos KPIs consolidados do dashboard
 * do profissional em @leela/core (overview/kpis.ts).
 *
 * Cobre o aceite do brief E02-L1:
 *   - ∑qtdInscritos = 1.284 e ∑receitaConfirmada = 142.280 → totais exatos
 *     + vagasRestantes = 47;
 *   - evento com ocupação ≥ limiar → eventoEmRisco = "Meia Maratona Floripa";
 *   - taxaConversaoPct sem dado de visita → null (não inventa);
 *   - limiar de "Esgotando" é fonte única (LIMIAR_ESGOTANDO) e inclusivo (≥).
 */
import { describe, expect, it } from 'vitest';
import {
  LIMIAR_ESGOTANDO,
  derivarKpis,
  derivarTaxaConversao,
  derivarTrendPct,
  emEsgotamento,
  isStatusPagante,
  ocupacaoDoEvento,
  STATUS_PAGANTE,
  vagasRestantesDoEvento,
  type EventoKpiInput,
} from '@leela/core';

// ── Fixtures canônicas (aceite do brief: 1.284 / 142.280 / 47) ─────────────
// 453 + 519 + 312 = 1.284 · 85.617 + 40.000 + 16.663 = 142.280
// Só a Meia Maratona é pública COM capacidade → vagasRestantes = 500-453 = 47
// e ocupação 90,6% ≥ 90% → evento em risco.
const MEIA: EventoKpiInput = {
  nome: 'Meia Maratona Floripa',
  slug: 'meia-floripa-2026',
  status: 'publicado',
  qtdInscritos: 453,
  pagantes: 453,
  receitaConfirmada: 85617,
  capacidade: 500,
  // S825-T1: as três séries somam EXATAMENTE os canônicos do aceite
  // (R$ 142.280 e 1.284 vendas). A rosca do organizador fecha com a régua de
  // receita da MESMA tela — desvio de um centavo reprova aqui, que é o único
  // lugar onde ele ainda é barato de consertar.
  formasPagamento: [
    { forma: 'cartao_credito', vendas: 153, valor: 35617 },
    { forma: 'pix', vendas: 300, valor: 50000 },
  ],
};
const SERRA: EventoKpiInput = {
  nome: 'Desafio Serra do Mar',
  slug: 'desafio-serra-do-mar',
  status: 'publicado',
  qtdInscritos: 519,
  pagantes: 519,
  receitaConfirmada: 40000,
  capacidade: null, // capacidade desconhecida — fora de vagas/risco
  formasPagamento: [
    { forma: 'cartao_credito', vendas: 319, valor: 15000 },
    { forma: 'pix', vendas: 200, valor: 25000 },
  ],
};
const RETIRO: EventoKpiInput = {
  nome: 'Retiro Bem-Estar',
  slug: 'retiro-bem-estar',
  status: 'rascunho',
  qtdInscritos: 312,
  pagantes: 312,
  receitaConfirmada: 16663,
  capacidade: 400, // rascunho não vende vaga — fora de vagas/risco
  formasPagamento: [
    { forma: 'cartao_credito', vendas: 212, valor: 6663 },
    { forma: 'pix', vendas: 100, valor: 10000 },
  ],
};
const EVENTOS = [MEIA, SERRA, RETIRO];

const CLUBES = [
  { qtdMembrosAtivos: 128, qtdDesafiosAtivos: 3 },
  { qtdMembrosAtivos: 72, qtdDesafiosAtivos: 1 },
];

describe('overview/kpis — derivarKpis (S600-T2)', () => {
  it('aceite: totais 1.284 / 142.280 e vagasRestantes 47', () => {
    const kpis = derivarKpis(EVENTOS, CLUBES);
    expect(kpis.inscricoesTotais).toBe(1284);
    expect(kpis.receitaConfirmada).toBe(142280);
    expect(kpis.vagasRestantes).toBe(47);
  });

  it('aceite: ocupação ≥ limiar → eventoEmRisco aponta a Meia Maratona Floripa', () => {
    const kpis = derivarKpis(EVENTOS, CLUBES);
    expect(kpis.eventoEmRisco).toEqual({
      nome: 'Meia Maratona Floripa',
      slug: 'meia-floripa-2026',
    });
  });

  it('aceite: taxaConversaoPct sem dado de visita → null (não inventa)', () => {
    const kpis = derivarKpis(EVENTOS, CLUBES);
    expect(kpis.taxaConversaoPct).toBeNull();
    expect(kpis.conversaoSparkline).toEqual([]);
  });

  it('consolida ∑ de clubes (E05): membros e desafios ativos', () => {
    const kpis = derivarKpis(EVENTOS, CLUBES);
    expect(kpis.membrosAtivosTotais).toBe(200);
    expect(kpis.desafiosAtivosTotais).toBe(4);
  });

  it('sem eventos nem clubes → zeros e nulls (estado vazio honesto)', () => {
    const kpis = derivarKpis([], []);
    expect(kpis).toEqual({
      inscricoesTotais: 0,
      inscricoesTrendPct: null,
      receitaConfirmada: 0,
      receitaTrendPct: null,
      vagasRestantes: 0,
      eventoEmRisco: null,
      taxaConversaoPct: null,
      conversaoSparkline: [],
      membrosAtivosTotais: 0,
      desafiosAtivosTotais: 0,
      formasPagamento: [
        { forma: 'cartao_credito', vendas: 0, valor: 0 },
        { forma: 'pix', vendas: 0, valor: 0 },
      ],
    });
  });

  it('abaixo do limiar → eventoEmRisco null', () => {
    const kpis = derivarKpis(
      [{ ...MEIA, qtdInscritos: 449 }], // 89,8% < 90%
      []
    );
    expect(kpis.eventoEmRisco).toBeNull();
  });

  it('limiar é INCLUSIVO: ocupação exatamente 90% já está em risco', () => {
    const kpis = derivarKpis([{ ...MEIA, qtdInscritos: 450 }], []); // 450/500 = 0.9
    expect(kpis.eventoEmRisco).toEqual({
      nome: MEIA.nome,
      slug: MEIA.slug,
    });
  });

  it('empate de risco: maior ocupação vence', () => {
    const outro: EventoKpiInput = {
      nome: 'Noturna 10k',
      slug: 'noturna-10k',
      status: 'publicado',
      qtdInscritos: 99,
      pagantes: 99,
      receitaConfirmada: 0,
      capacidade: 100, // 99% > 90,6% da Meia
      formasPagamento: null,
    };
    const kpis = derivarKpis([MEIA, outro], []);
    expect(kpis.eventoEmRisco?.slug).toBe('noturna-10k');
  });

  it('overbooking: vagas clampadas em 0, ocupação > 100% ainda é risco', () => {
    const lotado: EventoKpiInput = {
      nome: 'Lotado',
      slug: 'lotado',
      status: 'ao_vivo',
      qtdInscritos: 110,
      pagantes: 110,
      receitaConfirmada: 0,
      capacidade: 100,
      formasPagamento: null,
    };
    const kpis = derivarKpis([lotado], []);
    expect(kpis.vagasRestantes).toBe(0);
    expect(kpis.eventoEmRisco?.slug).toBe('lotado');
  });

  it('evento encerrado fica fora de vagas/risco mas soma nos totais', () => {
    const kpis = derivarKpis([{ ...MEIA, status: 'encerrado' }], []);
    expect(kpis.inscricoesTotais).toBe(453);
    expect(kpis.vagasRestantes).toBe(0);
    expect(kpis.eventoEmRisco).toBeNull();
  });

  it('trend de inscrições vem da janela quando fornecida', () => {
    const kpis = derivarKpis(EVENTOS, [], { atual: 120, anterior: 100 });
    expect(kpis.inscricoesTrendPct).toBe(20);
  });

  it('trend sem base de comparação (anterior = 0) → null, nunca 0 falso', () => {
    const kpis = derivarKpis(EVENTOS, [], { atual: 12, anterior: 0 });
    expect(kpis.inscricoesTrendPct).toBeNull();
  });

  it('receitaTrendPct é null na Onda 1 (inscrito não carrega valor)', () => {
    const kpis = derivarKpis(EVENTOS, [], { atual: 120, anterior: 100 });
    expect(kpis.receitaTrendPct).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// D-1008-R19 — o funil fecha em PAGANTE (lane METRICAS-PAGANTES-BACKEND)
//
// Falsificação da correção: com o input antigo (`inscricoesTotais` no lugar
// de `pagantesTotais`) TODOS os casos deste bloco cospem o número inflado
// anotado em cada `it` — é o que prova que a conta mudou de verdade, e não
// só o nome do parâmetro.
// ---------------------------------------------------------------------------

describe('overview/kpis — D-1008-R19 · conversão conta cliente PAGANTE', () => {
  /** 400 pagaram; 300 boletos emitidos e parados; 100 desistiram. */
  const COM_PENDENTES: EventoKpiInput = {
    nome: 'Trail dos Cânions',
    slug: 'trail-canions',
    status: 'publicado',
    qtdInscritos: 800,
    pagantes: 400,
    receitaConfirmada: 100000,
    capacidade: 1000,
    formasPagamento: null,
  };

  it('conversão = pagantes ÷ visitas — emissão pendente NÃO converte (antes: 40%)', () => {
    // 400 pagantes / 2.000 visitas = 20,0%. Pelo denominador antigo
    // (800 inscritos) o card diria 40,0% — o dobro da verdade.
    const kpis = derivarKpis([COM_PENDENTES], [], null, 2000);
    expect(kpis.taxaConversaoPct).toBe(20);
  });

  it('inscrição CANCELADA não vira conversão (antes: 25%)', () => {
    // 100 pagantes de 500 inscritos (400 cancelaram) sobre 2.000 visitas:
    // 5,0% pela régua nova; 25,0% pela antiga.
    const kpis = derivarKpis(
      [{ ...COM_PENDENTES, qtdInscritos: 500, pagantes: 100 }],
      [],
      null,
      2000
    );
    expect(kpis.taxaConversaoPct).toBe(5);
  });

  it('evento SÓ com pendentes → conversão 0%, nunca o total de inscritos (antes: 15%)', () => {
    // Nenhum real entrou: 0 pagantes de 300 emissões sobre 2.000 visitas.
    // A régua antiga cospe 15,0% de conversão num evento que não vendeu nada.
    const kpis = derivarKpis(
      [{ ...COM_PENDENTES, qtdInscritos: 300, pagantes: 0, receitaConfirmada: 0 }],
      [],
      null,
      2000
    );
    expect(kpis.taxaConversaoPct).toBe(0);
  });

  it('soma cross-evento usa SÓ os pagantes de cada evento (antes: 64,2%)', () => {
    // 453 + 519 + 312 = 1.284 inscritos; pagantes 400 + 300 + 0 = 700.
    // 700/2.000 = 35,0%; a régua antiga somaria 1.284 → 64,2%.
    const kpis = derivarKpis(
      [
        { ...MEIA, pagantes: 400 },
        { ...SERRA, pagantes: 300 },
        { ...RETIRO, pagantes: 0 },
      ],
      CLUBES,
      null,
      2000
    );
    expect(kpis.taxaConversaoPct).toBe(35);
    // …e as contagens de gente na lista seguem intactas: o conserto separa
    // os dois números, não substitui um pelo outro.
    expect(kpis.inscricoesTotais).toBe(1284);
  });

  it('sem visitas o resultado segue null ("—"), com ou sem pagante', () => {
    expect(derivarKpis([COM_PENDENTES], []).taxaConversaoPct).toBeNull();
    expect(derivarKpis([COM_PENDENTES], [], null, 0).taxaConversaoPct).toBeNull();
  });

  it('STATUS_PAGANTE é a régua única e hoje exclui estornado (⛔ vetável TICKET-1)', () => {
    // Se o dono reabrir e mandar contar o estornado, ESTA linha muda — e este
    // teste é o que pina a decisão vigente até lá.
    expect([...STATUS_PAGANTE]).toEqual(['confirmado']);
    expect(isStatusPagante('confirmado')).toBe(true);
    expect(isStatusPagante('pendente')).toBe(false);
    expect(isStatusPagante('cancelado')).toBe(false);
    expect(isStatusPagante('estornado')).toBe(false);
  });
});

describe('overview/kpis — derivações unitárias', () => {
  it('ocupacaoDoEvento: null sem capacidade; fração exata com', () => {
    expect(ocupacaoDoEvento({ qtdInscritos: 10, capacidade: null })).toBeNull();
    expect(ocupacaoDoEvento({ qtdInscritos: 10, capacidade: 0 })).toBeNull();
    expect(ocupacaoDoEvento({ qtdInscritos: 45, capacidade: 50 })).toBe(0.9);
  });

  it('vagasRestantesDoEvento: null sem capacidade; clamp em 0', () => {
    expect(vagasRestantesDoEvento({ qtdInscritos: 10, capacidade: null })).toBeNull();
    expect(vagasRestantesDoEvento({ qtdInscritos: 453, capacidade: 500 })).toBe(47);
    expect(vagasRestantesDoEvento({ qtdInscritos: 600, capacidade: 500 })).toBe(0);
  });

  it('emEsgotamento: exige evento público E ocupação ≥ limiar (fonte única)', () => {
    expect(LIMIAR_ESGOTANDO).toBe(0.9);
    expect(
      emEsgotamento({ status: 'publicado', qtdInscritos: 450, capacidade: 500 })
    ).toBe(true);
    expect(
      emEsgotamento({ status: 'rascunho', qtdInscritos: 450, capacidade: 500 })
    ).toBe(false);
    expect(
      emEsgotamento({ status: 'publicado', qtdInscritos: 449, capacidade: 500 })
    ).toBe(false);
    expect(
      emEsgotamento({ status: 'publicado', qtdInscritos: 450, capacidade: null })
    ).toBe(false);
  });

  it('derivarTrendPct: 1 casa decimal, negativo ok, sem base → null', () => {
    expect(derivarTrendPct(120, 100)).toBe(20);
    expect(derivarTrendPct(80, 100)).toBe(-20);
    expect(derivarTrendPct(125, 300)).toBe(-58.3);
    expect(derivarTrendPct(0, 0)).toBeNull();
    expect(derivarTrendPct(10, 0)).toBeNull();
  });

  it('derivarTaxaConversao: null sem visitas; % com 1 casa quando houver', () => {
    expect(derivarTaxaConversao(1284, null)).toBeNull();
    expect(derivarTaxaConversao(1284, 0)).toBeNull();
    expect(derivarTaxaConversao(682, 1000)).toBe(68.2);
  });
});

// ===========================================================================
// S825-T1 · a série por forma de pagamento consolidada (E11 · leva 25)
// ===========================================================================
describe('derivarKpis — série por forma de pagamento (S825-T1)', () => {
  it('consolida os eventos na ordem canônica e fecha com a receita do topo', () => {
    const kpis = derivarKpis(EVENTOS, []);

    // Ordem canônica, sempre — a cor de cada fatia é identidade de dataviz.
    expect(kpis.formasPagamento?.map((f) => f.forma)).toEqual([
      'cartao_credito',
      'pix',
    ]);
    expect(kpis.formasPagamento).toEqual([
      { forma: 'cartao_credito', vendas: 684, valor: 57280 },
      { forma: 'pix', vendas: 600, valor: 85000 },
    ]);

    // A falsificação que importa: a rosca e o KPI de receita da MESMA tela
    // não podem discordar. 57.280 + 85.000 = 142.280 = receitaConfirmada.
    const somaDaRosca = (kpis.formasPagamento ?? []).reduce(
      (s, f) => s + f.valor,
      0
    );
    expect(somaDaRosca).toBe(kpis.receitaConfirmada);
  });

  it('série ausente em evento COM receita cega o consolidado (null, nunca zero)', () => {
    const cego: EventoKpiInput = { ...SERRA, formasPagamento: null };
    const kpis = derivarKpis([MEIA, cego, RETIRO], []);

    // Somar só os que sabem devolveria uma rosca "completa" de 117.280 sobre
    // uma receita de 142.280 — parte disfarçada de todo, sem nada na tela que
    // permitisse ao organizador desconfiar. Preferimos não desenhar.
    expect(kpis.formasPagamento).toBeNull();
    expect(kpis.receitaConfirmada).toBe(142280);
  });

  it('evento SEM receita e sem série não estraga a cobertura', () => {
    const vazio: EventoKpiInput = {
      nome: 'Evento novo',
      slug: 'evento-novo',
      status: 'rascunho',
      qtdInscritos: 0,
      pagantes: 0,
      receitaConfirmada: 0,
      capacidade: null,
      formasPagamento: null,
    };
    const kpis = derivarKpis([MEIA, vazio], []);

    // Ele não tinha o que contribuir — cegar a rosca por causa dele seria
    // punir a tela por um evento que ninguém comprou.
    expect(kpis.formasPagamento).toEqual([
      { forma: 'cartao_credito', vendas: 153, valor: 35617 },
      { forma: 'pix', vendas: 300, valor: 50000 },
    ]);
  });

  it('portfólio vazio devolve a série zerada, não null', () => {
    // Nenhum evento = "o servidor somou e não achou venda", que é resposta.
    // Só a ignorância vira null.
    expect(derivarKpis([], []).formasPagamento).toEqual([
      { forma: 'cartao_credito', vendas: 0, valor: 0 },
      { forma: 'pix', vendas: 0, valor: 0 },
    ]);
  });
});
