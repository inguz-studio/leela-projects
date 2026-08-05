import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

const baseProps = {
  dias: 8,
  dataLinha: 'Domingo, 27 de abril · 06:00',
  qtdInscritos: 453,
  capacidade: 600,
  receitaConfirmada: 85617,
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
        qtdInscritos={453}
        receitaConfirmada={85617}
        receitaSemana={12400}
        taxaConversaoPct={42}
        repassePrevisto={76602}
        taxaPct={10.5}
      />,
    );
    expect(screen.getByText(/85\.617/)).toBeInTheDocument();
    expect(screen.getByText('Taxa de conversão')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('Repasse previsto')).toBeInTheDocument();
    expect(screen.getByText(/76\.602/)).toBeInTheDocument();
    expect(screen.getByText('Aguardando encerramento')).toBeInTheDocument();
  });

  it('degrada honesto: sem conversão/repasse mostra "—"', () => {
    render(<OverviewKpis qtdInscritos={0} receitaConfirmada={0} />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
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
});
