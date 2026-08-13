import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { FilterBar } from './FilterBar';
import { FilterChips } from '../FilterChips';
import { ResultCount } from '../ResultCount';
import { SearchInput } from '../SearchInput';
import { Button } from '../Button';

const meta: Meta<typeof FilterBar> = {
  title: 'Filtros/FilterBar',
  component: FilterBar,
};

export default meta;
type Story = StoryObj<typeof FilterBar>;

const STATUS = [
  { id: 'rascunho', label: 'Rascunho' },
  { id: 'agendado', label: 'Agendado' },
  { id: 'enviado', label: 'Enviado' },
];

const CANAIS = [
  { id: 'email', label: 'E-mail' },
  { id: 'push', label: 'Push' },
  { id: 'mural', label: 'Mural' },
];

/** A barra é controlada pela tela — aqui um harness com o estado real. */
function Barra({ comFacetas = true, comAcao = true }: { comFacetas?: boolean; comAcao?: boolean }) {
  const [busca, setBusca] = React.useState('');
  const [status, setStatus] = React.useState<string[]>([]);
  const [canais, setCanais] = React.useState<string[]>([]);

  return (
    <FilterBar
      label="comunicados"
      search={
        <SearchInput
          aria-label="Buscar comunicado por título"
          placeholder="Buscar por título"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          shortcutLabel={null}
        />
      }
      facets={
        comFacetas ? (
          <>
            <FilterChips
              label="Filtrar por status"
              options={STATUS}
              selected={status}
              onChange={setStatus}
            />
            <FilterChips
              label="Filtrar por canal"
              options={CANAIS}
              selected={canais}
              onChange={setCanais}
              multiple
            />
          </>
        ) : null
      }
      count={<ResultCount visiveis={12} total={40} substantivo={{ singular: 'comunicado', plural: 'comunicados' }} />}
      {...(comAcao ? { actions: <Button variant="primary">+ Novo comunicado</Button> } : {})}
    />
  );
}

export const Default: Story = {
  render: () => <Barra />,
};

/** Sem faceta: a barra continua sendo a mesma linha, só mais curta. */
export const SoBuscaEContador: Story = {
  render: () => <Barra comFacetas={false} comAcao={false} />,
};

/**
 * O refluxo interno. Com muitas facetas o lado esquerdo QUEBRA LINHA em vez de
 * empurrar a barra para a rolagem horizontal — é o defeito que a barra à mão
 * produz e o que esta peça fecha num lugar só.
 */
export const MuitasFacetas: Story = {
  render: () => (
    <div className="w-[var(--search-width)] max-w-full">
      <Barra />
    </div>
  ),
};
