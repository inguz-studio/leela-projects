import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NotFound } from '../NotFound';

// Integração leve: espelha o padrão de catch-all dos *Routes.tsx (um `path="*"`
// no fim das rotas) sem arrastar as páginas reais (dados/auth). Prova a copy
// canônica HANDOFF-07, as duas ações e a navegação da ação primária p/ `/`.
function montar(pathInicial: string): void {
  render(
    <MemoryRouter initialEntries={[pathInicial]}>
      <Routes>
        <Route path="/" element={<div>Visão Geral (home)</div>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NotFound (404 · Painel · S500-T2)', () => {
  it('caminho sem rota cai no 404 com copy canônica e as duas ações', () => {
    montar('/rota-que-nao-existe');
    expect(screen.getByRole('heading', { name: 'Essa página saiu para correr' })).toBeInTheDocument();
    expect(
      screen.getByText('O link que você seguiu não existe ou mudou de lugar.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir para a Visão Geral' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
  });

  it('foco inicial vai para a ação primária', () => {
    montar('/rota-que-nao-existe');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Ir para a Visão Geral' }),
    );
  });

  it('"Ir para a Visão Geral" navega para `/`', async () => {
    const user = userEvent.setup();
    montar('/rota-que-nao-existe');
    await user.click(screen.getByRole('button', { name: 'Ir para a Visão Geral' }));
    expect(screen.getByText('Visão Geral (home)')).toBeInTheDocument();
  });
});
