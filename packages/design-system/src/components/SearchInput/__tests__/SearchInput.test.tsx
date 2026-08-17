import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from '../SearchInput';

describe('SearchInput', () => {
  it('renderiza searchbox nativo com nome acessível', () => {
    render(<SearchInput placeholder="Buscar atleta, evento, inscrição…" />);
    const input = screen.getByRole('searchbox', { name: 'Buscar' });
    expect(input).toHaveAttribute('type', 'search');
    expect(input).toHaveAttribute('placeholder', 'Buscar atleta, evento, inscrição…');
  });

  it('kbd mostra o atalho default ⌘K (decorativo)', () => {
    render(<SearchInput />);
    const kbd = screen.getByText('⌘K');
    expect(kbd.tagName).toBe('KBD');
    expect(kbd).toHaveAttribute('aria-hidden');
  });

  it('shortcutLabel=null omite o kbd', () => {
    render(<SearchInput shortcutLabel={null} />);
    expect(screen.queryByText('⌘K')).not.toBeInTheDocument();
  });

  it('métricas por token: largura 320 e foco por ring de 2px', () => {
    render(<SearchInput />);
    const container = screen.getByRole('search');
    expect(container.className).toContain('w-[var(--search-width)]');
    // Governança §3: foco visível de 2px em --border-focus (alias `ring`).
    expect(container.className).toContain('focus-within:ring-2');
    expect(container.className).toContain('focus-within:ring-ring');
  });

  // ── Flat como a família de campo (direção do Vitor, 2026-08-17) ────────────
  //
  // A busca era o único campo do DS ainda desenhado como caixa outline (fill
  // raised + linha border-default) e destoava das facetas ao lado na FilterBar.
  // Estes três testes travam a receita compartilhada — a mesma string que
  // Combobox, Select, Textarea e Calendar usam — para a peça não voltar a
  // divergir no primeiro conserto.
  describe('estilo flat da família de campo', () => {
    it('fill inset sunken, e NUNCA o raised de cartão', () => {
      render(<SearchInput />);
      const container = screen.getByRole('search');
      expect(container.className).toContain('bg-[var(--surface-sunken)]');
      expect(container.className).not.toContain('bg-[var(--surface-raised)]');
    });

    it('sem linha de borda: caixa preservada com a cor flat do campo', () => {
      render(<SearchInput />);
      const container = screen.getByRole('search');
      expect(container.className).toContain('border-[color:var(--input-border-flat)]');
      expect(container.className).toContain('border-[length:var(--input-border-width)]');
      expect(container.className).not.toContain('border-[var(--border-default)]');
    });

    it('o halo de 3px do mockup não sobrevive ao foco de 2px', () => {
      render(<SearchInput />);
      const container = screen.getByRole('search');
      expect(container.className).not.toContain('--border-focus-ring-shadow');
    });

    it('o keycap é raised (some no wine se ficar sunken) e não tem borda', () => {
      render(<SearchInput />);
      const kbd = screen.getByText('⌘K');
      expect(kbd.className).toContain('bg-[var(--surface-raised)]');
      expect(kbd.className).not.toContain('border-[var(--border-subtle)]');
    });
  });

  it('Enter dispara onSubmit com o valor', async () => {
    const onSubmit = vi.fn();
    render(<SearchInput onSubmit={onSubmit} />);
    const input = screen.getByRole('searchbox');
    await userEvent.type(input, 'marina{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('marina');
  });

  it('controlado: value + onChange', async () => {
    const onChange = vi.fn();
    render(<SearchInput value="cs" onChange={onChange} />);
    const input = screen.getByRole('searchbox');
    expect(input).toHaveValue('cs');
    await userEvent.type(input, 'x');
    expect(onChange).toHaveBeenCalled();
  });

  it('encaminha ref para o input (foco programático ⌘K do consumidor)', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<SearchInput ref={ref} />);
    ref.current?.focus();
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });
});
