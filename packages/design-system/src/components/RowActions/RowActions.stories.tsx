import type { Meta, StoryObj } from '@storybook/react';
import { RowActions, ICONES_DE_ACAO, type VerboDeAcao } from './RowActions';

/**
 * Ações de UMA linha de tabela, por ícone (decisão do dono de 2026-08-17).
 * Entra pelo `renderActions` do `Table`. O consumidor escolhe o VERBO; o
 * desenho sai do vocabulário fechado do DS, então a mesma ação tem o mesmo
 * ícone em todas as tabelas do produto.
 */
const meta: Meta<typeof RowActions> = {
  title: 'Organismos/RowActions',
  component: RowActions,
};

export default meta;
type Story = StoryObj<typeof RowActions>;

const nada = (): void => {};

/** O caso mais comum do inventário: ver + editar. */
export const Padrao: Story = {
  args: {
    actions: [
      { id: 'ver', label: 'Ver detalhe de Marina Silva', verbo: 'ver', onClick: nada },
      { id: 'editar', label: 'Editar Marina Silva', verbo: 'editar', onClick: nada },
    ],
  },
};

/** Fila de aprovação — aprovar/recusar, com a recusa em tinta de perigo. */
export const FilaDeAprovacao: Story = {
  args: {
    actions: [
      { id: 'aprovar', label: 'Aprovar repasse de junho', verbo: 'aprovar', onClick: nada },
      {
        id: 'recusar',
        label: 'Recusar repasse de junho',
        verbo: 'recusar',
        onClick: nada,
        destructive: true,
      },
      { id: 'registrar', label: 'Registrar pagamento', verbo: 'registrar', onClick: nada },
    ],
  },
};

/** Acima do limite, o excedente recolhe para o menu canônico. */
export const ComExcedente: Story = {
  args: {
    menuLabel: 'Mais ações do lote Pista',
    actions: [
      { id: 'editar', label: 'Editar lote Pista', verbo: 'editar', onClick: nada },
      { id: 'capacidade', label: 'Capacidade do lote Pista', verbo: 'capacidade', onClick: nada },
      { id: 'copiar', label: 'Copiar link do lote Pista', verbo: 'copiar', onClick: nada },
      { id: 'desativar', label: 'Desativar lote Pista', verbo: 'desativar', onClick: nada },
      {
        id: 'remover',
        label: 'Remover lote Pista',
        verbo: 'remover',
        onClick: nada,
        destructive: true,
      },
    ],
  },
};

/** Ação indisponível continua legível e nomeada — não some da linha. */
export const Desabilitada: Story = {
  args: {
    actions: [
      { id: 'ver', label: 'Ver cupom SETEMBRO10', verbo: 'ver', onClick: nada },
      {
        id: 'remover',
        label: 'Remover cupom SETEMBRO10 (já utilizado)',
        verbo: 'remover',
        onClick: nada,
        destructive: true,
        disabled: true,
      },
    ],
  },
};

/**
 * O VOCABULÁRIO INTEIRO. Esta story é o contrato visual da regra "mesmo verbo,
 * mesmo ícone": quem for adicionar um verbo confere aqui se o desenho já existe
 * antes de inventar outro.
 */
export const Vocabulario: Story = {
  render: () => (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      {(Object.keys(ICONES_DE_ACAO) as VerboDeAcao[]).map((verbo) => (
        <div key={verbo} className="flex items-center gap-[var(--spacing-3)]">
          <span className="w-[var(--sidebar-width)] text-[var(--text-secondary)]">{verbo}</span>
          <RowActions actions={[{ id: verbo, label: verbo, verbo, onClick: nada }]} />
        </div>
      ))}
    </div>
  ),
};
