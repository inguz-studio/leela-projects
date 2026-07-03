import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Table, type TableColumn } from './Table';
import { Pagination } from '../Pagination';
import { Popover } from '../Popover';
import { Badge } from '../Badge';
import { Button } from '../Button';

interface Inscrito {
  id: string;
  nome: string;
  kit: string;
  status: string;
}

const DATA: Inscrito[] = [
  { id: '1', nome: 'Ana Souza', kit: 'Kit Completo', status: 'Confirmada' },
  { id: '2', nome: 'Bruno Lima', kit: 'Kit Básico', status: 'Pendente' },
  { id: '3', nome: 'Carla Nunes', kit: 'Kit Completo', status: 'Confirmada' },
  { id: '4', nome: 'Diego Costa', kit: 'Kit Básico', status: 'Cancelada' },
];

const COLUMNS: TableColumn<Inscrito>[] = [
  { key: 'nome', header: 'Nome' },
  { key: 'kit', header: 'Kit' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge
        variant={
          row.status === 'Confirmada' ? 'vitoria' : row.status === 'Pendente' ? 'alerta' : 'volcao'
        }
      >
        {row.status}
      </Badge>
    ),
  },
];

const meta: Meta<typeof Table<Inscrito>> = {
  title: 'Organismos/Table densa',
  component: Table,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Table<Inscrito>>;

/** Linha 64px, padding 14/20, header uppercase 0.08em (§2.5). */
export const Densa: Story = {
  render: () => (
    <Table
      caption="Inscritos do evento"
      columns={COLUMNS}
      data={DATA}
      keyExtractor={(row) => row.id}
    />
  ),
};

/** EmptyState padrão de lista filtrável. */
export const Vazia: Story = {
  render: () => (
    <Table
      caption="Inscritos do evento"
      columns={COLUMNS}
      data={[]}
      keyExtractor={(row) => row.id}
      emptyTitle="Nenhum inscrito encontrado com os filtros aplicados"
      emptyDescription="Ajuste os filtros ou limpe a busca."
    />
  ),
};

function ComAcoesDemo(): React.JSX.Element {
  const [openRow, setOpenRow] = React.useState<string | null>(null);
  return (
    <Table
      caption="Inscritos com ações"
      columns={COLUMNS}
      data={DATA}
      keyExtractor={(row) => row.id}
      renderActions={(row) => (
        <Popover
          open={openRow === row.id}
          onOpenChange={(open) => setOpenRow(open ? row.id : null)}
          trigger={<Button variant="ghost" size="sm">⋯</Button>}
          actions={[
            { id: 'ver', label: 'Ver detalhes', onClick: () => undefined },
            { id: 'transferir', label: 'Transferir inscrição', onClick: () => undefined },
            { id: 'cancelar', label: 'Cancelar inscrição', destructive: true, onClick: () => undefined },
          ]}
        />
      )}
    />
  );
}

/** Popover de linha — só um aberto por vez. */
export const ComPopoverDeLinha: Story = { render: () => <ComAcoesDemo /> };

function PaginadaDemo(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const pageSize = 2;
  const paged = DATA.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <Table
        caption="Inscritos paginados"
        columns={COLUMNS}
        data={paged}
        keyExtractor={(row) => row.id}
      />
      <Pagination total={DATA.length} page={page} pageSize={pageSize} onPageChange={setPage} />
    </div>
  );
}

/** Paginação com contador "mostrando X de Y". */
export const Paginada: Story = { render: () => <PaginadaDemo /> };
