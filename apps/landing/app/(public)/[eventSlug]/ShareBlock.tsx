'use client';

import { useState } from 'react';

/**
 * Bloco compartilhar/QR (S1201-T3 · RN-201). A URL amigável e o QR são
 * gerados no SERVIDOR (a partir da URL pública real) e passados como props;
 * aqui só o "copiar" é interativo. Feedback inline com aria-live (texto do
 * glossário HANDOFF-07: "Link da página pública copiado").
 */
export function ShareBlock({
  shareUrl,
  qrSvg,
  nome,
}: {
  shareUrl: string;
  qrSvg: string;
  nome: string;
}): React.JSX.Element {
  const [copiado, setCopiado] = useState(false);

  async function copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      // clipboard bloqueado — o link segue visível/selecionável no input.
    }
  }

  return (
    <div className="flex flex-col gap-5 rounded-ds-lg border border-border-subtle bg-surface-raised p-6 sm:flex-row sm:items-center">
      <div
        className="mx-auto h-36 w-36 shrink-0 rounded-ds-md bg-surface-overlay p-2 [&>svg]:h-full [&>svg]:w-full"
        aria-label={`QR code para a página de ${nome}`}
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      <div className="flex-1">
        <h3 className="font-display text-lg font-bold text-text-primary">
          Compartilhe este evento
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          Mande o link para o grupo de treino ou aponte a câmera no QR.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={shareUrl}
            aria-label="Link público do evento"
            className="min-w-0 flex-1 rounded-ds-md border border-border-default bg-surface-base px-3 py-2 text-sm text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          />
          <button
            type="button"
            onClick={copiar}
            className="shrink-0 rounded-ds-md bg-action-secondary px-4 py-2 text-sm font-semibold text-action-secondary-fg transition-colors hover:bg-action-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {copiado ? 'Copiado!' : 'Copiar link'}
          </button>
        </div>
        <p aria-live="polite" className="mt-2 h-4 text-xs font-medium text-feedback-success">
          {copiado ? 'Link da página pública copiado' : ''}
        </p>
      </div>
    </div>
  );
}
