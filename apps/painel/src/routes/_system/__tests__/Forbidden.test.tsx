import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Forbidden } from '../Forbidden';

function montar(): void {
  render(
    <MemoryRouter>
      <Forbidden />
    </MemoryRouter>,
  );
}

describe('Forbidden (403 · Painel · S501-T1)', () => {
  it('mostra a copy canônica HANDOFF-07 e as duas ações', () => {
    montar();
    expect(screen.getByRole('heading', { name: 'Esse espaço ainda não é seu' })).toBeInTheDocument();
    expect(screen.getByText('Você não tem permissão para ver esta área.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Falar com o organizador' })).toBeInTheDocument();
  });

  it('"Falar com o organizador" é um mailto (ação nunca morta — decisão #7)', () => {
    montar();
    const contato = screen.getByRole('link', { name: 'Falar com o organizador' });
    expect(contato.getAttribute('href')).toMatch(/^mailto:/);
  });

  it('não tem role="alert" (403 não é severidade de erro)', () => {
    montar();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
