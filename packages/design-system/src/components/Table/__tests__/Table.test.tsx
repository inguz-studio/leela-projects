import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table } from '../Table';
import type { TableColumn } from '../Table';

type Row = { id: string; name: string; status: string };

const columns: TableColumn<Row>[] = [
  { key: 'name',   header: 'Nome',   render: (row) => row.name },
  { key: 'status', header: 'Status', render: (row) => row.status },
];

const data: Row[] = [
  { id: '1', name: 'Meia Floripa',  status: 'Ativo' },
  { id: '2', name: 'Maratona SC',   status: 'Rascunho' },
];

describe('Table', () => {
  it('renders table role', () => {
    render(<Table columns={columns} data={data} keyExtractor={(r) => r.id} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders column headers uppercase with scope="col"', () => {
    render(<Table columns={columns} data={data} keyExtractor={(r) => r.id} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveTextContent('Nome');
    expect(headers[0]).toHaveAttribute('scope', 'col');
  });

  it('renders all data rows', () => {
    render(<Table columns={columns} data={data} keyExtractor={(r) => r.id} />);
    expect(screen.getByText('Meia Floripa')).toBeInTheDocument();
    expect(screen.getByText('Maratona SC')).toBeInTheDocument();
  });

  it('shows EmptyState when data is empty', () => {
    render(<Table columns={columns} data={[]} keyExtractor={(r) => r.id} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows custom empty title', () => {
    render(
      <Table
        columns={columns}
        data={[]}
        keyExtractor={(r) => r.id}
        emptyTitle="Nenhum evento encontrado"
      />,
    );
    expect(screen.getByText('Nenhum evento encontrado')).toBeInTheDocument();
  });

  it('renders caption as visually hidden', () => {
    render(
      <Table
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        caption="Lista de eventos"
      />,
    );
    expect(screen.getByText('Lista de eventos')).toHaveClass('sr-only');
  });

  it('renders actions column when renderActions is provided', () => {
    render(
      <Table
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        renderActions={(row) => <button type="button">Ações {row.name}</button>}
      />,
    );
    expect(screen.getAllByRole('button').length).toBe(2);
  });

  it('calls renderActions for each row', async () => {
    const onAction = vi.fn();
    render(
      <Table
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        renderActions={(row) => (
          <button type="button" onClick={() => onAction(row.id)}>
            Ação
          </button>
        )}
      />,
    );
    await userEvent.click(screen.getAllByRole('button')[0]!);
    expect(onAction).toHaveBeenCalledWith('1');
  });

  it('falls back to row[key] when column has no render', () => {
    const plainColumns: TableColumn<Row>[] = [
      { key: 'name', header: 'Nome' },
      { key: 'status', header: 'Status' },
    ];
    render(<Table columns={plainColumns} data={data} keyExtractor={(r) => r.id} />);
    expect(screen.getByText('Meia Floripa')).toBeInTheDocument();
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
  });

  it('row height and cell padding use §2.5 tokens', () => {
    const { container } = render(
      <Table columns={columns} data={data} keyExtractor={(r) => r.id} />,
    );
    const row = container.querySelector('tbody tr');
    expect(row?.className).toContain('h-[var(--table-row-height)]');
    const cell = container.querySelector('tbody td');
    expect(cell?.className).toContain('py-[var(--table-cell-py)]');
    expect(cell?.className).toContain('px-[var(--table-cell-px)]');
  });

  it('header is uppercase with §2.5 letter-spacing token', () => {
    render(<Table columns={columns} data={data} keyExtractor={(r) => r.id} />);
    const header = screen.getAllByRole('columnheader')[0]!;
    expect(header.className).toContain('uppercase');
    expect(header.className).toContain('tracking-[var(--table-header-spacing)]');
  });

  it('has correct number of rows (tbody tr)', () => {
    const { container } = render(
      <Table columns={columns} data={data} keyExtractor={(r) => r.id} />,
    );
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });
});
