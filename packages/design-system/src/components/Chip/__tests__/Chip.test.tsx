import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chip } from '../Chip';

describe('Chip', () => {
  it('renders with label', () => {
    render(<Chip>Corrida</Chip>);
    expect(screen.getByText('Corrida')).toBeInTheDocument();
  });

  it('é um toggle button não pressionado por padrão (aria-pressed)', () => {
    render(<Chip>Todos</Chip>);
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('fica pressionado quando active=true', () => {
    render(<Chip active>Ativos</Chip>);
    expect(screen.getByRole('button', { name: 'Ativos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('F10: não usa role="option" fora de listbox nem aria-selected órfão', () => {
    render(<Chip active>Filtro</Chip>);
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filtro' })).not.toHaveAttribute(
      'aria-selected',
    );
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>Filtro</Chip>);
    await userEvent.click(screen.getByRole('button', { name: 'Filtro' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('F10: × é decorativo — nenhum interativo focável aninhado no chip', () => {
    render(<Chip onRemove={() => {}}>Tag</Chip>);
    // Apenas UM button na árvore (o próprio chip)
    expect(screen.getAllByRole('button')).toHaveLength(1);
    // O × existe mas é aria-hidden e não focável
    const x = screen.getByText('×', { selector: '[aria-hidden]' });
    expect(x).not.toHaveAttribute('tabindex');
  });

  it('calls onRemove when × is clicked', async () => {
    const onRemove = vi.fn();
    render(<Chip onRemove={onRemove}>Tag</Chip>);
    await userEvent.click(screen.getByText('×', { selector: '[aria-hidden]' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('remove por teclado: Delete e Backspace no chip disparam onRemove', async () => {
    const onRemove = vi.fn();
    render(<Chip onRemove={onRemove}>Tag</Chip>);
    const chip = screen.getByRole('button', { name: 'Tag' });
    chip.focus();
    await userEvent.keyboard('{Delete}');
    await userEvent.keyboard('{Backspace}');
    expect(onRemove).toHaveBeenCalledTimes(2);
  });

  it('is disabled when disabled prop is set', () => {
    render(<Chip disabled>Bloqueado</Chip>);
    expect(screen.getByRole('button', { name: 'Bloqueado' })).toBeDisabled();
  });
});
