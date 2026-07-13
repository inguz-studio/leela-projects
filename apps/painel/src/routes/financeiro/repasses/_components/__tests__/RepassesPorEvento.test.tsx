// =============================================================================
// RepassesPorEvento (RN-349) — estados §2.12: carregando, erro + "Tentar
// novamente", vazio honesto, e as linhas com "—" no evento sem termo.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RepassesPorEvento } from '../RepassesPorEvento';
import type { LinhaRepasseEvento } from '../../_lib/repassesPorEvento';

const LINHAS: LinhaRepasseEvento[] = [
  {
    eventoId: 'a',
    nome: 'Corrida do Sol',
    slug: 'corrida-do-sol',
    encerrado: false,
    vendido: 12000,
    retido: 1500,
    disponivelEstimado: 8500,
    semTermo: false,
  },
  {
    eventoId: 'b',
    nome: 'Trail da Serra',
    slug: 'trail-da-serra',
    encerrado: true,
    vendido: 5000,
    retido: null,
    disponivelEstimado: null,
    semTermo: true,
  },
];

describe('RepassesPorEvento', () => {
  it('carregando → status acessível, sem tabela', () => {
    render(<RepassesPorEvento linhas={[]} loading error={null} onRetry={vi.fn()} />);
    expect(screen.getByRole('status', { name: 'Carregando repasse por evento' })).toBeInTheDocument();
  });

  it('erro → mensagem + botão "Tentar novamente" chama onRetry', () => {
    const onRetry = vi.fn();
    render(
      <RepassesPorEvento linhas={[]} loading={false} error={new Error('x')} onRetry={onRetry} />,
    );
    const btn = screen.getByRole('button', { name: /tentar novamente/i });
    btn.click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('vazio → EmptyState honesto (nenhum evento com movimento)', () => {
    render(<RepassesPorEvento linhas={[]} loading={false} error={null} onRetry={vi.fn()} />);
    expect(screen.getByText('Nenhum evento com movimento')).toBeInTheDocument();
  });

  it('linhas → nomes, valores e "—" no evento sem termo; badge Encerrado', () => {
    render(<RepassesPorEvento linhas={LINHAS} loading={false} error={null} onRetry={vi.fn()} />);
    expect(screen.getByText('Corrida do Sol')).toBeInTheDocument();
    expect(screen.getByText('Trail da Serra')).toBeInTheDocument();
    // Evento sem termo: retido e disponível estimado saem como "—".
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    // Evento encerrado ganha o badge.
    expect(screen.getByText('Encerrado')).toBeInTheDocument();
  });
});
