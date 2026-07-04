// =============================================================================
// InscritoSlideIn — painel deslizante de detalhe do inscrito (S203-T2).
// Abre à direita ao clicar numa linha da tabela. Acessível (role=dialog,
// aria-modal, foco no título, fecha por overlay / botão / Esc). Presentational.
// =============================================================================

import * as React from 'react';
import { Badge, Button } from '@leela/design-system';
import type { Inscrito } from '@leela/core';
import { kitInscritoBadge } from '../_lib/kitLabels';
import { statusInscritoBadge } from '../_lib/statusInscrito';

export interface InscritoSlideInProps {
  /** Inscrito em foco; null = painel fechado. */
  inscrito: Inscrito | null;
  onClose: () => void;
}

export function InscritoSlideIn({ inscrito, onClose }: InscritoSlideInProps): JSX.Element | null {
  const tituloRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    if (!inscrito) return;
    tituloRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [inscrito, onClose]);

  if (!inscrito) return null;

  const kit = kitInscritoBadge(inscrito.kit);
  const status = statusInscritoBadge(inscrito.status);

  return (
    <>
      <button
        type="button"
        aria-label="Fechar detalhe"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-[var(--modal-overlay-bg)] backdrop-blur-[var(--modal-overlay-blur)]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="inscrito-slidein-titulo"
        className="fixed right-0 top-0 z-50 flex h-full w-[var(--modal-width-md)] max-w-[calc(100vw-var(--spacing-8))] flex-col gap-[var(--spacing-5)] overflow-y-auto bg-[var(--surface-raised)] p-[var(--spacing-6)] shadow-[var(--elevation-3)]"
      >
        <div className="flex items-start justify-between gap-[var(--spacing-4)]">
          <h2
            ref={tituloRef}
            id="inscrito-slidein-titulo"
            tabIndex={-1}
            className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)] focus:outline-none"
          >
            {inscrito.atletaNome}
          </h2>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <dl className="flex flex-col gap-[var(--spacing-4)]">
          <Campo termo="Modalidade" valor={inscrito.modalidade || '—'} />
          <Campo termo="Kit" valor={<Badge variant={kit.variant}>{kit.label}</Badge>} />
          <Campo
            termo="Chip"
            valor={inscrito.chipNumero ?? 'Não vinculado (entrega no balcão)'}
          />
        </dl>

        <div className="mt-auto">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </aside>
    </>
  );
}

function Campo({ termo, valor }: { termo: string; valor: React.ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-1)]">
      <dt className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
        {termo}
      </dt>
      <dd className="text-[length:var(--font-size-base)] text-[var(--text-primary)]">{valor}</dd>
    </div>
  );
}

InscritoSlideIn.displayName = 'InscritoSlideIn';
