import { describe, it, expect, vi } from 'vitest';
import type * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('intermediate item without href renders as plain text, not link', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Início', href: '/' },
          { label: 'Sem Rota' },
          { label: 'Atual' },
        ]}
      />,
    );
    expect(screen.queryByRole('link', { name: 'Sem Rota' })).not.toBeInTheDocument();
    expect(screen.getByText('Sem Rota').tagName).toBe('SPAN');
  });

  // -------------------------------------------------------------------------
  // LEELA-NAVFIX-T1 — antes disso o Breadcrumb NÃO tinha como ser usado em SPA:
  // renderizava `<a href>` e a interface do item nem expunha `onClick`.
  // -------------------------------------------------------------------------

  it('href + onClick: o handler recebe o MouseEvent e o href continua no DOM', async () => {
    const recebido: unknown[] = [];
    render(
      <Breadcrumb
        items={[
          {
            label: 'Eventos',
            href: '/eventos',
            onClick: (event) => {
              recebido.push(event);
              event.preventDefault();
            },
          },
          { label: 'Meia Floripa' },
        ]}
      />,
    );
    const link = screen.getByRole('link', { name: 'Eventos' });
    await userEvent.click(link);

    expect(recebido).toHaveLength(1);
    const event = recebido[0] as React.MouseEvent;
    expect(typeof event.preventDefault).toBe('function');
    expect(event.defaultPrevented).toBe(true);
    expect(link).toHaveAttribute('href', '/eventos');
  });

  it('o item ATUAL ignora onClick — página atual não é alvo de clique', async () => {
    const onClick = vi.fn();
    render(<Breadcrumb items={[{ label: 'Eventos', href: '/eventos' }, { label: 'Atual', href: '/atual', onClick }]} />);
    // O último item é `span[aria-current="page"]`, nunca link — passar onClick
    // nele é inerte de propósito.
    expect(screen.queryByRole('link', { name: 'Atual' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Atual'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('item intermediário sem href ignora onClick — texto não vira alvo', async () => {
    const onClick = vi.fn();
    render(
      <Breadcrumb
        items={[{ label: 'Início', href: '/' }, { label: 'Sem Rota', onClick }, { label: 'Atual' }]}
      />,
    );
    expect(screen.getByText('Sem Rota').tagName).toBe('SPAN');
    await userEvent.click(screen.getByText('Sem Rota'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders separator between items', () => {
    const { container } = render(<Breadcrumb items={items} />);
    const separators = container.querySelectorAll('[aria-hidden]');
    // 2 separators for 3 items
    expect(separators.length).toBe(2);
  });
});
