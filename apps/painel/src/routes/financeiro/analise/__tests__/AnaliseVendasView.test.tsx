// =============================================================================
// AnaliseVendasView (RN-820) — prova o desempenho (KPIs), a demografia REAL
// (agregado ∑ · LEELA-BEPEND-T1: gráficos, EmptyState honesto e nota de
// cobertura), e os estados §2.12 de modalidades/tamanhos.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OverviewResult } from '@leela/api-client';
import { AnaliseVendasView, type AnaliseVendasViewProps } from '../AnaliseVendasView';
import type { DemografiaTenant } from '../_lib/demografia';

const OVERVIEW: OverviewResult = {
  inscricoesTotais: 1284,
  inscricoesTrendPct: 12,
  receitaConfirmada: 84210,
  receitaTrendPct: null,
  vagasRestantes: 40,
  eventoEmRisco: null,
  taxaConversaoPct: 37,
  conversaoSparkline: [10, 20, 15, 30],
  membrosAtivosTotais: 0,
  desafiosAtivosTotais: 0,
  alerts: [],
  atualizadoEm: 0,
};

const DEMOGRAFIA: DemografiaTenant = {
  faixas: [
    { label: '18–24', value: 84 },
    { label: '25–29', value: 210 },
  ],
  sexo: [
    { label: 'Feminino', value: 150 },
    { label: 'Masculino', value: 144 },
  ],
  cohort: [
    {
      faixa: '18–24',
      total: 84,
      segmentos: [
        { label: 'Feminino', value: 40, colorIndex: 0 },
        { label: 'Masculino', value: 44, colorIndex: 1 },
      ],
    },
    {
      faixa: '25–29',
      total: 210,
      segmentos: [
        { label: 'Feminino', value: 110, colorIndex: 0 },
        { label: 'Masculino', value: 100, colorIndex: 1 },
      ],
    },
  ],
  cohortTemSupressao: false,
  comIdade: 294,
  comGenero: 294,
  totalConfirmados: 294,
};

const DEMOGRAFIA_VAZIA: DemografiaTenant = {
  faixas: [],
  sexo: [],
  cohort: [],
  cohortTemSupressao: false,
  comIdade: 0,
  comGenero: 0,
  totalConfirmados: 0,
};

function props(over: Partial<AnaliseVendasViewProps> = {}): AnaliseVendasViewProps {
  return {
    eventos: [
      { value: 'ev-1', label: 'Corrida da Serra' },
      { value: 'ev-2', label: 'Trail do Vale' },
    ],
    eventosLoading: false,
    eventoSelecionado: null,
    onEventoChange: vi.fn(),
    intervalo: undefined,
    onIntervaloChange: vi.fn(),
    desempenho: OVERVIEW,
    desempenhoLoading: false,
    desempenhoError: null,
    onRetryDesempenho: vi.fn(),
    demografia: DEMOGRAFIA,
    demografiaLoading: false,
    demografiaError: null,
    onRetryDemografia: vi.fn(),
    modalidades: [
      { label: '10k', value: 700 },
      { label: '5k', value: 500 },
    ],
    modalidadesLoading: false,
    modalidadesError: null,
    onRetryModalidades: vi.fn(),
    tamanhos: [{ label: 'M', value: 320 }],
    tamanhosLoading: false,
    tamanhosError: null,
    onRetryTamanhos: vi.fn(),
    ...over,
  };
}

describe('AnaliseVendasView', () => {
  it('desempenho: KPIs de inscrições, receita e conversão', () => {
    render(<AnaliseVendasView {...props()} />);
    expect(screen.getByText('Inscrições')).toBeInTheDocument();
    expect(screen.getByText('1.284')).toBeInTheDocument();
    expect(screen.getByText('Receita confirmada')).toBeInTheDocument();
    expect(screen.getByText('37%')).toBeInTheDocument(); // conversão
  });

  it('demografia com agregado real → gráficos de faixa etária e sexo', () => {
    render(<AnaliseVendasView {...props()} />);
    expect(screen.getByText('Faixa etária')).toBeInTheDocument();
    expect(screen.getByText('Sexo')).toBeInTheDocument();
    // Cobertura total ⇒ SEM nota de cobertura (nada a declarar).
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('demografia sem agregado → EmptyState honesto (nunca número inventado)', () => {
    render(<AnaliseVendasView {...props({ demografia: DEMOGRAFIA_VAZIA })} />);
    expect(screen.getByText('Sem dados demográficos ainda')).toBeInTheDocument();
    expect(screen.queryByText('Faixa etária')).not.toBeInTheDocument();
  });

  it('demografia com cobertura PARCIAL → nota declarada (§2.12)', () => {
    const parcial: DemografiaTenant = {
      ...DEMOGRAFIA,
      comIdade: 294,
      comGenero: 294,
      totalConfirmados: 300, // 6 confirmados sem dado demográfico
    };
    render(<AnaliseVendasView {...props({ demografia: parcial })} />);
    expect(screen.getByRole('note')).toHaveTextContent(/294 de 300/);
  });

  // Cohort idade×sexo (RN-822 · S-R9-02) ----------------------------------
  it('cohort com dados → card presente com faixas e tabela acessível', () => {
    render(<AnaliseVendasView {...props()} />);
    expect(screen.getByText('Idade × sexo (cohort)')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /cohort de compradores por faixa etária e sexo/i }),
    ).toBeInTheDocument();
    // Tabela equivalente carrega a semântica (valores por sexo). Escopo por
    // nome acessível — os charts do DS também têm tabelas sr-only.
    expect(
      screen.getByRole('table', { name: /cohort de compradores/i }),
    ).toHaveTextContent('Feminino: 110');
  });

  it('cohort sem nascimento (só sexo conhecido) → EmptyState do cohort, donut de sexo segue', () => {
    const soSexo: DemografiaTenant = {
      ...DEMOGRAFIA,
      faixas: [],
      cohort: [],
      comIdade: 0,
    };
    render(<AnaliseVendasView {...props({ demografia: soSexo })} />);
    expect(screen.getByText('Sem dados para o cohort')).toBeInTheDocument();
    expect(screen.getByText('Sexo')).toBeInTheDocument(); // donut 1D permanece
  });

  it('cohort com linha SUPRIMIDA → nota de privacidade (k mínimo) e detalhe retido', () => {
    const suprimido: DemografiaTenant = {
      ...DEMOGRAFIA,
      cohort: [
        { faixa: '18–24', total: 3, segmentos: null },
        { faixa: '25–29', total: 4, segmentos: null },
      ],
      cohortTemSupressao: true,
    };
    render(<AnaliseVendasView {...props({ demografia: suprimido })} />);
    expect(screen.getByText(/k-anonimato, mínimo 5 por grupo/i)).toBeInTheDocument();
    // Nenhum valor por sexo vaza — a tabela do cohort declara a retenção.
    const tabela = screen.getByRole('table', { name: /cohort de compradores/i });
    expect(tabela).not.toHaveTextContent('Feminino:');
    expect(tabela).toHaveTextContent('Detalhamento retido para proteger a privacidade');
  });

  it('erro na demografia → "Tentar novamente" chama o retry', () => {
    const onRetryDemografia = vi.fn();
    render(
      <AnaliseVendasView
        {...props({
          demografia: DEMOGRAFIA_VAZIA,
          demografiaError: new Error('x'),
          onRetryDemografia,
        })}
      />,
    );
    screen.getByRole('button', { name: /tentar novamente/i }).click();
    expect(onRetryDemografia).toHaveBeenCalledOnce();
  });

  it('conversão null → "—" honesto (nunca 0 falso)', () => {
    const semConv: OverviewResult = { ...OVERVIEW, taxaConversaoPct: null, conversaoSparkline: [] };
    render(<AnaliseVendasView {...props({ desempenho: semConv })} />);
    // Escopa ao KPI de Conversão (o "—" da % nas tabelas sr-only dos gráficos
    // também casa "—" — a asserção precisa ser específica do indicador).
    const kpiConversao = screen.getByText('Conversão').closest('div');
    expect(kpiConversao).toHaveTextContent('—');
  });

  it('modalidades vazias → EmptyState honesto', () => {
    render(<AnaliseVendasView {...props({ modalidades: [] })} />);
    expect(screen.getByText('Sem inscrições por modalidade')).toBeInTheDocument();
  });

  it('erro em tamanhos → "Tentar novamente" chama o retry', () => {
    const onRetryTamanhos = vi.fn();
    render(
      <AnaliseVendasView
        {...props({ tamanhos: [], tamanhosError: new Error('x'), onRetryTamanhos })}
      />,
    );
    // Só o bloco de tamanhos está em erro → um único botão de retry.
    screen.getByRole('button', { name: /tentar novamente/i }).click();
    expect(onRetryTamanhos).toHaveBeenCalledOnce();
  });

  // Filtro por evento (RN-821 · S-R9-01-T2) --------------------------------
  it('filtro por evento: Combobox com "Todos os eventos" default (agregado do tenant)', () => {
    render(<AnaliseVendasView {...props()} />);
    expect(
      screen.getByRole('button', { name: /filtrar a análise por evento/i }),
    ).toHaveTextContent('Todos os eventos');
  });

  it('filtro por evento: selecionar um evento chama onEventoChange com o id', async () => {
    const onEventoChange = vi.fn();
    const user = userEvent.setup();
    render(<AnaliseVendasView {...props({ onEventoChange })} />);
    await user.click(screen.getByRole('button', { name: /filtrar a análise por evento/i }));
    await user.click(await screen.findByText('Trail do Vale'));
    expect(onEventoChange).toHaveBeenCalledWith('ev-2');
  });

  it('filtro por evento: voltar a "Todos os eventos" chama onEventoChange com null', async () => {
    const onEventoChange = vi.fn();
    const user = userEvent.setup();
    render(<AnaliseVendasView {...props({ eventoSelecionado: 'ev-1', onEventoChange })} />);
    await user.click(screen.getByRole('button', { name: /filtrar a análise por evento/i }));
    await user.click(await screen.findByText('Todos os eventos'));
    expect(onEventoChange).toHaveBeenCalledWith(null);
  });

  // Seleção temporal (RN-821 · S-R9-01-T3) --------------------------------
  it('temporal: sem intervalo → sem nota de período (nada a declarar)', () => {
    render(<AnaliseVendasView {...props()} />);
    expect(screen.queryByText(/série por data/i)).not.toBeInTheDocument();
  });

  it('temporal: com intervalo → nota honesta de que agregados são snapshots (não recorta)', () => {
    render(<AnaliseVendasView {...props({ intervalo: { from: new Date('2026-01-01') } })} />);
    // Declara a lacuna: os números seguem o total acumulado, nada recortado por data.
    expect(screen.getByText(/não uma série por data/i)).toBeInTheDocument();
    expect(screen.getByText(/total acumulado/i)).toBeInTheDocument();
  });

  it('temporal: "Limpar período" chama onIntervaloChange(undefined)', async () => {
    const onIntervaloChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AnaliseVendasView
        {...props({ intervalo: { from: new Date('2026-01-01') }, onIntervaloChange })}
      />,
    );
    await user.click(screen.getByRole('button', { name: /limpar período/i }));
    expect(onIntervaloChange).toHaveBeenCalledWith(undefined);
  });
});
