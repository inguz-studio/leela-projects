import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
  it('renders nav landmark "Paginação"', () => {
    render(<Pagination total={48} page={1} pageSize={10} onPageChange={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Paginação' })).toBeInTheDocument();
  });

  it('shows counter "Mostrando X–Y de Z"', () => {
    render(<Pagination total={48} page={1} pageSize={10} onPageChange={vi.fn()} />);
    expect(screen.getByText('Mostrando 1–10 de 48')).toBeInTheDocument();
  });

  it('counter clamps last page range', () => {
    render(<Pagination total={48} page={5} pageSize={10} onPageChange={vi.fn()} />);
    expect(screen.getByText('Mostrando 41–48 de 48')).toBeInTheDocument();
  });

  it('shows "Nenhum resultado" when total=0', () => {
    render(<Pagination total={0} page={1} pageSize={10} onPageChange={vi.fn()} />);
    expect(screen.getByText('Nenhum resultado')).toBeInTheDocument();
  });

  it('exposes current page to screen readers', () => {
    render(<Pagination total={30} page={2} pageSize={10} onPageChange={vi.fn()} />);
    expect(screen.getByText('Página 2 de 3')).toHaveClass('sr-only');
  });

  it('prev disabled on first page, next enabled', () => {
    render(<Pagination total={30} page={1} pageSize={10} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeEnabled();
  });

  it('next disabled on last page', () => {
    render(<Pagination total={30} page={3} pageSize={10} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeEnabled();
  });

  it('calls onPageChange with next page', async () => {
    const onPageChange = vi.fn();
    render(<Pagination total={30} page={2} pageSize={10} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange with previous page', async () => {
    const onPageChange = vi.fn();
    render(<Pagination total={30} page={2} pageSize={10} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('does not fire onPageChange when control is disabled', async () => {
    const onPageChange = vi.fn();
    render(<Pagination total={30} page={1} pageSize={10} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    expect(onPageChange).not.toHaveBeenCalled();
  });
});
