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
});
