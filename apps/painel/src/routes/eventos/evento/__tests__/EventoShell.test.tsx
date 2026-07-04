import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventoShell } from '../EventoShell';
import { mkEvento } from '../../_test/fixtures';

describe('EventoShell', () => {
  it('renderiza header 96px com nome e badge de status', () => {
    render(
      <EventoShell evento={mkEvento()} ativa="overview">
        <p>conteúdo</p>
      </EventoShell>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /Meia Maratona Floripa 2026/i })).toBeInTheDocument();
    expect(screen.getByText('Publicado')).toBeInTheDocument();
    expect(screen.getByText('453 inscritos')).toBeInTheDocument();
  });

  it('marca a aba ativa da sub-nav com aria-current', () => {
    render(
      <EventoShell evento={mkEvento()} ativa="inscritos">
        <p>conteúdo</p>
      </EventoShell>,
    );
    const inscritos = screen.getByRole('link', { name: /Inscritos/i });
    expect(inscritos).toHaveAttribute('aria-current', 'page');
    const overview = screen.getByRole('link', { name: 'Visão geral' });
    expect(overview).not.toHaveAttribute('aria-current');
  });

  it('mostra o contador pill de inscritos na sub-nav', () => {
    render(
      <EventoShell evento={mkEvento({ qtdInscritos: 453 })} ativa="overview">
        <p>c</p>
      </EventoShell>,
    );
    // O pill da sub-nav mostra "453" isolado (o metadata do header é "453 inscritos").
    expect(screen.getByText('453')).toBeInTheDocument();
  });

  it('renderiza o conteúdo (children)', () => {
    render(
      <EventoShell evento={mkEvento()} ativa="overview">
        <p>conteúdo do overview</p>
      </EventoShell>,
    );
    expect(screen.getByText('conteúdo do overview')).toBeInTheDocument();
  });
});
