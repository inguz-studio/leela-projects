/**
 * SidebarRail — anatomia do rail flutuante do protótipo (lane HIFI-REC).
 *
 * O que se afirma aqui é o CONTRATO do protótipo: nasce fechado (84px), o
 * toggle alterna largura e anuncia estado (`aria-expanded` + nome que troca),
 * fechado o rótulo continua acessível (sr-only) e o tooltip existe decorativo,
 * aberto o rótulo entra no fluxo e o badge aparece, item ativo carrega
 * `aria-current` + o glow da marca, e as medidas vêm de token — nunca literal.
 */

import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LayoutDashboard, Ticket } from 'lucide-react';
import { SidebarRail, railNavIcon } from '../SidebarRail';

const ITEMS = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    icon: railNavIcon(LayoutDashboard),
    href: '/',
    active: true,
  },
  {
    id: 'eventos',
    label: 'Eventos',
    icon: railNavIcon(Ticket),
    href: '/eventos',
    badge: 2,
  },
];

function renderRail(props: Partial<React.ComponentProps<typeof SidebarRail>> = {}) {
  return render(
    <SidebarRail
      items={ITEMS}
      footerName="Vitor Piagge"
      footerSubtitle="Ver perfil"
      {...props}
    />,
  );
}

describe('SidebarRail — estado fechado (default do protótipo)', () => {
  it('nasce fechado: largura 84 por token e data-rail-open="0"', () => {
    renderRail();
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(nav.getAttribute('data-rail-open')).toBe('0');
    expect(nav.className).toContain('w-[var(--rail-width)]');
    expect(nav.className).not.toContain('w-[var(--rail-width-open)]');
  });

  it('rótulo continua no nome acessível mesmo sem texto visível', () => {
    renderRail();
    expect(screen.getByRole('link', { name: 'Visão Geral' })).toBeTruthy();
  });

  it('tooltip decorativo por item (aria-hidden, como o [data-rail-tip] do protótipo)', () => {
    const { container } = renderRail();
    const tips = container.querySelectorAll('[data-rail-tip]');
    expect(tips.length).toBe(2);
    for (const tip of tips) {
      expect(tip.getAttribute('aria-hidden')).toBe('true');
      expect(tip.className).toContain('left-[calc(100%+var(--rail-tip-gap))]');
    }
  });

  it('badge NÃO aparece fechado (protótipo: display none)', () => {
    renderRail();
    expect(screen.queryByText('2')).toBeNull();
  });

  it('toggle anuncia "Abrir menu" com aria-expanded=false', () => {
    renderRail();
    const toggle = screen.getByRole('button', { name: 'Abrir menu' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('SidebarRail — abrir/fechar', () => {
  it('clicar no toggle abre: largura 248, rótulo visível, badge presente', () => {
    renderRail();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(nav.getAttribute('data-rail-open')).toBe('1');
    expect(nav.className).toContain('w-[var(--rail-width-open)]');
    expect(screen.getByText('2')).toBeTruthy();

    const toggle = screen.getByRole('button', { name: 'Recolher menu' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('aberto NÃO renderiza tooltip (protótipo: display none com rail aberto)', () => {
    const { container } = renderRail({ defaultOpen: true });
    expect(container.querySelectorAll('[data-rail-tip]').length).toBe(0);
  });
});

describe('SidebarRail — item ativo e rodapé', () => {
  it('ativo: aria-current="page" + action-primary + glow da marca', () => {
    renderRail();
    const ativo = screen.getByRole('link', { name: 'Visão Geral' });
    expect(ativo.getAttribute('aria-current')).toBe('page');
    expect(ativo.className).toContain('bg-[var(--action-primary)]');
    expect(ativo.className).toContain('shadow-elev-brand');
  });

  it('rodapé: iniciais do nome no avatar + dot de presença com glow tokenizado', () => {
    const { container } = renderRail();
    expect(screen.getByText('VP')).toBeTruthy();
    const dot = container.querySelector('.shadow-\\[var\\(--datebadge-dot-glow\\)\\]');
    expect(dot).toBeTruthy();
  });

  it('nome do rodapé só aparece aberto (protótipo: display none fechado)', () => {
    renderRail();
    expect(screen.queryByText('Vitor Piagge')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(screen.getByText('Vitor Piagge')).toBeTruthy();
  });
});

describe('SidebarRail — medidas por token, nunca literal', () => {
  it('rail: raio, margem, sombra e paddings pelos tokens --rail-*', () => {
    renderRail();
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    for (const cls of [
      'rounded-[var(--rail-radius)]',
      'my-[var(--rail-margin)]',
      'ml-[var(--rail-margin)]',
      'shadow-elev-3',
      'pt-[var(--rail-pt)]',
      'pb-[var(--rail-pb)]',
      'bg-[var(--surface-raised)]',
    ]) {
      expect(nav.className).toContain(cls);
    }
  });

  it('item: altura 46/raio 14 por token + transição nas durações de motion', () => {
    renderRail();
    const item = screen.getByRole('link', { name: 'Eventos' });
    expect(item.className).toContain('h-[var(--rail-item-h)]');
    expect(item.className).toContain('rounded-[var(--rail-item-radius)]');
    expect(item.className).toContain('var(--motion-duration-fast)');
    expect(item.className).toContain('motion-reduce:transition-none');
  });

  it('movimento de largura: 650ms do token + easing default + reduced-motion', () => {
    renderRail();
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(nav.className).toContain('duration-[var(--rail-motion)]');
    expect(nav.className).toContain('ease-[var(--motion-easing-default)]');
    expect(nav.className).toContain('motion-reduce:transition-none');
  });
});
