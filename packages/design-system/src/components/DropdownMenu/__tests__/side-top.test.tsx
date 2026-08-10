/**
 * DropdownMenu · side="top" (DELTA-UX-T4) — ancoragem ACIMA do trigger.
 *
 * Nasceu para o rodapé de perfil do SidebarRail: o trigger cola na borda
 * INFERIOR do viewport, e o painel abrindo para baixo sairia da tela. Em vez
 * de um popover artesanal por consumidor (L-021), a ancoragem vertical virou
 * prop do canônico: 'top' posiciona por `bottom` em coordenadas de viewport
 * (innerHeight − rect.top), então o painel cresce para CIMA sem precisar
 * medir a própria altura. O motor (portal, foco, teclado, click-fora, motion)
 * é o mesmo — os 13 testes de comportamento não são re-provados aqui.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DropdownMenu } from '../DropdownMenu';

function renderMenu(side?: 'bottom' | 'top') {
  return render(
    <DropdownMenu
      open
      onOpenChange={() => {}}
      actions={[{ id: 'a', label: 'Ação', onClick: () => {} }]}
      trigger={<button type="button">Abrir</button>}
      {...(side ? { side } : {})}
      containerClassName="w-full"
    />,
  );
}

describe('DropdownMenu — side="top"', () => {
  it('ancora por bottom (viewport) e NÃO por top; margem vira mb', () => {
    renderMenu('top');
    const menu = screen.getByRole('menu');
    // jsdom: rect do trigger é 0x0 no topo → bottom = innerHeight − 0.
    expect(menu.style.bottom).toBe(`${window.innerHeight}px`);
    expect(menu.style.top).toBe('');
    expect(menu.className).toContain('mb-[var(--spacing-1)]');
    expect(menu.className).not.toContain('mt-[var(--spacing-1)]');
  });

  it('default segue "bottom": ancora por top, margem mt (zero regressão)', () => {
    renderMenu();
    const menu = screen.getByRole('menu');
    expect(menu.style.top).toBe('0px');
    expect(menu.style.bottom).toBe('');
    expect(menu.className).toContain('mt-[var(--spacing-1)]');
  });

  it('containerClassName alarga o wrapper de ancoragem (rodapé w-full)', () => {
    const { container } = renderMenu('top');
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('relative');
    expect(wrapper.className).toContain('w-full');
  });
});
