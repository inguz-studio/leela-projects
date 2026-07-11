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

  it('densidade do mockup (patch 2026-07-06): fontes, header e hover por token', () => {
    const { container } = render(
      <Table columns={columns} data={data} keyExtractor={(r) => r.id} />,
    );
    // Corpo 13px e hover visível por token literal-por-tema (não surface-raised:
    // sobre o wrap raised o hover antigo era invisível)
    const cell = container.querySelector('tbody td');
    expect(cell?.className).toContain('text-[length:var(--table-font-size)]');
    const row = container.querySelector('tbody tr');
    expect(row?.className).toContain('hover:bg-[var(--table-row-hover)]');
    expect(row?.className).not.toContain('hover:bg-[var(--surface-raised)]');
    // Header 10px, py 12px e fio de fundo do thead
    const header = container.querySelector('thead th');
    expect(header?.className).toContain('text-[length:var(--table-header-font-size)]');
    expect(header?.className).toContain('py-[var(--table-header-py)]');
    expect(header?.className).toContain('bg-[var(--table-header-bg)]');
  });

  it('wrap card do mockup (.table-wrap): raised + radius-lg + elev-1 no contêiner', () => {
    const { container } = render(
      <Table columns={columns} data={data} keyExtractor={(r) => r.id} />,
    );
    const wrapper = container.firstElementChild!;
    expect(wrapper.className).toContain('bg-[var(--surface-raised)]');
    expect(wrapper.className).toContain('rounded-[var(--radius-lg)]');
    expect(wrapper.className).toContain('shadow-elev-1');
  });

  it('header is uppercase with §2.5 letter-spacing token', () => {
    render(<Table columns={columns} data={data} keyExtractor={(r) => r.id} />);
    const header = screen.getAllByRole('columnheader')[0]!;
    expect(header.className).toContain('uppercase');
    expect(header.className).toContain('tracking-[var(--table-header-spacing)]');
  });

  it('header/células usam aliases shadcn→brasa; className vai ao contêiner de scroll', () => {
    const { container } = render(
      <Table
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        className="mt-[var(--spacing-4)]"
      />,
    );
    const header = screen.getAllByRole('columnheader')[0]!;
    expect(header.className).toContain('text-muted-foreground');
    const cell = container.querySelector('tbody td')!;
    expect(cell.className).toContain('text-foreground');
    // API preservada: className do consumidor cai no contêiner de scroll (wrapper)
    const wrapper = container.firstElementChild!;
    expect(wrapper.className).toContain('overflow-x-auto');
    expect(wrapper.className).toContain('mt-[var(--spacing-4)]');
  });

  // ── onRowClick (clique/teclado na linha → detalhe) ──────────────────────
  it('calls onRowClick with the row when the row is clicked', async () => {
    const onRowClick = vi.fn();
    render(
      <Table columns={columns} data={data} keyExtractor={(r) => r.id} onRowClick={onRowClick} />,
    );
    await userEvent.click(screen.getByText('Meia Floripa'));
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('preserves row semantics (role=row) — does NOT turn <tr> into a button', () => {
    render(
      <Table columns={columns} data={data} keyExtractor={(r) => r.id} onRowClick={vi.fn()} />,
    );
    // header + 2 body rows, todas ainda são role=row (estrutura de tabela intacta)
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does NOT open the row detail when an inner control is clicked', async () => {
    const onRowClick = vi.fn();
    const onAction = vi.fn();
    render(
      <Table
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        onRowClick={onRowClick}
        renderActions={(row) => (
          <button type="button" onClick={() => onAction(row.id)}>
            Ação
          </button>
        )}
      />,
    );
    await userEvent.click(screen.getAllByRole('button', { name: 'Ação' })[0]!);
    expect(onAction).toHaveBeenCalledWith('1');
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('rows are not interactive when onRowClick is absent', () => {
    render(<Table columns={columns} data={data} keyExtractor={(r) => r.id} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has correct number of rows (tbody tr)', () => {
    const { container } = render(
      <Table columns={columns} data={data} keyExtractor={(r) => r.id} />,
    );
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });
});

// ── RESP-M5 · card-mode responsivo (<lg): a tabela densa empilha em cards no
// mobile p/ não empurrar o documento à horizontal no 390. Desktop (lg+) intocado.
// jsdom ignora CSS, então validamos o CONTRATO de classes/rótulos que o gate
// visual em 390px exercita de verdade.
describe('Table — card-mode responsivo (<lg)', () => {
  function mobileLabels(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll('tbody td span')).filter((el) =>
      el.className.includes('max-lg:block'),
    ) as HTMLElement[];
  }

  it('wrap larga a moldura única e o scroll-x no mobile (max-lg:overflow-visible)', () => {
    const { container } = render(
      <Table columns={columns} data={data} keyExtractor={(r) => r.id} />,
    );
    const wrapper = container.firstElementChild!;
    // desktop preserva o scroll container; mobile o abandona (sem <table> larga)
    expect(wrapper.className).toContain('overflow-x-auto');
    expect(wrapper.className).toContain('max-lg:overflow-visible');
    expect(wrapper.className).toContain('max-lg:bg-transparent');
  });

  it('thead some no mobile (max-lg:hidden) — rótulo migra p/ a célula', () => {
    const { container } = render(
      <Table columns={columns} data={data} keyExtractor={(r) => r.id} />,
    );
    expect(container.querySelector('thead')?.className).toContain('max-lg:hidden');
  });

  it('linha do corpo vira card no mobile (max-lg:block + surface-raised + elev-1)', () => {
    const { container } = render(
      <Table columns={columns} data={data} keyExtractor={(r) => r.id} />,
    );
    const row = container.querySelector('tbody tr');
    expect(row?.className).toContain('max-lg:block');
    expect(row?.className).toContain('max-lg:bg-[var(--surface-raised)]');
    expect(row?.className).toContain('max-lg:shadow-elev-1');
  });

  it('célula vira linha rótulo↔valor no mobile (max-lg:flex justify-between)', () => {
    const { container } = render(
      <Table columns={columns} data={data} keyExtractor={(r) => r.id} />,
    );
    const cell = container.querySelector('tbody td');
    expect(cell?.className).toContain('max-lg:flex');
    expect(cell?.className).toContain('max-lg:justify-between');
  });

  it('injeta o rótulo da coluna (header string) em cada célula do card', () => {
    const { container } = render(
      <Table columns={columns} data={data} keyExtractor={(r) => r.id} />,
    );
    // 2 colunas string × 2 linhas = 4 rótulos; textos = os headers das colunas
    const labels = mobileLabels(container);
    expect(labels.map((l) => l.textContent)).toEqual(['Nome', 'Status', 'Nome', 'Status']);
    // o rótulo é o header da coluna restilizado (uppercase, text-tertiary)
    expect(labels[0]!.className).toContain('uppercase');
    expect(labels[0]!.className).toContain('text-muted-foreground');
  });

  it('header ReactNode (checkbox "selecionar todos") NÃO vira rótulo — sem duplicar controle', () => {
    const cols: TableColumn<Row>[] = [
      {
        key: 'sel',
        header: <input type="checkbox" aria-label="Selecionar todos" />,
        render: () => <input type="checkbox" aria-label="Selecionar linha" />,
      },
      { key: 'name', header: 'Nome', render: (r) => r.name },
    ];
    const { container } = render(<Table columns={cols} data={data} keyExtractor={(r) => r.id} />);
    // só a coluna 'Nome' gera rótulo → 1 por linha × 2 linhas = 2
    const labels = mobileLabels(container);
    expect(labels).toHaveLength(2);
    expect(labels.every((l) => l.textContent === 'Nome')).toBe(true);
    // o checkbox "selecionar todos" continua único (thead), não replicado nos cards
    expect(screen.getAllByLabelText('Selecionar todos')).toHaveLength(1);
  });

  it('desktop intocado: role=table e columnheaders seguem presentes', () => {
    render(<Table columns={columns} data={data} keyExtractor={(r) => r.id} />);
    // a semântica nativa de tabela permanece (jsdom não aplica display:block)
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
  });
});
