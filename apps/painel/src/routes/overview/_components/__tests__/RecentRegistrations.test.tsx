import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
