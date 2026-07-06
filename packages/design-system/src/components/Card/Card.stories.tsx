import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './Card';
import { Button } from '../Button';

const meta: Meta<typeof Card> = {
  title: 'Cards/Card',
  component: Card,
};

export default meta;
type Story = StoryObj<typeof Card>;

/** Composição completa: Header + Title + Description + Content + Footer. */
export const Completo: Story = {
  render: () => (
    <Card className="max-w-[var(--modal-width-sm)]">
      <CardHeader>
        <CardTitle>Resumo do evento</CardTitle>
        <CardDescription>Números consolidados até hoje.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-[length:var(--font-size-base)] text-[var(--text-secondary)]">
          1.284 inscritos · 3 kits · 87% dos kits retirados.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="secondary" size="sm">
          Ver relatório
        </Button>
      </CardFooter>
    </Card>
  ),
};

/** Só header + conteúdo — sem rodapé. */
export const SemRodape: Story = {
  render: () => (
    <Card className="max-w-[var(--modal-width-sm)]">
      <CardHeader>
        <CardTitle>Check-in aberto</CardTitle>
        <CardDescription>Retirada de kits até sábado, 18h.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-[length:var(--font-size-base)] text-[var(--text-secondary)]">
          412 de 1.284 kits retirados.
        </p>
      </CardContent>
    </Card>
  ),
};
