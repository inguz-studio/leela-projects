import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chip } from '../Chip';

describe('Chip', () => {
  it('renders with label', () => {
    render(<Chip>Corrida</Chip>);
    expect(screen.getByText('Corrida')).toBeInTheDocument();
  });

  it('is not selected by default', () => {
    render(<Chip>Todos</Chip>);
    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'false');
  });

  it('is selected when active=true', () => {
    render(<Chip active>Ativos</Chip>);
    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>Filtro</Chip>);
    await userEvent.click(screen.getByRole('option'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders remove button when onRemove is provided', () => {
    render(<Chip onRemove={() => {}}>Tag</Chip>);
    expect(screen.getByRole('button', { name: 'Remover' })).toBeInTheDocument();
  });

  it('calls onRemove when × is clicked', async () => {
    const onRemove = vi.fn();
    render(<Chip onRemove={onRemove}>Tag</Chip>);
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is set', () => {
    render(<Chip disabled>Bloqueado</Chip>);
    expect(screen.getByRole('option')).toBeDisabled();
  });
});
