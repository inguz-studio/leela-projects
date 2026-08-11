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
      { id: 'inativo', rotulo: 'Parados há 30 dias ou mais', total: 10 },
    ],
    entrada: [{ id: 'codigo', rotulo: 'Código do club', total: 90 }],
    desafios: [
      { id: 'd1', clubeId: 'floripa-run', nome: 'Desafio 21 dias', participantes: 42, progressoPct: 60 },
    ],
    ponte: [
      { id: 'com-evento', rotulo: 'Ligados a um evento', total: 2 },
      { id: 'sem-evento', rotulo: 'Sem evento vinculado', total: 1 },
    ],
    modalidades: [
      { id: 'Corrida de rua', rotulo: 'Corrida de rua', membros: 90 },
      { id: 'Ciclismo', rotulo: 'Ciclismo', membros: 44 },
    ],
    ocupacao: {
      linhas: [
        { slug: 'corrida-da-ilha', nome: 'Corrida da Ilha', inscritos: 42, capacidade: 50, ocupacao: 0.84 },
        { slug: 'pedal-do-norte', nome: 'Pedal do Norte', inscritos: 12, capacidade: 40, ocupacao: 0.3 },
      ],
      semCapacidade: 0,
    },
    eventosLoading: false,
    eventosError: false,
    onRetryEventos: vi.fn(),
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
    // MEL-05: a ajuda diz o que se mede e o que pesa mais, em duas frases —
    // não mais três qualificações encaixadas numa só.
    expect(ajuda).toHaveTextContent(/em média por participante, comparado ao mínimo do desafio/);
    expect(ajuda).toHaveTextContent(/Desafios com mais gente pesam mais na média/);
  });

  it('situação dos membros usa o rótulo honesto do dado (D-2 + MEL-07: é gente parada, não gente sem cadastro)', async () => {
    render(<EngajamentoView {...props()} />);
    expect(valorNaTabela('Parados há 30 dias ou mais')).toContain('10');
    // A D-2 segue de pé: o rótulo não afirma a ÚLTIMA atividade, que o dado
    // não sustenta. E "Sem registro" saiu porque lia como "não se cadastrou".
    expect(screen.queryByText(/sem atividade há 30 dias/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sem registro \(30 dias/i)).not.toBeInTheDocument();
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
      screen.queryByText(/em média por participante, comparado ao mínimo do desafio/)
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

  it('o bloco "Check-ins realizados" nomeia TUDO que o estudo desenha nele — e não vira aba nem overlay sem contagem por ação', () => {
    render(<EngajamentoView {...props()} />);
    const secao = screen.getByRole('region', { name: 'Check-ins realizados' });
    expect(within(secao).getByText('Em breve')).toBeInTheDocument();
    // A causa cita as três partes do bloco do estudo (D-1008-R15)…
    expect(within(secao).getByText(/total de check-ins do período/i)).toBeInTheDocument();
    expect(within(secao).getByText(/divisão entre os três pilares/i)).toBeInTheDocument();
    expect(within(secao).getByText(/ranking de ações com o Top 10/i)).toBeInTheDocument();
    // …e a fonte que destrava tudo, sem jargão de engenharia (BLQ-15).
    expect(
      within(secao).getByText(/o organizador não tem acesso a esse registro/i)
    ).toBeInTheDocument();
    expect(within(secao).queryByText(/Rules|agregado|atleta/i)).not.toBeInTheDocument();
    expect(within(secao).queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver top 10/i })).not.toBeInTheDocument();
  });

  /**
   * MEL-02 + BLQ-17. O bloco era o único em-breve fora do padrão da casa: o
   * título do estado era uma frase inteira ("ainda não é mensurável", que lê
   * como defeito permanente), o "Em breve" não aparecia e a causa descrevia o
   * modelo de dados em 52 palavras. Agora é o MESMO CardEmBreve dos irmãos.
   */
  it('conversão da base segue o padrão de em-breve da casa e explica as DUAS coisas que faltam', () => {
    render(<EngajamentoView {...props()} />);
    const secao = screen.getByRole('region', { name: 'Conversão da base' });
    expect(within(secao).getByRole('heading', { name: 'Conversão da base' })).toBeInTheDocument();
    expect(within(secao).getByText('Em breve')).toBeInTheDocument();
    expect(within(secao).getByText(/contagem de quem visita a página de um evento/i)).toBeInTheDocument();
    expect(within(secao).getByText(/membro de club e quem compra inscrição/i)).toBeInTheDocument();
    expect(within(secao).queryByText('%')).not.toBeInTheDocument();
    expect(within(secao).queryByText(/mensurável|cadastro de cliente|chute/i)).not.toBeInTheDocument();
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
    // BLQ-02: quem entra num club de bem-estar é uma pessoa, não um "atleta".
    expect(within(secao).getByText(/a primeira pessoa entrar pelo código/i)).toBeInTheDocument();
    expect(within(secao).queryByText(/atleta/i)).not.toBeInTheDocument();
  });
});

/**
 * D-0802-1 — a categoria do produto é EXPERIÊNCIA. Corrida, prova e atleta são
 * instâncias de um evento, nunca o nome que a plataforma dá à coisa. A
 * fronteira que a diretriz NÃO atravessa é o conteúdo do organizador: o rótulo
 * de modalidade que ele cadastrou ("Corrida de rua") continua intacto, e o
 * fixture desta suíte prova as duas metades ao mesmo tempo.
 */
describe('EngajamentoView · vocabulário da plataforma (D-0802-1)', () => {
  it('nenhuma superfície da tela chama a categoria de atleta, prova ou corrida', () => {
    const { container } = render(<EngajamentoView {...props()} />);
    const texto = container.textContent ?? '';
    expect(texto).not.toMatch(/atleta/i);
    expect(texto).not.toMatch(/\bprovas?\b/i);
    // O rótulo do organizador sobrevive — é conteúdo dele, não da plataforma.
    expect(texto).toMatch(/Corrida de rua/);
  });

  it('a ponte fala de EVENTO, não de prova nem de treino', async () => {
    render(<EngajamentoView {...props({ ponte: [] })} />);
    const secao = screen.getByRole('region', { name: 'Desafios ligados a um evento' });
    // BLQ-06: "treino" e "prova" amarravam a frase a corrida — num retiro de
    // bem-estar ela fica falsa.
    expect(
      within(secao).getByText(/transforma a atividade da comunidade em preparação para o seu evento/i)
    ).toBeInTheDocument();
    const ajuda = await abrirAjuda('Desafios ligados a um evento');
    // BLQ-05.
    expect(ajuda).toHaveTextContent(/já está apontada para um evento seu/i);
  });
});

describe('EngajamentoView · modalidades da comunidade (estudo · bloco 4, versão honesta)', () => {
  it('mostra membros ativos por modalidade dos clubs — número real, não interesse declarado', () => {
    render(<EngajamentoView {...props()} />);
    expect(valorNaTabela('Corrida de rua')).toContain('90');
    expect(valorNaTabela('Ciclismo')).toContain('44');
  });

  it('o "?" diz o que o bloco mede — e o que ele NÃO é (interesse declarado não existe)', async () => {
    render(<EngajamentoView {...props()} />);
    const ajuda = await abrirAjuda('Modalidades da comunidade');
    expect(ajuda).toHaveTextContent(/a modalidade é a do club/i);
    // BLQ-03: "atleta" era a categoria da plataforma para quem está no club —
    // e a frase ainda empilhava três orações num travessão duplo.
    expect(ajuda).toHaveTextContent(/não um interesse que o membro declarou/i);
    expect(ajuda).not.toHaveTextContent(/atleta/i);
    expect(ajuda).toHaveTextContent(/conta nos dois/i);
  });

  it('com mais de cinco modalidades, o card ganha o PRÓPRIO recorte (item 9)', async () => {
    const seis = ['Corrida de rua', 'Trail', 'Ciclismo', 'MTB', 'Caminhada', 'Triatlo'].map(
      (m, i) => ({ id: m, rotulo: m, membros: 60 - i })
    );
    render(<EngajamentoView {...props({ modalidades: seis })} />);
    const recorte = screen.getByRole('combobox', { name: 'Recorte das modalidades' });
    expect(recorte).toHaveValue('top');
    expect(screen.queryByRole('rowheader', { name: 'Triatlo' })).not.toBeInTheDocument();
    await userEvent.selectOptions(recorte, 'todas');
    expect(screen.getByRole('rowheader', { name: 'Triatlo' })).toBeInTheDocument();
  });

  it('com cinco ou menos, o controle não existe — recorte que não recorta é ruído', () => {
    render(<EngajamentoView {...props()} />);
    expect(
      screen.queryByRole('combobox', { name: 'Recorte das modalidades' })
    ).not.toBeInTheDocument();
  });

  it('sem membros ativos, o bloco explica a ausência em vez de desenhar barra', () => {
    render(<EngajamentoView {...props({ modalidades: [] })} />);
    const secao = screen.getByRole('region', { name: 'Modalidades da comunidade' });
    expect(within(secao).getByText('Sem membros ativos ainda')).toBeInTheDocument();
    expect(within(secao).queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('EngajamentoView · banda Eventos (estudo · D-1008-R15)', () => {
  it('a banda existe com a legenda do estudo', () => {
    render(<EngajamentoView {...props()} />);
    expect(screen.getByRole('heading', { name: 'Eventos' })).toBeInTheDocument();
    // BLQ-07: "provas" era a categoria do evento na voz da plataforma, logo
    // abaixo de um título que já diz "Eventos".
    expect(
      screen.getByText('O resultado: ocupação dos eventos e como as pessoas pagam.')
    ).toBeInTheDocument();
  });

  it('a ocupação é REAL: inscritos sobre vagas por evento, no componente canônico da VG', () => {
    render(<EngajamentoView {...props()} />);
    const bloco = screen.getByRole('region', { name: 'Ocupação dos últimos eventos' });
    expect(
      within(bloco).getByRole('img', {
        name: 'Corrida da Ilha: 42 de 50 vagas (84%)',
      })
    ).toBeInTheDocument();
    expect(
      within(bloco).getByRole('img', { name: 'Pedal do Norte: 12 de 40 vagas (30%)' })
    ).toBeInTheDocument();
  });

  it('evento sem capacidade não vira barra — a nota diz quantos ficaram de fora', () => {
    render(
      <EngajamentoView
        {...props({
          ocupacao: {
            linhas: [
              { slug: 'a', nome: 'Prova A', inscritos: 10, capacidade: 20, ocupacao: 0.5 },
            ],
            semCapacidade: 2,
          },
        })}
      />
    );
    expect(
      screen.getByText('2 eventos ficaram de fora por não ter capacidade definida.')
    ).toBeInTheDocument();
  });

  it('erro na leitura de eventos fica CONTIDO no card — a análise da comunidade segue de pé', () => {
    const onRetryEventos = vi.fn();
    render(<EngajamentoView {...props({ eventosError: true, ocupacao: null, onRetryEventos })} />);
    const bloco = screen.getByRole('region', { name: 'Ocupação dos últimos eventos' });
    expect(
      within(bloco).getByText('Não foi possível carregar a ocupação dos seus eventos.')
    ).toBeInTheDocument();
    // Os vizinhos de outra fonte não caem junto.
    expect(screen.getByRole('region', { name: 'Números da comunidade' })).toBeInTheDocument();
  });

  it('formas de pagamento se nomeia, diz a causa e escreve "Em breve" — sem donut fabricado', () => {
    render(<EngajamentoView {...props()} />);
    const secao = screen.getByRole('region', { name: 'Formas de pagamento' });
    expect(within(secao).getByText('Em breve')).toBeInTheDocument();
    // BLQ-16: "doc", "agregado" e "varre documentos" saíram — e com eles o
    // "chega ao cliente", que numa tela de organizadora lê como se o COMPRADOR
    // não recebesse algo.
    expect(
      within(secao).getByText(/ainda não existe um total por forma de pagamento/i)
    ).toBeInTheDocument();
    expect(within(secao).queryByText(/agregado|doc de pagamento|chega ao cliente/i)).not.toBeInTheDocument();
    expect(within(secao).queryByRole('img')).not.toBeInTheDocument();
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

  /**
   * MEL-01. O bloco de erro era o único da área sem saída: dizia que falhou e
   * justificava a decisão de projeto ("os números só aparecem completos") para
   * quem não pode fazer nada com ela. O irmão do hub já dizia "Tente
   * novamente"; o botão tem precedente em assessorias parceiras.
   */
  it('erro → diz o que houve e OFERECE a saída, sem justificativa de projeto', async () => {
    const onRetry = vi.fn();
    render(<EngajamentoView {...props({ error: new Error('falhou'), onRetry })} />);
    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent(
      /Não foi possível carregar o engajamento da sua comunidade\. Tente novamente\./i
    );
    expect(alerta).not.toHaveTextContent(/parte do dado como se fosse o todo/i);
    await userEvent.click(within(alerta).getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('138')).not.toBeInTheDocument();
  });

  it('tenant sem club → convite, sem filtro e sem seção nenhuma', () => {
    render(<EngajamentoView {...props({ semClubes: true })} />);
    expect(screen.getByText('Nenhum club para analisar')).toBeInTheDocument();
    // MEL-10: nem abertura de enchimento ("o engajamento nasce da
    // comunidade"), nem promessa de contar presença — que esta mesma tela
    // declara ausente em três blocos.
    expect(screen.queryByText(/nasce da comunidade/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/passa a contar quem aparece/i)).not.toBeInTheDocument();
    expect(screen.getByText(/passa a mostrar quem está na sua comunidade/i)).toBeInTheDocument();
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
