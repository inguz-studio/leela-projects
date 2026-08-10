// =============================================================================
// EngajamentoView — a tela, e principalmente o que ela NÃO promete.
//
// A regra dura da lane é verdade de dado. Os casos abaixo cobram isso em duas
// direções: onde há fonte, o número aparece com o rótulo certo; onde não há, a
// tela NOMEIA a métrica e a causa — e não desenha gráfico nenhum. Um gráfico
// zerado é pior que um vazio explicado, porque o zero passa por resposta.
//
// A leitura é pela tabela equivalente que o BarChart do DS publica em sr-only:
// jsdom não faz layout, e a semântica é justamente o que precisa estar certo.
// =============================================================================

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EngajamentoView, type EngajamentoViewProps } from '../EngajamentoView';
import { TODOS_OS_CLUBS } from '../_data/engajamento';

function props(over: Partial<EngajamentoViewProps> = {}): EngajamentoViewProps {
  return {
    clubes: [
      { id: 'floripa-run', nome: 'Floripa Run Coletivo' },
      { id: 'pedal-norte', nome: 'Pedal Norte' },
    ],
    clubeSelecionado: TODOS_OS_CLUBS,
    onSelecionarClube: vi.fn(),
    resumo: { clubes: 2, membrosAtivos: 138, desafiosAtivos: 3, participacoes: 51 },
    pilares: {
      desafiosComPilar: 1,
      linhas: [
        { pilar: 'fisico', rotulo: 'Físico', atual: 75.4, meta: 150.9 },
        { pilar: 'mental', rotulo: 'Mental', atual: 30, meta: 100 },
        { pilar: 'espiritual', rotulo: 'Espiritual', atual: 10, meta: 60 },
      ],
    },
    situacao: [
      { id: 'novo', rotulo: 'Novos (7 dias)', total: 8 },
      { id: 'ativo', rotulo: 'Ativos', total: 120 },
      { id: 'inativo', rotulo: 'Sem registro (30 dias+)', total: 10 },
    ],
    entrada: [{ id: 'codigo', rotulo: 'Código do club', total: 90 }],
    desafios: [
      { id: 'd1', clubeId: 'floripa-run', nome: 'Desafio 21 dias', participantes: 42, progressoPct: 60 },
    ],
    ponte: [
      { id: 'com-evento', rotulo: 'Ligados a um evento', total: 2 },
      { id: 'sem-evento', rotulo: 'Sem evento vinculado', total: 1 },
    ],
    loading: false,
    error: null,
    semClubes: false,
    onCriarClube: vi.fn(),
    ...over,
  };
}

/** Célula de valor da tabela equivalente de um gráfico, pelo rótulo da linha. */
function valorNaTabela(rotulo: string): string {
  const linha = screen.getByRole('rowheader', { name: rotulo }).closest('tr');
  return linha?.textContent ?? '';
}

describe('EngajamentoView · o que tem fonte', () => {
  it('mostra os quatro números da comunidade', () => {
    render(<EngajamentoView {...props()} />);
    const topo = screen.getByRole('region', { name: 'Números da comunidade' });
    expect(within(topo).getByText('Clubs')).toBeInTheDocument();
    expect(within(topo).getByText('138')).toBeInTheDocument();
    expect(within(topo).getByText('51')).toBeInTheDocument();
  });

  it('diz que participações são dos desafios em andamento — não do total histórico', () => {
    render(<EngajamentoView {...props()} />);
    expect(screen.getByText('nos desafios em andamento')).toBeInTheDocument();
  });

  it('pilares aparecem com atual sobre meta, com decimal declarado (D-1: é média, não é pontuação inteira)', () => {
    render(<EngajamentoView {...props()} />);
    expect(valorNaTabela('Físico')).toContain('75,4 / 150,9');
  });

  it('o bloco de pilares se nomeia como média por participante, no rótulo E no aria-label (D-1)', () => {
    render(<EngajamentoView {...props()} />);
    expect(
      screen.getByText(/Média de pontos por participante em cada pilar/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Média de pontos por participante por pilar, ponderada por desafio, sobre o mínimo exigido',
      })
    ).toBeInTheDocument();
  });

  it('situação dos membros usa o rótulo honesto do dado (D-2: não é "sem atividade", é "sem registro")', () => {
    render(<EngajamentoView {...props()} />);
    expect(valorNaTabela('Sem registro (30 dias+)')).toContain('10');
    expect(screen.queryByText(/sem atividade há 30 dias/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/há 30 dias ou mais sem nenhum registro de atividade/i)
    ).toBeInTheDocument();
  });

  it('a ponte com eventos separa ligados de não ligados', () => {
    render(<EngajamentoView {...props()} />);
    expect(valorNaTabela('Ligados a um evento')).toContain('2');
    expect(valorNaTabela('Sem evento vinculado')).toContain('1');
  });

  it('a ponte é rotulada como intenção, nunca como inscrição confirmada', () => {
    render(<EngajamentoView {...props()} />);
    expect(
      screen.getByText(/intenção declarada no desafio, não inscrição confirmada/i)
    ).toBeInTheDocument();
  });
});

describe('EngajamentoView · o que não tem fonte', () => {
  it('frequência não vira gráfico: nomeia a métrica e a causa', () => {
    render(<EngajamentoView {...props()} />);
    const secao = screen.getByRole('region', { name: 'Frequência e presença' });
    expect(
      within(secao).getByText('Frequência da comunidade ainda não é medida')
    ).toBeInTheDocument();
    expect(within(secao).getByText(/só existe check-in de largada de evento/i)).toBeInTheDocument();
    expect(within(secao).queryByRole('img')).not.toBeInTheDocument();
  });

  it('conversão da base explica as DUAS coisas que faltam, sem taxa nenhuma', () => {
    render(<EngajamentoView {...props()} />);
    const secao = screen.getByRole('region', { name: 'Conversão da base' });
    expect(within(secao).getByText(/nenhuma contagem de visitante existe/i)).toBeInTheDocument();
    expect(within(secao).getByText(/não carrega o vínculo com o club/i)).toBeInTheDocument();
    expect(within(secao).queryByText('%')).not.toBeInTheDocument();
  });

  it('sem desafio de equilíbrio, os pilares explicam a ausência em vez de mostrar zeros', () => {
    render(<EngajamentoView {...props({ pilares: { desafiosComPilar: 0, linhas: [] } })} />);
    const secao = screen.getByRole('region', { name: 'Equilíbrio dos pilares' });
    expect(within(secao).getByText('Sem desafio de equilíbrio')).toBeInTheDocument();
    expect(within(secao).getByText(/Modelo C/)).toBeInTheDocument();
  });

  it('sem ninguém dentro dos desafios, o ranking não desenha barra vazia', () => {
    render(<EngajamentoView {...props({ desafios: [] })} />);
    const secao = screen.getByRole('region', {
      name: 'Desafios que mais movem a comunidade',
    });
    expect(within(secao).getByText('Nenhum desafio em andamento')).toBeInTheDocument();
  });

  it('sem membros, a porta de entrada vira convite e não três zeros', () => {
    render(<EngajamentoView {...props({ entrada: [] })} />);
    const secao = screen.getByRole('region', { name: 'Como a comunidade entra' });
    expect(within(secao).getByText('Ninguém entrou ainda')).toBeInTheDocument();
  });
});

describe('EngajamentoView · estados da tela', () => {
  it('carregando → status acessível, nenhum número no ar', () => {
    render(
      <EngajamentoView
        {...props({ loading: true, resumo: null, pilares: null, situacao: null, entrada: null, desafios: null, ponte: null })}
      />
    );
    expect(
      screen.getByRole('status', { name: 'Carregando números da comunidade' })
    ).toBeInTheDocument();
    expect(screen.queryByText('138')).not.toBeInTheDocument();
  });

  it('erro → alerta que explica por que a tela não mostra parte do dado', () => {
    render(<EngajamentoView {...props({ error: new Error('falhou') })} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      /nenhum bloco mostra parte do dado como se fosse o todo/i
    );
    expect(screen.queryByText('138')).not.toBeInTheDocument();
  });

  it('tenant sem club → convite, sem filtro e sem seção nenhuma', () => {
    render(<EngajamentoView {...props({ semClubes: true })} />);
    expect(screen.getByText('Nenhum club para analisar')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Club analisado' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Números da comunidade' })
    ).not.toBeInTheDocument();
  });

  it('o CTA "Criar um club" é o botão do DS, não markup cru (D-10 · ADIÇÃO)', async () => {
    const onCriarClube = vi.fn();
    render(<EngajamentoView {...props({ semClubes: true, onCriarClube })} />);
    const cta = screen.getByRole('button', { name: 'Criar um club' });
    await userEvent.click(cta);
    expect(onCriarClube).toHaveBeenCalledTimes(1);
  });
});

describe('EngajamentoView · recorte por club', () => {
  it('o filtro lista "Todos os clubs" primeiro e depois cada club', () => {
    render(<EngajamentoView {...props()} />);
    const filtro = screen.getByRole('combobox', { name: 'Club analisado' });
    const opcoes = within(filtro).getAllByRole('option').map((o) => o.textContent);
    expect(opcoes).toEqual(['Todos os clubs', 'Floripa Run Coletivo', 'Pedal Norte']);
  });

  it('escolher um club avisa quem manda na leitura', async () => {
    const onSelecionarClube = vi.fn();
    render(<EngajamentoView {...props({ onSelecionarClube })} />);
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Club analisado' }),
      'pedal-norte'
    );
    expect(onSelecionarClube).toHaveBeenCalledWith('pedal-norte');
  });
});
