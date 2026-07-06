import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Pagination } from './Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'Organismos/Pagination',
  component: Pagination,
  argTypes: {
    total: { control: 'number' },
    page: { control: 'number' },
    pageSize: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

function PaginacaoDemo(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  return <Pagination total={87} page={page} pageSize={20} onPageChange={setPage} />;
}

/** Interativa: contador "Mostrando X–Y de Z" + anterior/próximo. */
export const Default: Story = { render: () => <PaginacaoDemo /> };

/** Última página — botão "próxima" desabilitado. */
export const UltimaPagina: Story = {
  args: { total: 87, page: 5, pageSize: 20, onPageChange: () => undefined },
};

/** Primeira página — botão "anterior" desabilitado. */
export const PrimeiraPagina: Story = {
  args: { total: 87, page: 1, pageSize: 20, onPageChange: () => undefined },
};

/** Sem resultados — contador vira "Nenhum resultado". */
export const SemResultados: Story = {
  args: { total: 0, page: 1, pageSize: 20, onPageChange: () => undefined },
};
