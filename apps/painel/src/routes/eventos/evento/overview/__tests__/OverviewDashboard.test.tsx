import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { OverviewDashboard } from '../OverviewDashboard';
import { OverviewKpis } from '../OverviewKpis';
import type { AlertaOperacional } from '../../../_lib/alertas';

/**
 * O dashboard passou a levar o organizador ao destino nomeado pelo alerta
 * (DIAG-PAINEL-LACUNAS), então precisa de um Router em volta — mesmo motivo
 * do `EventoShell`, que navega e por isso monta em `MemoryRouter`.
 */
function renderDashboard(ui: ReactElement): ReturnType<typeof render> {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/**
 * O NÚMERO de um card de KPI, lido pelo rótulo. Casar o valor pelo rótulo (e
 * não por um texto solto na tela) é o que faz a asserção do ticket médio ser
 * sobre o ticket médio — quatro cards de dinheiro dividem a mesma seção, e um
 * `getByText(/190/)` acertaria qualquer um deles.
 */
function valorDoCard(rotulo: string): string {
  const label = screen.getByText(rotulo);
  const valor = label.nextElementSibling;
  if (valor === null) throw new Error(`card "${rotulo}" sem valor ao lado do rótulo`);
  return valor.textContent ?? '';
}

const baseProps = {
  dias: 8,
  dataLinha: 'Domingo, 27 de abril · 06:00',
  qtdInscritos: 453,
  capacidade: 600,
  receitaConfirmada: 85617,
  // D-1008-R19: derivado por PAGANTE lá na página (85.617 ÷ 450 confirmados),
  // não os 188,99 que sairiam da contagem de inscritos deste mesmo fixture.
  ticketMedio: 190.26,
  receitaSemana: 12400,
  ticketSparkline: [156, 162, 171, 189],
  taxaConversaoPct: 42,
  repassePrevisto: 76602,
  taxaPct: 10.5,
  inscricoesModal: [
    { label: '21k', value: 148, colorIndex: 0 },
    { label: '10k', value: 186, colorIndex: 1 },
    { label: '5k', value: 119, colorIndex: 2 },
  ],
  receitaTotal: 85617,
  receitaModal: [
    { label: '21k', value: 41096, colorIndex: 0 },
    { label: '10k', value: 27397, colorIndex: 1 },
    { label: '5k', value: 17124, colorIndex: 2 },
  ],
  atividade: [
    { id: '1', tipo: 'confirmado' as const, nome: 'Marina Silva', iniciais: 'MS', modalidade: '21k', quando: 'há 12 min' },
    { id: '2', tipo: 'falhou' as const, nome: 'Diego Alves', iniciais: 'DA', modalidade: '10k', quando: 'há 6h', badge: { label: 'Falha' as const, variant: 'vulcao' as const } },
  ],
  atividadeLoading: false,
  alertas: [] as AlertaOperacional[],
};

describe('OverviewKpis', () => {
  it('mostra os 4 cards fiéis: receita, ticket, conversão e repasse', () => {
    render(
      <OverviewKpis
        receitaConfirmada={85617}
        ticketMedio={190.26}
        receitaSemana={12400}
        taxaConversaoPct={42}
        repassePrevisto={76602}
        taxaPct={10.5}
      />,
    );
    expect(screen.getByText(/85\.617/)).toBeInTheDocument();
    // `formatBRL` do dashboard não mostra centavos: 190,26 → "R$ 190".
    expect(valorDoCard('Ticket médio')).toMatch(/R\$\s*190/u);
    expect(screen.getByText('Taxa de conversão')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('Repasse previsto')).toBeInTheDocument();
    expect(screen.getByText(/76\.602/)).toBeInTheDocument();
    expect(screen.getByText('Aguardando encerramento')).toBeInTheDocument();
  });

  it('degrada honesto: sem conversão/repasse mostra "—"', () => {
    render(<OverviewKpis receitaConfirmada={0} />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  /**
   * D-1008-R19. O componente não recebe mais contagem de inscritos: o ticket
   * chega derivado por pagante (`ticketMedioPorPagante`) ou não chega. Com
   * receita no card e ticket indeterminado, o lugar do número mostra "—" —
   * receita > 0 nunca autoriza inventar um ticket.
   */
  it('ticket indeterminado mostra "—", mesmo com receita no card', () => {
    render(<OverviewKpis receitaConfirmada={85617} ticketMedio={null} />);
    expect(screen.getByText(/85\.617/)).toBeInTheDocument();
    // Receita > 0 não autoriza inventar ticket: nem número, nem "R$ 0".
    expect(valorDoCard('Ticket médio')).toBe('—');
  });

  it('não aceita mais contagem de inscritos — o denominador errado não tem porta', () => {
    // O tipo já barra em compilação; aqui a prova é de runtime: passar
    // `qtdInscritos` não ressuscita a divisão (85.617 ÷ 453 ≈ 189).
    render(
      <OverviewKpis
        {...({ qtdInscritos: 453 } as unknown as Record<string, never>)}
        receitaConfirmada={85617}
      />,
    );
    expect(valorDoCard('Ticket médio')).toBe('—');
  });
});

describe('OverviewDashboard', () => {
  it('renderiza os 5 blocos: hero, KPIs, bar, donut e feed', () => {
    renderDashboard(<OverviewDashboard {...baseProps} />);
    // 1. hero de contagem regressiva
    expect(screen.getByRole('region', { name: 'Contagem regressiva' })).toBeInTheDocument();
    expect(screen.getByText('dias para o evento')).toBeInTheDocument();
    // 2. KPI de repasse
    expect(screen.getByText('Repasse previsto')).toBeInTheDocument();
    // 3. bar "Inscrições por modalidade" (tabela equivalente do chart)
    expect(screen.getByRole('table', { name: 'Inscrições por modalidade' })).toBeInTheDocument();
    // 4. donut "Receita por modalidade"
    expect(screen.getByRole('img', { name: 'Receita por modalidade' })).toBeInTheDocument();
    // 5. feed tipado (não lista de nomes) com carimbo e badge
    expect(screen.getByRole('region', { name: 'Atividade recente' })).toBeInTheDocument();
    expect(screen.getByText('Marina Silva')).toBeInTheDocument();
    expect(screen.getByText('há 12 min')).toBeInTheDocument();
    expect(screen.getByText('Falha')).toBeInTheDocument();
  });

  it('mostra skeleton enquanto a atividade carrega', () => {
    renderDashboard(<OverviewDashboard {...baseProps} atividade={[]} atividadeLoading />);
    expect(screen.getByRole('status', { name: 'Carregando atividade' })).toBeInTheDocument();
  });

  it('hero sem capacidade esconde a barra de preenchimento', () => {
    renderDashboard(<OverviewDashboard {...baseProps} capacidade={null} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  // DIAG-PAINEL-LACUNAS — "configure os lotes" era uma instrução que o
  // organizador tinha de traduzir sozinho em qual aba abrir.
  it('o alerta que nomeia um lugar do painel leva até ele', () => {
    const alerta: AlertaOperacional = {
      id: 'vitrine-nao-vende',
      severidade: 'critico',
      mensagem: 'A página pública está no ar mas NÃO vende.',
      acao: { label: 'Configurar lotes', href: '/eventos/meia-floripa-2026/lotes' },
    };
    renderDashboard(<OverviewDashboard {...baseProps} alertas={[alerta]} />);
    expect(screen.getByRole('link', { name: 'Configurar lotes' })).toHaveAttribute(
      'href',
      '/eventos/meia-floripa-2026/lotes',
    );
  });

  it('alerta sem destino não inventa botão', () => {
    const alerta: AlertaOperacional = {
      id: 'rascunho',
      severidade: 'aviso',
      mensagem: 'Evento em rascunho.',
    };
    renderDashboard(<OverviewDashboard {...baseProps} alertas={[alerta]} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // REV-PAINEL — o destino do alerta é UM controle, não dois empilhados.
  //
  // A primeira versão montou `<Link><Button/></Link>`, que gera `<a><button>`.
  // O `getByRole('link', { name })` acima passa nas DUAS formas — o nome
  // acessível do `<a>` vem do texto do botão de dentro —, então ele sozinho não
  // protege nada. O que quebrava de verdade era o teclado: dois pontos de
  // tabulação para uma ação só, e o PRIMEIRO deles um `<a>` sem classe alguma,
  // portanto sem anel de foco (WCAG 2.4.7). Estes casos travam a forma certa.
  // -------------------------------------------------------------------------
  const alertaComAcao: AlertaOperacional = {
    id: 'vitrine-nao-vende',
    severidade: 'critico',
    mensagem: 'A página pública está no ar mas NÃO vende.',
    acao: { label: 'Configurar lotes', href: '/eventos/meia-floripa-2026/lotes' },
  };

  it('o destino do alerta é UM ponto de tabulação, não dois', async () => {
    renderDashboard(<OverviewDashboard {...baseProps} alertas={[alertaComAcao]} />);
    const alerta = screen.getByRole('alert');
    const user = userEvent.setup();

    const paradas: Element[] = [];
    for (let i = 0; i < 4; i += 1) {
      await user.tab();
      const foco = document.activeElement;
      if (foco && alerta.contains(foco) && !paradas.includes(foco)) paradas.push(foco);
    }
    expect(paradas).toHaveLength(1);
  });

  it('o destino do alerta não aninha controle dentro de controle (HTML válido)', () => {
    renderDashboard(<OverviewDashboard {...baseProps} alertas={[alertaComAcao]} />);
    const link = screen.getByRole('link', { name: 'Configurar lotes' });
    // `<a>` não admite descendente interativo — era `<a><button>`.
    expect(link.querySelector('button, a, input, select, textarea')).toBeNull();
  });

  it('o destino do alerta carrega o anel de foco do botão (WCAG 2.4.7)', () => {
    renderDashboard(<OverviewDashboard {...baseProps} alertas={[alertaComAcao]} />);
    const link = screen.getByRole('link', { name: 'Configurar lotes' });
    // O elemento que RECEBE o foco é o mesmo que traz o estilo de foco.
    expect(link.className).toMatch(/focus-visible:ring/);
  });

  // REV-PAINEL · refluxo estreito. O jsdom NÃO faz layout: este caso trava o
  // CONTRATO que evita o estouro em 320px, não mede o pixel. O grupo de ações
  // é `shrink-0` e passou a valer ~135px (botão + badge + gaps); a mensagem é
  // texto e não encolhe abaixo da palavra mais longa. Sem o par
  // `flex-wrap`/`basis-full` a linha estoura a caixa e o contêiner de rolagem
  // devolve barra horizontal. A conferência em 320px real fica para o olho
  // humano (está no handoff).
  it('a linha do alerta refluí em tela estreita em vez de estourar a largura', () => {
    renderDashboard(<OverviewDashboard {...baseProps} alertas={[alertaComAcao]} />);
    const linha = screen.getByRole('alert');
    expect(linha.className).toMatch(/\bflex-wrap\b/);
    expect(linha.className).toMatch(/\bsm:flex-nowrap\b/);

    const mensagem = screen.getByText(alertaComAcao.mensagem);
    // `min-width:auto` é o que trava o encolhimento de um filho flex com texto.
    expect(mensagem.className).toMatch(/\bmin-w-0\b/);

    // `basis-full` é o que GARANTE a descida do grupo para a própria linha
    // abaixo de `sm` — mesmo mecanismo do slot de ações do PageHeader.
    const grupoAcoes = screen.getByRole('link', { name: 'Configurar lotes' }).parentElement;
    expect(grupoAcoes?.className).toMatch(/\bbasis-full\b/);
    expect(grupoAcoes?.className).toMatch(/\bsm:basis-auto\b/);
  });
});
