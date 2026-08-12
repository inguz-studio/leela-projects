import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Átomos/Badge',
  component: Badge,
  args: { children: 'Publicado', variant: 'vitoria' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['brand', 'heroico', 'vulcao', 'vitoria', 'alerta', 'neutro', 'outline'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {};

export const TodasAsVariantes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
      <Badge variant="brand">Destaque</Badge>
      <Badge variant="heroico">Heroico</Badge>
      <Badge variant="vulcao">Cancelado</Badge>
      <Badge variant="vitoria">Publicado</Badge>
      <Badge variant="alerta">Pendente</Badge>
      <Badge variant="neutro">Rascunho</Badge>
      <Badge variant="outline">Contorno</Badge>
    </div>
  ),
};

/**
 * A pílula informativa de contorno, devolvida na Onda 0 Parte B (CANONE-1). A
 * esteira shadcn→brasa dropou a `outline` do stock, e a landing pagou com
 * cinco `<span>` escritos à mão — `HeroSection`, `HeroMinimo`, `KitsSection`,
 * `PerfilView` e `PublicHeader`, cada um com seu tamanho e sua tinta.
 *
 * A borda é `border-strong`, não `border-default`: numa pílula transparente a
 * borda é o componente inteiro, o que a põe sob a 1.4.11 (≥ 3:1). As cinco
 * instâncias usavam `border-default` (1.67:1 no brasa) — converter SOBE o
 * contraste.
 */
export const Contorno: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
      <Badge variant="outline" size="lg">
        21K
      </Badge>
      <Badge variant="outline" size="lg">
        10K
      </Badge>
      <Badge variant="outline" size="md">
        Camiseta
      </Badge>
      <Badge variant="outline" size="md">
        Medalha
      </Badge>
    </div>
  ),
};

/**
 * `sm` é o SELO do mockup (10px, uppercase, radius xs); `md` e `lg` são a
 * PÍLULA (12 e 14px, caixa normal, radius pill). A mesma peça em outro papel —
 * era essa a diferença entre o `Badge` publicado e as cinco escritas à mão.
 */
export const Tamanhos: Story = {
  render: () => (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-[var(--spacing-3)]">
          <span className="w-[var(--spacing-12)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            {size}
          </span>
          <Badge variant="outline" size={size}>
            Contorno
          </Badge>
          <Badge variant="vitoria" size={size}>
            Publicado
          </Badge>
          <Badge variant="brand" size={size}>
            Destaque
          </Badge>
        </div>
      ))}
    </div>
  ),
};
