import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from '../AppShell';

describe('AppShell', () => {
  it('renders main content landmark', () => {
    render(
      <AppShell sidebar={<nav aria-label="sidebar">Nav</nav>}>
        <p>Conteúdo</p>
      </AppShell>,
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders sidebar content (rail)', () => {
    render(
      <AppShell sidebar={<nav aria-label="sidebar">Nav</nav>}>
        <p>Conteúdo</p>
      </AppShell>,
    );
    // Drawer fechado por padrão: só o rail renderiza a Sidebar (uma nav).
    expect(screen.getByRole('navigation', { name: 'sidebar' })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // REV-SCROLL-RET — a metade da trava de rolagem que não é `overflow-*`.
  //
  // `overflow-hidden` no `<main>` só recorta descendente cujo bloco de contenção
  // seja o próprio `<main>` (ou um filho dele). Um `position:absolute` com todos
  // os ancestrais `static` — o `.sr-only` da `Pagination`, da `Table` e do
  // `Stepper` — escapa para o bloco de contenção inicial, o `<html>`, e estica o
  // scrollHeight do DOCUMENTO. Aí nasce uma segunda barra vertical ao lado da
  // barra da página: o "scroll duplo" que nenhum conserto de eixo alcança,
  // porque a causa é o bloco de contenção.
  //
  // jsdom não faz layout — isto é contrato de estilo, igual ao resto da família.
  // ---------------------------------------------------------------------------
  it('o `main` é bloco de contenção: absoluto de dentro não escapa para o documento', () => {
    render(
      <AppShell sidebar={<div>nav</div>}>
        <p>Conteúdo</p>
      </AppShell>,
    );
    const main = screen.getByRole('main');
    expect(main).toHaveClass('relative');
    // O par: sem `overflow-hidden` o `relative` não recorta nada, e sem
    // `relative` o `overflow-hidden` não alcança o absoluto. Os dois ou nenhum.
    expect(main).toHaveClass('overflow-hidden');
  });

  it('renders children inside main', () => {
    render(
      <AppShell sidebar={<div>nav</div>}>
        <p>Página principal</p>
      </AppShell>,
    );
    const main = screen.getByRole('main');
    expect(main).toContainElement(screen.getByText('Página principal'));
  });

  it('accepts custom className', () => {
    const { container } = render(
      <AppShell sidebar={<div>nav</div>} className="test-shell">
        <p>Content</p>
      </AppShell>,
    );
    expect(container.firstChild).toHaveClass('test-shell');
  });

  // ── Responsivo (LEELA-RESP-M1-T2) ─────────────────────────────────────────

  it('mostra um hambúrguer com nome acessível (affordance do drawer — gate Norman)', () => {
    render(
      <AppShell sidebar={<nav aria-label="sidebar">Nav</nav>}>
        <p>c</p>
      </AppShell>,
    );
    expect(screen.getByRole('button', { name: 'Abrir menu de navegação' })).toBeInTheDocument();
  });

  it('o hambúrguer abre o drawer com a MESMA Sidebar off-canvas', async () => {
    render(
      <AppShell sidebar={<nav aria-label="sidebar">Nav</nav>}>
        <p>c</p>
      </AppShell>,
    );
    // Fechado: sem dialog.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }));
    const dialog = screen.getByRole('dialog', { name: 'Menu de navegação' });
    expect(within(dialog).getByRole('navigation', { name: 'sidebar' })).toBeInTheDocument();
  });

  it('drawer fecha ao clicar em um item de navegação (borbulha do conteúdo)', async () => {
    render(
      <AppShell
        sidebar={
          <nav aria-label="sidebar">
            <a href="#eventos">Eventos</a>
          </nav>
        }
      >
        <p>c</p>
      </AppShell>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Clicar num link do drawer (navegação) fecha o drawer.
    await userEvent.click(within(screen.getByRole('dialog')).getByText('Eventos'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('rótulos acessíveis do menu/drawer são customizáveis', async () => {
    render(
      <AppShell
        sidebar={<nav aria-label="sidebar">Nav</nav>}
        menuLabel="Abrir navegação"
        drawerLabel="Navegação do painel"
      >
        <p>c</p>
      </AppShell>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Abrir navegação' }));
    expect(screen.getByRole('dialog', { name: 'Navegação do painel' })).toBeInTheDocument();
  });
});
