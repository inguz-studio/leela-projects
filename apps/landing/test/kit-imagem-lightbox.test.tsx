// =============================================================================
// PROVA do lightbox da imagem de kit (KIT-IMG-LANDING / T2) — a11y do DS Dialog.
//
// Foto (real/mock) → o slot vira botão que abre a imagem AMPLIADA no Dialog
// Radix-free do DS: abre, fecha por Esc, foco entra no X e RETORNA ao botão.
// Placeholder padrão Leela (não-ampliável) → renderiza estático, sem botão.
// Também garante o floor de SEO: dimensões intrínsecas + alt real + lazy.
// =============================================================================

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { KitImagem } from '../app/components/KitImagem';

afterEach(cleanup);

const FOTO = '/covers/kits/leela-kit-tee.jpg';
const PLACEHOLDER = '/covers/kits/leela-kit-placeholder.svg';

describe('KitImagem — floor de SEO', () => {
  it('renderiza <img> com alt real, dimensões intrínsecas e lazy', () => {
    render(<KitImagem src={FOTO} alt="Kit Prata" ampliavel />);
    const img = screen.getAllByAltText('Kit Prata')[0]!;
    expect(img.getAttribute('width')).toBe('800');
    expect(img.getAttribute('height')).toBe('800');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('src')).toBe(FOTO);
  });

  it('priority → eager (acima da dobra)', () => {
    render(<KitImagem src={FOTO} alt="Kit Ouro" ampliavel priority />);
    expect(screen.getAllByAltText('Kit Ouro')[0]!.getAttribute('loading')).toBe('eager');
  });
});

describe('KitImagem — lightbox (foto ampliável)', () => {
  function montar(): HTMLElement {
    render(<KitImagem src={FOTO} alt="Kit Prata" ampliavel />);
    return screen.getByRole('button', { name: /ampliar imagem do kit prata/i });
  }

  it('sem clique não há dialog', () => {
    montar();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clique abre o Dialog com a imagem AMPLIADA', () => {
    const botao = montar();
    fireEvent.click(botao);
    const dialog = screen.getByRole('dialog');
    const ampliada = within(dialog).getByRole('img');
    expect(ampliada.getAttribute('src')).toBe(FOTO);
    expect(ampliada.getAttribute('alt')).toBe('Kit Prata');
    // object-contain garante que a imagem cabe na viewport (mobile digno).
    expect(ampliada.className).toContain('object-contain');
  });

  it('ao abrir, o foco entra no X de fechar', () => {
    const botao = montar();
    fireEvent.click(botao);
    const dialog = screen.getByRole('dialog');
    const x = within(dialog).getByRole('button', { name: 'Fechar' });
    expect(document.activeElement).toBe(x);
  });

  it('Esc fecha e DEVOLVE o foco ao botão que abriu', () => {
    const botao = montar();
    fireEvent.click(botao);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(botao);
  });

  it('o X fecha o Dialog', () => {
    const botao = montar();
    fireEvent.click(botao);
    const x = within(screen.getByRole('dialog')).getByRole('button', { name: 'Fechar' });
    fireEvent.click(x);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('KitImagem — placeholder padrão Leela (não-ampliável)', () => {
  it('renderiza estático: sem botão, sem lightbox, mas com alt e imagem', () => {
    render(<KitImagem src={PLACEHOLDER} alt="Kit Básico" ampliavel={false} />);
    expect(screen.queryByRole('button')).toBeNull();
    const img = screen.getByAltText('Kit Básico');
    expect(img.getAttribute('src')).toBe(PLACEHOLDER);
    // Clicar no contêiner não abre nada (não há dialog).
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
