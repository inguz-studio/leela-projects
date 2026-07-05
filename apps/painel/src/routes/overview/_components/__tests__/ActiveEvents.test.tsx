import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveEvents } from '../ActiveEvents';
import { derivarEventosAtivos } from '../../_lib/activeEvents';
import { mkEventoAtivo } from '../../_test/fixtures';

const views = () =>
  derivarEventosAtivos([
    mkEventoAtivo({ nome: 'Meia Maratona', slug: 'meia-floripa-2026', status: 'publicado', qtdInscritos: 453, capacidade: 500 }),
    mkEventoAtivo({ nome: 'Retiro', slug: 'retiro-serra', status: 'rascunho', qtdInscritos: 0, capacidade: null }),
  ]);

describe('ActiveEvents (S601-T1)', () => {
  it('lista eventos com 453/500, badges Publicado/Últimas vagas e Rascunho', () => {
    render(
      <ActiveEvents eventos={views()} loading={false} onGerenciar={vi.fn()} onNovoEvento={vi.fn()} />
    );
    expect(screen.getByText('453/500')).toBeInTheDocument();
    expect(screen.getByText('Publicado')).toBeInTheDocument();
    expect(screen.getByText('Últimas vagas')).toBeInTheDocument();
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
  });

  it('"Gerenciar" chama onGerenciar com o slug', async () => {
    const onGerenciar = vi.fn();
    render(
      <ActiveEvents eventos={views()} loading={false} onGerenciar={onGerenciar} onNovoEvento={vi.fn()} />
    );
    await userEvent.click(screen.getAllByRole('button', { name: 'Gerenciar' })[0]!);
    expect(onGerenciar).toHaveBeenCalledWith('meia-floripa-2026');
  });

  it('loading → skeleton (nunca spinner)', () => {
    render(<ActiveEvents eventos={null} loading onGerenciar={vi.fn()} onNovoEvento={vi.fn()} />);
    expect(screen.getByRole('status', { name: 'Carregando eventos' })).toBeInTheDocument();
  });

  it('sem eventos → EmptyState com CTA', () => {
    render(<ActiveEvents eventos={[]} loading={false} onGerenciar={vi.fn()} onNovoEvento={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Crie seu primeiro evento' })).toBeInTheDocument();
  });

  it('staff sem eventos → escopo individual, sem CTA "primeiro evento" (#16)', () => {
    render(
      <ActiveEvents eventos={[]} loading={false} contextoStaff onGerenciar={vi.fn()} onNovoEvento={vi.fn()} />
    );
    expect(screen.getByText('Você ainda não organiza eventos')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Crie seu primeiro evento' })
    ).not.toBeInTheDocument();
  });

  it('erro ≠ vazio ≠ carregando: erro mostra retry, nunca o CTA de criar (#03)', async () => {
    const onRetry = vi.fn();
    render(
      <ActiveEvents
        eventos={null}
        loading={false}
        error
        onRetry={onRetry}
        onGerenciar={vi.fn()}
        onNovoEvento={vi.fn()}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar seus eventos.');
    expect(screen.queryByRole('button', { name: 'Crie seu primeiro evento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Carregando eventos' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
