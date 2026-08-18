// =============================================================================
// derivarInsightsDaVisaoGeral — a leitura de conjunto da Visão geral
// (VG-INSIGHTS · leva 23).
//
// A regra dura é a de sempre nesta casa: nenhum número inventado. Cada caso
// aqui existe para provar UMA das duas coisas — ou que o insight sai do dado
// real que a tela já carrega, ou que ele NÃO nasce quando não há fato.
// =============================================================================

import { describe, expect, it } from 'vitest';
import type { OverviewAlert, OverviewKPIs } from '@leela/core';
import {
  ALERTA_DE_CONJUNTO,
  alertasDeEvento,
  derivarInsightsDaVisaoGeral,
} from '../insights';
import { mkKpis } from '../../_test/fixtures';

const pendentes: OverviewAlert = {
  id: 'pendentes-24h',
  severidade: 'info',
  titulo: '9 inscrições pendentes aguardam pagamento há mais de 24h',
  quando: 'há 2h',
  em: '2026-08-17T10:00:00.000Z',
};

const ocupacao: OverviewAlert = {
  id: 'ocupacao-corrida-do-sol',
  severidade: 'warn',
  titulo: 'Corrida do Sol está com 92% das vagas preenchidas',
  quando: 'há 1h',
  em: '2026-08-17T11:00:00.000Z',
  href: '/eventos/corrida-do-sol',
};

const publicacao: OverviewAlert = {
  id: 'publicacao-trail-da-serra',
  severidade: 'warn',
  titulo: 'Trail da Serra ainda não foi publicado · prazo 5 dias',
  quando: 'ontem',
  em: '2026-08-16T09:00:00.000Z',
  href: '/eventos/trail-da-serra',
};

/** KPIs com comunidade viva e desafio rodando — o caso que NÃO dispara nada. */
function kpisComDesafio(): OverviewKPIs {
  return { ...mkKpis(), membrosAtivosTotais: 138, desafiosAtivosTotais: 4 };
}

describe('alertasDeEvento (a partição RN-573)', () => {
  it('tira o alerta de conjunto e mantém os de evento', () => {
    const restante = alertasDeEvento([pendentes, ocupacao, publicacao]);
    expect(restante?.map((a) => a.id)).toEqual([ocupacao.id, publicacao.id]);
  });

  it('null continua null — ausência de dado nunca vira lista vazia (#03)', () => {
    // Lista vazia significa "carregou e não há alerta"; null significa "ainda
    // não sei". Colapsar os dois é como um erro vira "Tudo em dia".
    expect(alertasDeEvento(null)).toBeNull();
  });

  it('os dois lados leem a MESMA constante — a partição não pode divergir', () => {
    expect(ALERTA_DE_CONJUNTO).toBe(pendentes.id);
  });
});

describe('derivarInsightsDaVisaoGeral', () => {
  it('sem fato nenhum, nenhum insight — aviso de zero é ruído com cara de alerta', () => {
    expect(
      derivarInsightsDaVisaoGeral([ocupacao], [{ slug: 'corrida-do-sol', status: 'publicado' }], kpisComDesafio())
    ).toEqual([]);
    expect(derivarInsightsDaVisaoGeral(null, null, null)).toEqual([]);
    expect(derivarInsightsDaVisaoGeral([], [], null)).toEqual([]);
  });

  it('pendências: o título vem do ALERTA, fonte única derivada no servidor', () => {
    const [insight] = derivarInsightsDaVisaoGeral([pendentes], [], kpisComDesafio());
    expect(insight?.id).toBe('pagamentos-pendentes');
    expect(insight?.tom).toBe('atencao');
    // Nada de reescrever a frase aqui: um segundo caminho de cálculo sobre o
    // mesmo fato é exatamente o que a RN-573 nasceu para impedir.
    expect(insight?.titulo).toBe(pendentes.titulo);
    // E a âncora temporal do painel não se perde na mudança de casa.
    expect(insight?.detalhe).toContain('há 2h');
  });

  it('pendências: as 48h do template do dono NÃO entram — a constante da casa é 24h', () => {
    const [insight] = derivarInsightsDaVisaoGeral([pendentes], [], kpisComDesafio());
    expect(insight?.titulo).toContain('24h');
    expect(`${insight?.titulo} ${insight?.detalhe}`).not.toContain('48h');
  });

  it('pendências: NENHUM valor em R$ — não existe agregado de R$ pendente hoje', () => {
    const [insight] = derivarInsightsDaVisaoGeral([pendentes], [], kpisComDesafio());
    // O template pede "R$ 1.240 aguardando pagamento". Sem agregado (nem
    // servidor nem cliente), um número em reais aqui seria invenção.
    expect(`${insight?.titulo} ${insight?.detalhe}`).not.toMatch(/R\$/u);
  });

  it('rascunho com alerta de prazo NÃO é contado de novo (o mesmo fato, a mesma dobra)', () => {
    const eventos = [
      { slug: 'trail-da-serra', status: 'rascunho' as const },
      { slug: 'volta-da-lagoa', status: 'rascunho' as const },
      { slug: 'corrida-do-sol', status: 'publicado' as const },
    ];
    const insights = derivarInsightsDaVisaoGeral([publicacao], eventos, kpisComDesafio());
    const rascunho = insights.find((i) => i.id === 'eventos-em-rascunho');
    // Dois rascunhos, um já alertado → a conta do insight é 1.
    expect(rascunho?.titulo).toBe('1 evento seu ainda está em rascunho');
  });

  it('rascunho: plural em pt-BR quando são vários', () => {
    const eventos = [
      { slug: 'a', status: 'rascunho' as const },
      { slug: 'b', status: 'rascunho' as const },
    ];
    const [insight] = derivarInsightsDaVisaoGeral([], eventos, kpisComDesafio());
    expect(insight?.titulo).toBe('2 eventos seus ainda estão em rascunho');
    expect(insight?.tom).toBe('oportunidade');
  });

  it('todo rascunho já alertado → o insight não nasce', () => {
    const eventos = [{ slug: 'trail-da-serra', status: 'rascunho' as const }];
    const insights = derivarInsightsDaVisaoGeral([publicacao], eventos, kpisComDesafio());
    expect(insights.find((i) => i.id === 'eventos-em-rascunho')).toBeUndefined();
  });

  it('comunidade: membros sem desafio é o PAR que nenhum bloco lê', () => {
    const kpis = { ...mkKpis(), membrosAtivosTotais: 138, desafiosAtivosTotais: 0 };
    const [insight] = derivarInsightsDaVisaoGeral([], [], kpis);
    expect(insight?.titulo).toBe('138 membros ativos e nenhum desafio rodando');
    expect(insight?.destino).toEqual({ tipo: 'rota', href: '/clubes' });
  });

  it('comunidade vazia (os DOIS em zero) não dispara — o bloco Clubs já tem estado próprio', () => {
    const kpis = { ...mkKpis(), membrosAtivosTotais: 0, desafiosAtivosTotais: 0 };
    expect(derivarInsightsDaVisaoGeral([], [], kpis)).toEqual([]);
  });

  it('todo insight carrega o caminho para a casa do fato (RN-573)', () => {
    const eventos = [{ slug: 'a', status: 'rascunho' as const }];
    const kpis = { ...mkKpis(), membrosAtivosTotais: 138, desafiosAtivosTotais: 0 };
    const insights = derivarInsightsDaVisaoGeral([pendentes], eventos, kpis);
    expect(insights).toHaveLength(3);
    for (const i of insights) {
      expect(i.destino).toBeTruthy();
      expect(i.caminho).toBeTruthy();
      // Fato de conjunto não tem bloco dono NESTA tela: apontar para um daqui
      // seria caminho falso, então todos vão por rota.
      expect(i.destino.tipo).toBe('rota');
    }
    // A atenção vem antes das oportunidades — o que pesa contra agora primeiro.
    expect(insights.map((i) => i.tom)).toEqual(['atencao', 'oportunidade', 'oportunidade']);
  });

  it('carrinho abandonado e recompra por club NÃO aparecem — não têm fonte legível', () => {
    const kpis = { ...mkKpis(), membrosAtivosTotais: 138, desafiosAtivosTotais: 0 };
    const insights = derivarInsightsDaVisaoGeral([pendentes], [], kpis);
    const texto = insights.map((i) => `${i.titulo} ${i.detalhe}`).join(' ');
    // Derivações 2 e 3 do template. As Rules fecham o ledger de carrinho de
    // propósito, e não existe identidade que ligue membro a comprador.
    expect(texto).not.toMatch(/incompleta|abandonad|recompra|comprador/iu);
  });
});
