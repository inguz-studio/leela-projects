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
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('dica só existe quando acionada (Radix monta no open) — fechada, nada no DOM', () => {
    renderRail();
    expect(document.querySelectorAll('[data-rail-tip]').length).toBe(0);
  });

  /**
   * O CONSERTO DO T1, afirmado onde ele pode falhar.
   *
   * O defeito não era de estilo: a dica era filha do contêiner de rolagem dos
   * itens, que carrega `SCROLL_Y_ONLY` (`overflow-x:hidden`) e recorta na
   * largura do rail — 99px de dica, 0px visível. `z-index` não resolve recorte
   * de overflow; só sair da caixa resolve.
   *
   * Por isso o que se afirma aqui é PROCEDÊNCIA DO NÓ, não classe: a dica não
   * pode estar dentro da árvore do rail. Um teste de className passaria verde
   * com a dica recortada de novo — foi exatamente assim que o defeito
   * sobreviveu ao P-REC-6.
   */
  it('dica é PORTALIZADA: nasce fora da árvore do rail, longe do overflow que recortava', async () => {
    const { container } = renderRail();
    // Radix abre no `pointermove` e filtra `pointerType: 'touch'` — num toque a
    // dica não faz sentido, porque não há cursor parado sobre o item.
    fireEvent.pointerMove(screen.getByRole('link', { name: 'Visão Geral' }), {
      pointerType: 'mouse',
    });

    const tip = await waitFor(() => {
      const encontrada = document.querySelector('[data-rail-tip]');
      expect(encontrada).toBeTruthy();
      return encontrada as HTMLElement;
    });

    expect(tip.textContent).toContain('Visão Geral');
    expect(container.contains(tip)).toBe(false);
    expect(document.body.contains(tip)).toBe(true);

    // E nenhum ancestral da dica recorta — a prova de que o portal serviu.
    for (let no = tip.parentElement; no && no !== document.body; no = no.parentElement) {
      expect(no.className).not.toContain('overflow-x-hidden');
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
  // D-1008-R14: o fundo brasa + glow do ativo saíram do ITEM e viraram o pill
  // deslizante único ([data-rail-indicador]) — o item fica com aria-current,
  // tinta e peso; o pill viaja entre posições ao trocar a seleção.
  it('ativo: aria-current="page" + tinta do primário; o fundo mora no pill deslizante', () => {
    const { container } = renderRail();
    const ativo = screen.getByRole('link', { name: 'Visão Geral' });
    expect(ativo.getAttribute('aria-current')).toBe('page');
    expect(ativo.className).toContain('text-[var(--action-primary-fg)]');
    expect(ativo.className).not.toContain('bg-[var(--action-primary)]');

    const pill = container.querySelector('[data-rail-indicador]');
    expect(pill).toBeTruthy();
    expect((pill as HTMLElement).className).toContain('bg-[var(--action-primary)]');
    expect((pill as HTMLElement).className).toContain('shadow-elev-brand');
  });

  it('pill deslizante: motion por token, motion-reduce honrado, decorativo e sem hitbox', () => {
    const { container } = renderRail();
    const pill = container.querySelector('[data-rail-indicador]') as HTMLElement;
    expect(pill.className).toContain('transition-transform');
    expect(pill.className).toContain('duration-[var(--motion-duration-normal)]');
    expect(pill.className).toContain('ease-[var(--motion-easing-default)]');
    expect(pill.className).toContain('motion-reduce:transition-none');
    expect(pill.className).toContain('pointer-events-none');
    expect(pill.getAttribute('aria-hidden')).toBe('true');
    // Largura sem medição: ancora nos insets do padding dos itens — acompanha
    // a largura do rail até DURANTE a animação de abrir/fechar.
    expect(pill.className).toContain('left-[var(--rail-px)]');
    expect(pill.className).toContain('right-[var(--rail-px)]');
    // Altura/raio do item por token (mesma geometria do RailNavItem).
    expect(pill.className).toContain('h-[var(--rail-item-h)]');
    expect(pill.className).toContain('rounded-[var(--rail-item-radius)]');
  });

  it('sem item ativo, o pill não existe', () => {
    render(
      <SidebarRail
        items={[
          { id: 'a', label: 'A', icon: <svg aria-hidden /> },
          { id: 'b', label: 'B', icon: <svg aria-hidden /> },
        ]}
      />,
    );
    expect(document.querySelector('[data-rail-indicador]')).toBeNull();
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

// ---------------------------------------------------------------------------
// DELTA-UX-T4 (D-1008-R6 + F5) — rodapé de perfil como TRIGGER do menu
// ---------------------------------------------------------------------------

describe('SidebarRail — footerMenu (popover do perfil)', () => {
  const MENU = {
    menuLabel: 'Menu do perfil',
    actions: [
      { id: 'configuracoes', label: 'Configurações', onClick: () => {} },
      { id: 'alternar', label: 'Acessar painel master', onClick: () => {} },
    ],
  };

  it('FECHADO: o rodapé é button com nome acessível + aria-haspopup/expanded (F5 morta)', () => {
    renderRail({ footerMenu: MENU });
    // A dívida F5: fechado, o rodapé só tinha o avatar aria-hidden e ficava
    // SEM nome para a AT. Agora o aria-label dá o nome SEMPRE.
    const trigger = screen.getByRole('button', { name: 'Vitor Piagge' });
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('ABERTO: mesmo nome acessível (o aria-label não depende do estado do rail)', () => {
    renderRail({ footerMenu: MENU, defaultOpen: true });
    expect(screen.getByRole('button', { name: 'Vitor Piagge' })).toBeTruthy();
  });

  it('clique abre o DropdownMenu canônico ACIMA (side top), com as ações', () => {
    renderRail({ footerMenu: MENU });
    fireEvent.click(screen.getByRole('button', { name: 'Vitor Piagge' }));
    const menu = screen.getByRole('menu', { name: 'Menu do perfil' });
    // Ancorado por bottom = abre para CIMA (o rodapé cola no pé do viewport).
    expect(menu.style.bottom).not.toBe('');
    expect(screen.getByRole('menuitem', { name: 'Configurações' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Acessar painel master' })).toBeTruthy();
    // Estado anunciado no trigger.
    expect(
      screen.getByRole('button', { name: 'Vitor Piagge' }).getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('footerMenu tem precedência sobre onFooterClick (não navega, abre menu)', () => {
    let navegou = false;
    renderRail({ footerMenu: MENU, onFooterClick: () => { navegou = true; } });
    fireEvent.click(screen.getByRole('button', { name: 'Vitor Piagge' }));
    expect(screen.getByRole('menu', { name: 'Menu do perfil' })).toBeTruthy();
    expect(navegou).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DELTA-UX-T3 (D-1008-R5) — variant="drawer": a pele v3 do menu mobile
// ---------------------------------------------------------------------------

describe('SidebarRail — variant="drawer" (menu mobile no chrome v3)', () => {
  it('sempre aberto: rótulos no fluxo, badge visível, sem tooltip', () => {
    const { container } = renderRail({ variant: 'drawer' });
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(nav.getAttribute('data-rail-open')).toBe('1');
    expect(screen.getByText('Eventos')).toBeTruthy(); // rótulo em fluxo, não sr-only
    expect(screen.getByText('2')).toBeTruthy(); // badge (anatomia aberta)
    expect(container.querySelectorAll('[data-rail-tip]').length).toBe(0);
  });

  it('sem toggle: quem fecha o off-canvas é o Drawer (scrim/Esc)', () => {
    renderRail({ variant: 'drawer' });
    expect(screen.queryByRole('button', { name: 'Abrir menu' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Recolher menu' })).toBeNull();
  });

  it('anatomia do protótipo < lg: altura total, largura 248 por token, sem margem/raio', () => {
    renderRail({ variant: 'drawer' });
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(nav.className).toContain('h-full');
    expect(nav.className).toContain('w-[var(--rail-width-open)]');
    expect(nav.className).toContain('rounded-none');
    expect(nav.className).not.toContain('my-[var(--rail-margin)]');
    expect(nav.className).not.toContain('ml-[var(--rail-margin)]');
    expect(nav.className).not.toContain('rounded-[var(--rail-radius)]');
    // A superfície segue a do rail (vidro sob data-glass): mesma pele, outra moldura.
    expect(nav.className).toContain('bg-[var(--surface-raised)]');
  });
});

// ---------------------------------------------------------------------------
// F4 (DELTA-UX) — tooltip do rail fechado visível também por teclado
// ---------------------------------------------------------------------------

describe('SidebarRail — F4: tooltip por teclado, não só hover', () => {
  /**
   * A dívida F4 foi paga à mão com `group-focus-visible/item` enquanto a dica
   * era artesanal. Com o `Tooltip` canônico quem abre no foco é o Radix, então
   * o teste deixa de afirmar CLASSE e passa a afirmar COMPORTAMENTO — que é o
   * que a pessoa navegando por Tab recebe.
   */
  it('foco de teclado abre a dica, sem passar o mouse', async () => {
    renderRail();
    fireEvent.focus(screen.getByRole('link', { name: 'Eventos' }));

    await waitFor(() => {
      const tip = document.querySelector('[data-rail-tip]');
      expect(tip).toBeTruthy();
      expect(tip?.textContent).toContain('Eventos');
    });
  });
});
