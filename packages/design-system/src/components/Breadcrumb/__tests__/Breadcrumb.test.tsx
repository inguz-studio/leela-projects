import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumb } from '../Breadcrumb';
import type { BreadcrumbItem } from '../Breadcrumb';

const items: BreadcrumbItem[] = [
  { label: 'Início', href: '/' },
  { label: 'Eventos', href: '/eventos' },
  { label: 'Meia Floripa' },
];

describe('Breadcrumb', () => {
  it('renders nav landmark with label', () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });

  it('renders all item labels', () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getByText('Início')).toBeInTheDocument();
    expect(screen.getByText('Eventos')).toBeInTheDocument();
    expect(screen.getByText('Meia Floripa')).toBeInTheDocument();
  });

  it('last item has aria-current="page"', () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getByText('Meia Floripa')).toHaveAttribute('aria-current', 'page');
  });

  it('last item is not a link', () => {
    render(<Breadcrumb items={items} />);
    expect(screen.queryByRole('link', { name: 'Meia Floripa' })).not.toBeInTheDocument();
  });

  it('non-last items are links with correct hrefs', () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Eventos' })).toHaveAttribute('href', '/eventos');
  });

  it('renders single item as current page without links', () => {
    render(<Breadcrumb items={[{ label: 'Início' }]} />);
    expect(screen.getByText('Início')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders separator between items', () => {
    const { container } = render(<Breadcrumb items={items} />);
    const separators = container.querySelectorAll('[aria-hidden]');
    // 2 separators for 3 items
    expect(separators.length).toBe(2);
  });
});
