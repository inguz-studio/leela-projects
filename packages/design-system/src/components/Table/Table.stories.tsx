import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Table, type TableColumn } from './Table';
import { Pagination } from '../Pagination';
import { DropdownMenu } from '../DropdownMenu';
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
          row.status === 'Confirmada' ? 'vitoria' : row.status === 'Pendente' ? 'alerta' : 'vulcao'
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
        <DropdownMenu
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

/** DropdownMenu de linha — só um aberto por vez. */
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

/**
 * Card-mode responsivo (RESP-M5). Abaixo de `lg` (1024px, mesmo breakpoint em
 * que o shell troca o rail por drawer) a tabela densa empilha: cada linha vira
 * um card e cada célula uma linha "RÓTULO … valor". Some o min-content largo da
 * `<table>` que empurrava o documento à horizontal no 390. Esta story abre já
 * no viewport 390×844 — alterne para desktop no addon Viewport para ver a
 * tabela densa nativa (intocada). Justificativa: design-principles §(c) —
 * tabela densa de leitura/varredura no celular serve melhor como cards do que
 * com scroll-x lateral.
 */
export const Responsiva: Story = {
  parameters: {
    viewport: {
      viewports: {
        mobile390: { name: 'Mobile 390×844', styles: { width: '390px', height: '844px' } },
      },
      defaultViewport: 'mobile390',
    },
  },
  render: () => <ComAcoesDemo />,
};

interface LinhaMatriz {
  id: string;
  kit: string;
  '5k': string;
  '10k': string;
  '21k': string;
  '42k': string;
}

const MATRIZ: LinhaMatriz[] = [
  { id: '1', kit: 'Kit Ouro', '5k': '12 / 20', '10k': '30 / 40', '21k': '8 / 25', '42k': '4 / 10' },
  { id: '2', kit: 'Kit Prata', '5k': '18 / 18', '10k': '22 / 35', '21k': '15 / 20', '42k': '2 / 8' },
  { id: '3', kit: 'Kit Bronze', '5k': '9 / 15', '10k': '11 / 30', '21k': '6 / 12', '42k': '1 / 5' },
];

const MATRIZ_COLUMNS: TableColumn<LinhaMatriz>[] = [
  { key: 'kit', header: 'Kit', render: (r) => r.kit },
  { key: '5k', header: '5k', align: 'right', render: (r) => r['5k'] },
  { key: '10k', header: '10k', align: 'right', render: (r) => r['10k'] },
  { key: '21k', header: '21k', align: 'right', render: (r) => r['21k'] },
  { key: '42k', header: '42k', align: 'right', render: (r) => r['42k'] },
];

/**
 * Opt-out `responsive="scroll"` (revisão r1). Matriz de comparação em grade
 * (kit×modalidade): virar card apagaria a leitura "qual modalidade está curta
 * entre os kits". Aqui a grade densa fica no mobile e rola na horizontal DENTRO
 * do wrap (scroll-x contido no card, nunca no documento). Abre no viewport
 * 390×844 — arraste a tabela para o lado para comparar as colunas.
 */
export const ScrollContida: Story = {
  parameters: {
    viewport: {
      viewports: {
        mobile390: { name: 'Mobile 390×844', styles: { width: '390px', height: '844px' } },
      },
      defaultViewport: 'mobile390',
    },
  },
  render: () => (
    <Table
      caption="Estoque por kit e modalidade"
      columns={MATRIZ_COLUMNS}
      data={MATRIZ}
      keyExtractor={(row) => row.id}
      responsive="scroll"
    />
  ),
};
