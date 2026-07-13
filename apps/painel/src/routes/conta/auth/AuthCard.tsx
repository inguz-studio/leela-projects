// =============================================================================
// AuthCard — casca visual comum das telas de conta (LEELA-S020). Reusa o Card
// do DS (frame surface-raised sobre o fundo dark do AuthLayout). O título é um
// <h1> semântico (é o heading da PÁGINA, não um card decorativo), estilizado
// com os mesmos tokens do CardTitle para não haver drift.
// =============================================================================

import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@leela/design-system';

export interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  /** Rodapé de apoio (links "Criar conta" / "Esqueci a senha"). */
  footer?: ReactNode;
}

export function AuthCard({ title, description, children, footer }: AuthCardProps): JSX.Element {
  return (
    <Card className="w-full">
      <CardHeader>
        <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] leading-none tracking-tight text-[var(--text-primary)]">
          {title}
        </h1>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-[var(--spacing-5)]">{children}</CardContent>
      {footer ? (
        <div className="flex flex-col gap-[var(--spacing-2)] px-[var(--spacing-6)] pb-[var(--spacing-6)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}

AuthCard.displayName = 'AuthCard';
