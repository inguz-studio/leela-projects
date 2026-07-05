import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecentRegistrations } from '../RecentRegistrations';
import { derivarInscricoesRecentes } from '../../_lib/recentRegistrations';
import { mkInscricao, ts } from '../../_test/fixtures';

describe('RecentRegistrations (S601-T2)', () => {
  it('lista inscritos com badge RN-204; pendente → "Pendente" não "Pago"', () => {
    const views = derivarInscricoesRecentes([
      mkInscricao({ id: '1', atletaNome: 'Marina Silva', status: 'confirmado', criadoEm: ts(new Date('2026-04-18T00:00:00Z')) }),
      mkInscricao({ id: '2', atletaNome: 'João Souza', status: 'pendente', criadoEm: ts(new Date('2026-04-17T00:00:00Z')) }),
      mkInscricao({ id: '3', atletaNome: 'Ana Lima', status: 'cancelado', criadoEm: ts(new Date('2026-04-16T00:00:00Z')) }),
    ]);
    render(<RecentRegistrations inscricoes={views} loading={false} />);
    expect(screen.getByText('Marina Silva')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Recusado')).toBeInTheDocument();
    expect(screen.queryByText('João Souza')?.closest('li')).not.toHaveTextContent('Pago');
  });

  it('loading → skeleton', () => {
    render(<RecentRegistrations inscricoes={null} loading />);
    expect(screen.getByRole('status', { name: 'Carregando inscrições' })).toBeInTheDocument();
  });

  it('vazio → mensagem', () => {
    render(<RecentRegistrations inscricoes={[]} loading={false} />);
    expect(screen.getByText('Nenhuma inscrição recente.')).toBeInTheDocument();
  });

  it('lista populada rotula a degradação de recência (#13); vazio não rotula', () => {
    const views = derivarInscricoesRecentes([mkInscricao({ id: '1', atletaNome: 'Marina Silva' })]);
    const { rerender } = render(<RecentRegistrations inscricoes={views} loading={false} />);
    expect(
      screen.getByText('Amostra por evento, não a ordem de chegada completa.')
    ).toBeInTheDocument();
    rerender(<RecentRegistrations inscricoes={[]} loading={false} />);
    expect(
      screen.queryByText('Amostra por evento, não a ordem de chegada completa.')
    ).not.toBeInTheDocument();
  });

  it('erro → mostra erro com retry, nunca skeleton eterno nem "nenhuma" (#39)', async () => {
    const onRetry = vi.fn();
    render(<RecentRegistrations inscricoes={null} loading={false} error onRetry={onRetry} />);
    expect(screen.getByText('Não foi possível carregar as inscrições.')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma inscrição recente.')).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Carregando inscrições' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
