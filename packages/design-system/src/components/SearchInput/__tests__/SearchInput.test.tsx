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

  it('métricas por token: largura 320, foco com halo do mockup', () => {
    render(<SearchInput />);
    const container = screen.getByRole('search');
    expect(container.className).toContain('w-[var(--search-width)]');
    expect(container.className).toContain('focus-within:border-[var(--border-focus)]');
    expect(container.className).toContain('focus-within:shadow-[var(--border-focus-ring-shadow)]');
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
