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

/** Abre o "?" de um bloco e devolve o texto da explicação (item 8: em portal). */
async function abrirAjuda(bloco: string): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole('button', { name: `O que "${bloco}" mostra` }));
  return screen.getByRole('dialog');
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

  it('o bloco de pilares se nomeia como média por participante, no "?" E no aria-label (D-1)', async () => {
    render(<EngajamentoView {...props()} />);
    expect(
      screen.getByRole('img', {
        name: 'Média de pontos por participante por pilar, ponderada por desafio, sobre o mínimo exigido',
      })
    ).toBeInTheDocument();
    const ajuda = await abrirAjuda('Equilíbrio dos pilares');
    expect(ajuda).toHaveTextContent(/Média de pontos por participante em cada pilar/);
  });

  it('situação dos membros usa o rótulo honesto do dado (D-2: não é "sem atividade", é "sem registro")', async () => {
    render(<EngajamentoView {...props()} />);
    expect(valorNaTabela('Sem registro (30 dias+)')).toContain('10');
    expect(screen.queryByText(/sem atividade há 30 dias/i)).not.toBeInTheDocument();
    const ajuda = await abrirAjuda('Situação dos membros');
    expect(ajuda).toHaveTextContent(/há 30 dias ou mais sem nenhum registro de atividade/i);
  });

  it('a ponte com eventos separa ligados de não ligados', () => {
    render(<EngajamentoView {...props()} />);
    expect(valorNaTabela('Ligados a um evento')).toContain('2');
    expect(valorNaTabela('Sem evento vinculado')).toContain('1');
  });

  it('a ponte é rotulada como intenção, nunca como inscrição confirmada', async () => {
    render(<EngajamentoView {...props()} />);
    const ajuda = await abrirAjuda('Desafios ligados a um evento');
    expect(ajuda).toHaveTextContent(/intenção declarada no desafio, não inscrição confirmada/i);
  });
});

describe('EngajamentoView · cabeçalhos e o fim do "ponto de equilíbrio" (REFACTOR item 12)', () => {
  it('a descrição sai da linha fixa do cabeçalho e vira o "?" — em portal, fora do card', async () => {
    const { container } = render(<EngajamentoView {...props()} />);
    expect(
      screen.queryByText(/Média de pontos por participante em cada pilar/)
    ).not.toBeInTheDocument();
    const ajuda = await abrirAjuda('Equilíbrio dos pilares');
    expect(container.contains(ajuda)).toBe(false);
  });

  it('a explicação do ranking ACOMPANHA o recorte do card', async () => {
    const muitos = Array.from({ length: 9 }, (_, i) => ({
      id: `d${i}`,
      clubeId: 'floripa-run',
      nome: `Desafio ${String.fromCharCode(65 + i)}`,
      participantes: 100 - i,
      progressoPct: 50,
    }));
    render(<EngajamentoView {...props({ desafios: muitos })} />);

    const noTop = await abrirAjuda('Desafios que mais movem a comunidade');
    expect(noTop).toHaveTextContent('de 9 no total');

    await userEvent.keyboard('{Escape}');
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Recorte do ranking de desafios' }),
      'todos'
    );
    const emTodos = await abrirAjuda('Desafios que mais movem a comunidade');
    expect(emTodos).not.toHaveTextContent('de 9 no total');
    expect(emTodos).toHaveTextContent(/do maior para o menor/);
  });

  it('nenhuma marca de equilíbrio-alvo na tela: nem 33%, nem "acima/abaixo do equilíbrio"', () => {
    render(<EngajamentoView {...props()} />);
    expect(screen.queryByText(/33\s*%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ponto de equilíbrio/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/(acima|abaixo) do equilíbrio/i)).not.toBeInTheDocument();
  });

  it('a média ponderada e o mínimo exigido NÃO regridem junto com a marca (conquista da lane FIX)', () => {
    render(<EngajamentoView {...props()} />);
    expect(valorNaTabela('Físico')).toContain('75,4 / 150,9');
  });

  it('o card diz qual pilar concentra a maior média — e só isso', () => {
    render(<EngajamentoView {...props()} />);
    expect(
      screen.getByText('Físico é o pilar com a maior média por participante.')
    ).toBeInTheDocument();
  });

  it('em empate, o card não elege líder nenhum', () => {
    render(
      <EngajamentoView
        {...props({
          pilares: {
            desafiosComPilar: 1,
            linhas: [
              { pilar: 'fisico', rotulo: 'Físico', atual: 30, meta: 100 },
              { pilar: 'mental', rotulo: 'Mental', atual: 30, meta: 100 },
              { pilar: 'espiritual', rotulo: 'Espiritual', atual: 10, meta: 60 },
            ],
          },
        })}
      />
    );
    expect(screen.queryByText(/é o pilar com a maior média/)).not.toBeInTheDocument();
  });
});

describe('EngajamentoView · o que não tem fonte', () => {
  it('o Mapa de Check-ins se nomeia, diz a causa e escreve "Em breve" — sem forma de gráfico', () => {
    render(<EngajamentoView {...props()} />);
    const secao = screen.getByRole('region', { name: 'Mapa de Check-ins' });
    expect(within(secao).getByRole('heading', { name: 'Mapa de Check-ins' })).toBeInTheDocument();
    expect(within(secao).getByText('Em breve')).toBeInTheDocument();
    expect(within(secao).getByText(/QR na largada de um evento/i)).toBeInTheDocument();
    expect(within(secao).queryByRole('img')).not.toBeInTheDocument();
  });

  it('o Volume de Check-ins também se nomeia, e não vira série com o progresso do desafio', () => {
    render(<EngajamentoView {...props()} />);
    const secao = screen.getByRole('region', { name: 'Volume de Check-ins' });
    expect(within(secao).getByText('Em breve')).toBeInTheDocument();
    expect(within(secao).getByText(/acumulado por participante/i)).toBeInTheDocument();
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

describe('EngajamentoView · recorte por card (REFACTOR item 9)', () => {
  const muitos = Array.from({ length: 8 }, (_, i) => ({
    id: `d${i}`,
    clubeId: 'floripa-run',
    nome: `Desafio ${String.fromCharCode(65 + i)}`,
    participantes: 100 - i,
    progressoPct: 50,
  }));

  it('com mais de cinco desafios, o card ganha o PRÓPRIO recorte e mostra o Top 5', () => {
    render(<EngajamentoView {...props({ desafios: muitos })} />);
    const recorte = screen.getByRole('combobox', { name: 'Recorte do ranking de desafios' });
    expect(recorte).toHaveValue('top');
    expect(screen.getByRole('rowheader', { name: 'Desafio E' })).toBeInTheDocument();
    expect(screen.queryByRole('rowheader', { name: 'Desafio F' })).not.toBeInTheDocument();
  });

  it('trocar para "Todos" revela o que o corte escondia — sem tocar no filtro de club', async () => {
    const onSelecionarClube = vi.fn();
    render(<EngajamentoView {...props({ desafios: muitos, onSelecionarClube })} />);
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Recorte do ranking de desafios' }),
      'todos'
    );
    expect(screen.getByRole('rowheader', { name: 'Desafio H' })).toBeInTheDocument();
    expect(onSelecionarClube).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: 'Club analisado' })).toHaveValue(TODOS_OS_CLUBS);
  });

  it('com cinco ou menos, o controle não existe — recorte que não recorta é ruído', () => {
    render(<EngajamentoView {...props({ desafios: muitos.slice(0, 5) })} />);
    expect(
      screen.queryByRole('combobox', { name: 'Recorte do ranking de desafios' })
    ).not.toBeInTheDocument();
  });
});

describe('EngajamentoView · animação escopada por filtro (REFACTOR item 10)', () => {
  /** Nome do keyframe ativo no envelope daquele gráfico. */
  function faseDoGrafico(nomeDoGrafico: string): string {
    const envelope = screen
      .getByRole('img', { name: nomeDoGrafico })
      .closest('[class*="animate-revela-grafico"]');
    return envelope?.className ?? '';
  }

  const muitos = Array.from({ length: 8 }, (_, i) => ({
    id: `d${i}`,
    clubeId: 'floripa-run',
    nome: `Desafio ${String.fromCharCode(65 + i)}`,
    participantes: 100 - i,
    progressoPct: 50,
  }));

  it('trocar o recorte do ranking reanima o ranking e NÃO os vizinhos', async () => {
    render(<EngajamentoView {...props({ desafios: muitos })} />);
    const rankingAntes = faseDoGrafico('Participantes por desafio em andamento');
    const situacaoAntes = faseDoGrafico('Membros por situação');
    const entradaAntes = faseDoGrafico('Membros por porta de entrada');

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Recorte do ranking de desafios' }),
      'todos'
    );

    expect(faseDoGrafico('Participantes por desafio em andamento')).not.toBe(rankingAntes);
    expect(faseDoGrafico('Membros por situação')).toBe(situacaoAntes);
    expect(faseDoGrafico('Membros por porta de entrada')).toBe(entradaAntes);
  });

  it('trocar o club reanima os gráficos que aquele filtro realmente muda', () => {
    const { rerender } = render(<EngajamentoView {...props({ desafios: muitos })} />);
    const situacaoAntes = faseDoGrafico('Membros por situação');
    rerender(<EngajamentoView {...props({ desafios: muitos, clubeSelecionado: 'pedal-norte' })} />);
    expect(faseDoGrafico('Membros por situação')).not.toBe(situacaoAntes);
  });

  it('todo gráfico carrega o desligamento por movimento reduzido', () => {
    render(<EngajamentoView {...props()} />);
    expect(faseDoGrafico('Membros por situação')).toContain('motion-reduce:animate-none');
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
