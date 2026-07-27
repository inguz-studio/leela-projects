import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Thumb } from '../Thumb';

/**
 * O contrato que estas asserções travam é o do JOB: reconhecer o item de vista
 * na listagem. Por isso testam o que o organizador enxerga (imagem certa,
 * fallback digno, nunca quadrado quebrado), não classe utilitária.
 */
describe('Thumb', () => {
  // ── Imagem ──────────────────────────────────────────────────────────────
  it('renderiza a imagem quando há src', () => {
    render(<Thumb src="https://cdn.leela.app/kits/prata.jpg" alt="Kit Prata" />);
    expect(screen.getByAltText('Kit Prata')).toHaveAttribute(
      'src',
      'https://cdn.leela.app/kits/prata.jpg',
    );
  });

  it('a imagem é decorativa por default (alt vazio) — o nome ao lado rotula', () => {
    const { container } = render(<Thumb src="https://cdn.leela.app/m/cdl.png" />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('alt', '');
  });

  it('object-cover na imagem: preenche a caixa sem distorcer o assunto', () => {
    const { container } = render(<Thumb src="https://cdn.leela.app/m/cdl.png" />);
    expect(container.querySelector('img')?.className).toContain('object-cover');
  });

  it('lazy por default (lista) e eager quando lazy=false (miniatura única)', () => {
    const { container: lista } = render(<Thumb src="https://cdn.leela.app/a.png" />);
    expect(lista.querySelector('img')).toHaveAttribute('loading', 'lazy');

    const { container: campo } = render(<Thumb src="https://cdn.leela.app/b.png" lazy={false} />);
    expect(campo.querySelector('img')).not.toHaveAttribute('loading');
  });

  // ── Fallback ────────────────────────────────────────────────────────────
  it('sem src cai no fallback e NÃO renderiza img (nada de quadrado quebrado)', () => {
    const { container } = render(<Thumb fallback="CDL" />);
    expect(screen.getByText('CDL')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it.each(['', '   ', null, undefined])('src vazio/branco (%s) conta como sem imagem', (src) => {
    const { container } = render(<Thumb src={src as string | null | undefined} fallback="K" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('URL quebrada degrada para o fallback (onError) em vez de deixar cicatriz', () => {
    const { container } = render(<Thumb src="https://cdn.leela.app/morta.png" fallback="X" />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('X')).toBeInTheDocument();
  });

  it('trocar de src limpa o erro anterior — a nova URL não nasce condenada', () => {
    const { container, rerender } = render(<Thumb src="https://cdn.leela.app/velha.png" fallback="X" />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();

    rerender(<Thumb src="https://cdn.leela.app/nova.png" fallback="X" />);
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.leela.app/nova.png',
    );
  });

  it('o fallback é aria-hidden: reforço visual, não rótulo acessível', () => {
    render(<Thumb fallback="CDL" />);
    expect(screen.getByText('CDL').closest('[aria-hidden]')).not.toBeNull();
  });

  // ── Proporção e tamanho (contrato do dado, não estética) ─────────────────
  it('ratio square (default) para logo de marca e imagem de kit — 1:1', () => {
    const { container } = render(<Thumb src="https://cdn.leela.app/a.png" />);
    expect(container.firstElementChild?.className).toContain('aspect-[1/1]');
  });

  it('ratio wide para a capa do evento — 1.9:1 (RN-228)', () => {
    const { container } = render(<Thumb src="https://cdn.leela.app/capa.jpg" ratio="wide" />);
    expect(container.firstElementChild?.className).toContain('aspect-[1.9/1]');
  });

  it.each([
    ['sm', '--thumb-size-sm'],
    ['md', '--thumb-size-md'],
    ['lg', '--thumb-size-lg'],
  ] as const)('tamanho %s dimensiona a largura pelo token %s', (size, token) => {
    const { container } = render(<Thumb src="https://cdn.leela.app/a.png" size={size} />);
    expect(container.firstElementChild?.className).toContain(`w-[var(${token})]`);
  });

  it('size/ratio nulos (valor legal do tipo cva) caem no default, não apagam a caixa', () => {
    // `VariantProps` publica `null` em toda variante e `defaultVariants` só
    // cobre `undefined`. Como a largura sai de `size` e a altura sai de `ratio`,
    // um `null` sem normalização deixaria a miniatura sem NENHUMA medida — some
    // da tela com tsc e eslint verdes.
    const { container } = render(
      <Thumb src="https://cdn.leela.app/a.png" size={null} ratio={null} />,
    );
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.className).toContain('w-[var(--thumb-size-sm)]');
    expect(raiz.className).toContain('aspect-[1/1]');
  });

  it('a caixa é tokenizada (radius do DS) e não vaza estilo cru', () => {
    const { container } = render(<Thumb src="https://cdn.leela.app/a.png" />);
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.className).toContain('rounded-[var(--thumb-radius)]');
    expect(raiz.getAttribute('style')).toBeNull();
  });

  it('aceita className da superfície sem perder o próprio contrato', () => {
    const { container } = render(
      <Thumb src="https://cdn.leela.app/a.png" className="mt-[var(--spacing-2)]" />,
    );
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.className).toContain('mt-[var(--spacing-2)]');
    expect(raiz.className).toContain('overflow-hidden');
  });
});
