// =============================================================================
// AnaliseVendasView (RN-820) — prova o desempenho (KPIs), a nota honesta de
// dados de exemplo na demografia, e os estados §2.12 de modalidades/tamanhos.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { OverviewResult } from '@leela/api-client';
import { AnaliseVendasView, type AnaliseVendasViewProps } from '../AnaliseVendasView';

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

function props(over: Partial<AnaliseVendasViewProps> = {}): AnaliseVendasViewProps {
  return {
    desempenho: OVERVIEW,
    desempenhoLoading: false,
    desempenhoError: null,
    onRetryDesempenho: vi.fn(),
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

  it('demografia SEMPRE carrega a nota honesta de dados de exemplo', () => {
    render(<AnaliseVendasView {...props()} />);
    expect(screen.getByRole('note')).toHaveTextContent(/dados de exemplo/i);
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
});
