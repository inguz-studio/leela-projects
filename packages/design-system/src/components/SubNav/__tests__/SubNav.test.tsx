import { describe, it, expect, vi } from 'vitest';
import type * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubNav } from '../SubNav';
import type { SubNavTab } from '../SubNav';

const tabs: SubNavTab[] = [
  { id: 'overview', label: 'Visão Geral', active: true, onClick: vi.fn() },
  { id: 'inscricoes', label: 'Inscrições', count: 42, onClick: vi.fn() },
  { id: 'kits', label: 'Kits', onClick: vi.fn() },
];

describe('SubNav', () => {
  it('renders nav landmark with default aria-label', () => {
    render(<SubNav tabs={tabs} />);
    expect(
      screen.getByRole('navigation', { name: 'Navegação de seções' }),
    ).toBeInTheDocument();
  });

  it('renders all tabs as list items', () => {
    render(<SubNav tabs={tabs} />);
    expect(screen.getAllByRole('listitem').length).toBe(3);
  });

  it('is flat by default — sem divisória (decisão Vitor 2026-07-11)', () => {
    render(<SubNav tabs={tabs} />);
    expect(screen.getByRole('navigation')).not.toHaveClass('border-b');
  });

  it('divider opts into a divisória (RN-229 · S-R9-10, padrão Comunicação)', () => {
    render(<SubNav tabs={tabs} divider />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('border-b');
    expect(nav).toHaveClass('border-b-[var(--border-subtle)]');
  });

  it('rola horizontalmente por dentro em telas estreitas (Adendo 12 — tablet/mobile)', () => {
    // As terciárias de evento têm N abas que estouravam a largura em
    // tablet/mobile; a barra rola por dentro (overflow-x-auto) em vez de
    // quebrar, sem arrastar o scroll da página (overscroll-x-contain).
    render(<SubNav tabs={tabs} />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('overflow-x-auto');
    expect(nav).toHaveClass('overscroll-x-contain');
    // A lista mantém a largura do conteúdo (w-max) para as abas não comprimirem.
    expect(screen.getByRole('list')).toHaveClass('w-max');
  });

  // -------------------------------------------------------------------------
  // TRAVA DE REGRESSÃO — barras de rolagem no menu secundário (frente F).
  //
  // Este é o SEGUNDO pedido do mesmo defeito: a primeira rodada (Adendo 12)
  // consertou a quebra de layout e deixou as barras. Elas nascem em cascata —
  // a lista `w-max` estoura a largura → `overflow-x: auto` desenha a barra
  // horizontal → no Windows/Chrome ela é clássica e come altura → a lista de
  // altura fixa sobra no eixo Y → o eixo `visible` restante vira `auto` e
  // aparece a barra vertical.
  //
  // jsdom não faz layout, então a trava é de CONTRATO DE ESTILO: no dia em que
  // alguém tirar uma destas quatro classes, este teste cai e diz por quê. Ler
  // junto com a nota da causa-raiz em SubNav.tsx.
  // -------------------------------------------------------------------------
  it('não mostra barra de rolagem nenhuma em tablet/celular — nem horizontal, nem vertical (frente F)', () => {
    render(<SubNav tabs={tabs} />);
    const nav = screen.getByRole('navigation');

    // 1. o scroll horizontal CONTINUA existindo (as abas que não cabem seguem
    //    alcançáveis por gesto/trackpad e pelas setas ←/→);
    expect(nav).toHaveClass('overflow-x-auto');
    // 2. mas sem cromo: `scrollbar-width: none` (padrão/Firefox) e
    //    `::-webkit-scrollbar { display: none }` (Chrome/Edge/Safari). Sem a
    //    barra clássica, nenhum pixel de altura é roubado;
    expect(nav).toHaveClass('[scrollbar-width:none]');
    expect(nav).toHaveClass('[&::-webkit-scrollbar]:hidden');
    // 3. e o eixo vertical é fechado explicitamente, para nunca voltar a ser
    //    promovido a `auto` pelo eixo horizontal.
    expect(nav).toHaveClass('overflow-y-hidden');

    // Guarda contra o "conserto" errado: esconder o eixo X cortaria as abas que
    // não cabem — exatamente o que o Adendo 12 existiu para evitar.
    expect(nav).not.toHaveClass('overflow-x-hidden');
  });

  // -------------------------------------------------------------------------
  // REV-LOTES · o BURACO da trava acima (achado #3).
  //
  // O teste anterior renderiza SEM `className` e por isso passava por cima do
  // caminho mais provável de reincidência: `cn` é `twMerge`, que resolve
  // conflito pelo ÚLTIMO da lista. Com a trava vindo ANTES do `className`, um
  // consumidor que passasse `overflow-y-auto` apagava `overflow-y-hidden` em
  // silêncio — a barra vertical voltava e a suíte seguia verde. Provado com o
  // próprio twMerge:
  //   twMerge('… overflow-y-hidden', 'overflow-y-auto') → 'overflow-y-auto'
  // A trava agora vem DEPOIS do `className` e vence. Estes testes são o que
  // impede alguém de "arrumar o layout" de fora e ressuscitar o defeito.
  // -------------------------------------------------------------------------
  it.each([
    ['overflow-y-auto', 'a barra vertical de volta'],
    ['overflow-auto', 'as duas barras de volta'],
    ['[scrollbar-width:auto]', 'o cromo da barra de volta'],
    ['overflow-x-hidden', 'as abas que não cabem inalcançáveis'],
  ])('className="%s" NÃO derruba a trava (senão: %s)', (override) => {
    render(<SubNav tabs={tabs} className={override} />);
    const nav = screen.getByRole('navigation');

    expect(nav).toHaveClass('overflow-x-auto');
    expect(nav).toHaveClass('[scrollbar-width:none]');
    expect(nav).toHaveClass('[&::-webkit-scrollbar]:hidden');
    expect(nav).toHaveClass('overflow-y-hidden');
    expect(nav).not.toHaveClass('overflow-x-hidden');
    expect(nav).not.toHaveClass('overflow-y-auto');
    expect(nav).not.toHaveClass('[scrollbar-width:auto]');
  });

  it('o que NÃO é eixo continua sobrescrevível pelo consumidor', () => {
    render(<SubNav tabs={tabs} className="px-[var(--spacing-6)]" />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('px-[var(--spacing-6)]');
    expect(nav).not.toHaveClass('px-[var(--subnav-px)]');
    // …e a trava segue de pé ao lado.
    expect(nav).toHaveClass('overflow-y-hidden');
  });

  it('active tab has aria-current="page"', () => {
    render(<SubNav tabs={tabs} />);
    const active = screen.getByRole('button', { name: /Visão Geral/i });
    expect(active).toHaveAttribute('aria-current', 'page');
  });

  it('inactive tabs do not have aria-current', () => {
    render(<SubNav tabs={tabs} />);
    const inactive = screen.getByRole('button', { name: /Inscrições/i });
    expect(inactive).not.toHaveAttribute('aria-current');
  });

  it('renders count pill when tab has count', () => {
    render(<SubNav tabs={tabs} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('count pill uses pill tokens (bg-surface-raised sobre o fundo plano)', () => {
    render(<SubNav tabs={tabs} />);
    const pill = screen.getByText('42');
    // Pill inverte a elevação (raised sobre base) p/ não sumir no fundo plano.
    expect(pill.className).toContain('bg-[var(--surface-raised)]');
    expect(pill.className).toContain('h-[var(--subnav-pill-height)]');
  });

  it('calls onClick when tab is clicked', async () => {
    const onClick = vi.fn();
    const tabsWithClick: SubNavTab[] = [
      { id: 'overview', label: 'Visão Geral', active: true },
      { id: 'inscricoes', label: 'Inscrições', onClick },
    ];
    render(<SubNav tabs={tabsWithClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Inscrições' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders anchor when href is provided', () => {
    const tabsWithHref: SubNavTab[] = [
      { id: 'overview', label: 'Visão Geral', href: '/eventos/1', active: true },
    ];
    render(<SubNav tabs={tabsWithHref} />);
    const link = screen.getByRole('link', { name: 'Visão Geral' });
    expect(link).toHaveAttribute('href', '/eventos/1');
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  // -------------------------------------------------------------------------
  // LEELA-NAVFIX-T1 — o onClick encaminha o MouseEvent e o href sobrevive.
  // Sem o evento em mãos o consumidor não consegue interceptar nem se quiser:
  // era isso que fazia cada aba do painel recarregar o documento inteiro.
  // -------------------------------------------------------------------------

  it('href + onClick: o handler recebe o MouseEvent e o href continua no DOM', async () => {
    const recebido: unknown[] = [];
    const tabsSpa: SubNavTab[] = [
      { id: 'overview', label: 'Visão Geral', href: '/eventos/1', active: true },
      {
        id: 'inscritos',
        label: 'Inscrições',
        href: '/eventos/1/inscritos',
        onClick: (event) => {
          recebido.push(event);
          event.preventDefault();
        },
      },
    ];
    render(<SubNav tabs={tabsSpa} />);
    const link = screen.getByRole('link', { name: 'Inscrições' });
    await userEvent.click(link);

    expect(recebido).toHaveLength(1);
    const event = recebido[0] as React.MouseEvent;
    expect(typeof event.preventDefault).toBe('function');
    expect(event.defaultPrevented).toBe(true);
    // O href é a razão de manter a âncora: ctrl+clique, clique do meio e
    // "copiar endereço do link" continuam existindo.
    expect(link).toHaveAttribute('href', '/eventos/1/inscritos');
  });

  it('sem href, o botão também encaminha o MouseEvent', async () => {
    const recebido: unknown[] = [];
    render(
      <SubNav
        tabs={[{ id: 'a', label: 'A', onClick: (event) => recebido.push(event) }]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(recebido).toHaveLength(1);
    expect(typeof (recebido[0] as React.MouseEvent).preventDefault).toBe('function');
  });

  it('all tabs are reachable via Tab key (no roving tabindex)', async () => {
    render(<SubNav tabs={tabs} />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /Visão Geral/i })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /Inscrições/i })).toHaveFocus();
  });

  it('is keyboard navigable even when no tab is active', async () => {
    const noActive: SubNavTab[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    render(<SubNav tabs={noActive} />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'A' })).toHaveFocus();
  });

  it('supports arrow key navigation', async () => {
    render(<SubNav tabs={tabs} />);
    screen.getByRole('button', { name: /Visão Geral/i }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /Inscrições/i })).toHaveFocus();
  });

  it('wraps arrow navigation at the ends', async () => {
    const twoTabs: SubNavTab[] = [
      { id: 'a', label: 'A', active: true },
      { id: 'b', label: 'B' },
    ];
    render(<SubNav tabs={twoTabs} />);
    screen.getByRole('button', { name: 'B' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'A' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: 'B' })).toHaveFocus();
  });

  it('container é plano (bg-surface-base + px token, SEM border-b) — Vitor 2026-07-11', () => {
    render(<SubNav tabs={tabs} />);
    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('bg-[var(--surface-base)]');
    expect(nav.className).toContain('px-[var(--subnav-px)]');
    // Plano: sem divisor inferior; o sublinhado da aba ativa é o único indicador.
    expect(nav.className).not.toContain('border-b');
  });
});
