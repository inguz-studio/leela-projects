/**
 * Helpers de apresentação do showroom — construídos sobre o Card do DS.
 * Zero valor cru: cor/espaço/tipo sempre por var(--token) ou classe do preset.
 */

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from '@leela/design-system';

// ---------------------------------------------------------------------------
// Section — bloco de página com heading
// ---------------------------------------------------------------------------

export interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ title, description, children, className }: SectionProps): JSX.Element {
  return (
    <section className={cn('flex flex-col gap-[var(--spacing-4)]', className)}>
      <div className="flex flex-col gap-[var(--spacing-1)]">
        <h2
          className={cn(
            'font-display',
            'text-[length:var(--font-size-xl)]',
            'font-[var(--font-weight-bold)]',
            'text-[var(--text-primary)]',
          )}
        >
          {title}
        </h2>
        {description && (
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// DemoCard — vitrine de um componente/token com exemplo vivo
// ---------------------------------------------------------------------------

export interface DemoCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function DemoCard({ title, description, children, className }: DemoCardProps): JSX.Element {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-[length:var(--font-size-md)]">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-[var(--spacing-4)]">{children}</CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// TokenLabel — nome de token em mono (o hex aparece só como texto informativo)
// ---------------------------------------------------------------------------

export function TokenLabel({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <span className="font-mono text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
      {children}
    </span>
  );
}
