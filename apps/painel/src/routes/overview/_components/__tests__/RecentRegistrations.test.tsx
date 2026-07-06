import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecentRegistrations } from '../RecentRegistrations';
import { derivarInscricoesRecentes } from '../../_lib/recentRegistrations';
import { mkInscricao, ts } from '../../_test/fixtures';

const AGORA = new Date('2026-04-18T15:00:00');

describe('RecentRegistrations (S601-T2 · T6 tabela 6 colunas)', () => {
  it('renderiza TABELA com as 6 colunas do mockup (a queixa nº 1)', () => {
    const views = derivarInscricoesRecentes(
      [mkInscricao({ id: '1', atletaNome: 'Marina Silva' })],
      5,
      AGORA
    );
    render(<RecentRegistrations inscricoes={views} loading={false} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    for (const header of ['Atleta', 'Evento', 'Modalidade', 'Valor', 'Status', 'Data']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
  });

  it('badge RN-204 por linha; pendente → "Pendente" não "Pago"', () => {
    const views = derivarInscricoesRecentes(
      [
        mkInscricao({ id: '1', atletaNome: 'Marina Silva', status: 'confirmado', criadoEm: ts(new Date('2026-04-18T10:00:00')) }),
        mkInscricao({ id: '2', atletaNome: 'João Souza', status: 'pendente', criadoEm: ts(new Date('2026-04-17T10:00:00')) }),
        mkInscricao({ id: '3', atletaNome: 'Ana Lima', status: 'cancelado', criadoEm: ts(new Date('2026-04-16T10:00:00')) }),
      ],
      5,
      AGORA
    );
    render(<RecentRegistrations inscricoes={views} loading={false} />);
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Recusado')).toBeInTheDocument();
    expect(screen.getByText('João Souza').closest('tr')).not.toHaveTextContent('Pago');
  });

  it('Atleta com avatar (iniciais) + coluna Data "Hoje/Ontem · hh:mm"', () => {
    const views = derivarInscricoesRecentes(
      [
        mkInscricao({ id: '1', atletaNome: 'Marina Silva', criadoEm: ts(new Date('2026-04-18T14:22:00')) }),
        mkInscricao({ id: '2', atletaNome: 'João Souza', criadoEm: ts(new Date('2026-04-17T19:58:00')) }),
      ],
      5,
      AGORA
    );
    render(<RecentRegistrations inscricoes={views} loading={false} />);
    expect(screen.getByRole('img', { name: 'Marina Silva' })).toBeInTheDocument();
    expect(screen.getByText('Hoje · 14:22')).toBeInTheDocument();
    expect(screen.getByText('Ontem · 19:58')).toBeInTheDocument();
  });

  it('Valor: preço do percurso em mono/tabular; sem preço → "—" honesto', () => {
    const views = derivarInscricoesRecentes(
      [
        mkInscricao({ id: '1', atletaNome: 'Com Preço', valor: 189 }),
        mkInscricao({ id: '2', atletaNome: 'Sem Preço', valor: null, criadoEm: ts(new Date('2026-04-17T10:00:00')) }),
      ],
      5,
      AGORA
    );
    render(<RecentRegistrations inscricoes={views} loading={false} />);
    // NBSP do Intl entre "R$" e o número
    expect(screen.getByText(/R\$\s189,00/)).toBeInTheDocument();
    expect(screen.getByText('Sem Preço').closest('tr')).toHaveTextContent('—');
  });

  it('section-link "Ver todas" navega', async () => {
    const onVerTodas = vi.fn();
    const views = derivarInscricoesRecentes([mkInscricao({ id: '1' })], 5, AGORA);
    render(<RecentRegistrations inscricoes={views} loading={false} onVerTodas={onVerTodas} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver todas' }));
    expect(onVerTodas).toHaveBeenCalledOnce();
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
    const views = derivarInscricoesRecentes([mkInscricao({ id: '1', atletaNome: 'Marina Silva' })], 5, AGORA);
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
