import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverviewShell } from '../OverviewShell';

describe('OverviewShell (S600-T1)', () => {
  it('mostra a saudação do produtor e o item "Visão Geral" ativo', () => {
    render(
      <OverviewShell nome="Marina Castelo" onNavigate={vi.fn()}>
        <div>conteúdo</div>
      </OverviewShell>
    );
    expect(
      screen.getByText('Olá, Marina — aqui está o resumo das suas operações.')
    ).toBeInTheDocument();

    // "Visão Geral" também é o título da PageHeader — desambiguar pela nav.
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    const visaoGeral = within(nav).getByText('Visão Geral').closest('a,button');
    expect(visaoGeral).toHaveAttribute('aria-current', 'page');
  });

  it('clicar em "Eventos" navega para /eventos', async () => {
    const onNavigate = vi.fn();
    render(
      <OverviewShell nome={null} onNavigate={onNavigate}>
        <div />
      </OverviewShell>
    );
    await userEvent.click(screen.getByText('Eventos'));
    expect(onNavigate).toHaveBeenCalledWith('/eventos');
  });
});
