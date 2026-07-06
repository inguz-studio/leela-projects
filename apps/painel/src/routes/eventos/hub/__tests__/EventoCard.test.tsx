import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventoCard } from '../EventoCard';
import { mkEvento } from '../../_test/fixtures';

describe('EventoCard', () => {
  it('mostra nome, status e contador de inscritos', () => {
    render(<EventoCard evento={mkEvento()} onAbrir={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Meia Maratona Floripa 2026/i })).toBeInTheDocument();
    expect(screen.getByText('Publicado')).toBeInTheDocument();
    expect(screen.getByText('453 inscritos')).toBeInTheDocument();
  });

  it('reflete o status rascunho', () => {
    render(<EventoCard evento={mkEvento({ status: 'rascunho' })} onAbrir={vi.fn()} />);
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
  });

  it('chama onAbrir com o slug ao clicar', async () => {
    const onAbrir = vi.fn();
    render(<EventoCard evento={mkEvento()} onAbrir={onAbrir} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onAbrir).toHaveBeenCalledWith('meia-floripa-2026');
  });

  // QA m2: a lista de eventos sinaliza esgotamento quando a capacidade é conhecida.
  it('evento lotado (capacidade conhecida) mostra badge "Esgotado"', () => {
    render(
      <EventoCard
        evento={mkEvento({ qtdInscritos: 60, capacidade: 60 })}
        onAbrir={vi.fn()}
      />
    );
    expect(screen.getByText('Esgotado')).toBeInTheDocument();
  });

  it('sem capacidade conhecida não afirma esgotamento', () => {
    render(
      <EventoCard
        evento={mkEvento({ qtdInscritos: 999, capacidade: null })}
        onAbrir={vi.fn()}
      />
    );
    expect(screen.queryByText('Esgotado')).not.toBeInTheDocument();
  });
});
