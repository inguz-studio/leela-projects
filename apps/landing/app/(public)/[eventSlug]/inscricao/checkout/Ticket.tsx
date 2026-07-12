'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Ingresso por inscrito (ADR-011: cada inscrito recebe seu QR individual). O QR
 * codifica o id REAL do inscrito devolvido por `createInscricaoCharge` — é o
 * identificador de check-in, nada fabricado.
 */
export function Ticket({
  inscritoId,
  titulo,
  modalidade,
  kitLabel,
}: {
  inscritoId: string;
  titulo: string;
  modalidade: string;
  kitLabel: string;
}): React.JSX.Element {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    QRCode.toDataURL(inscritoId, { width: 176, margin: 1 })
      .then((url) => {
        if (!cancelado) setQr(url);
      })
      .catch(() => {
        if (!cancelado) setQr(null);
      });
    return () => {
      cancelado = true;
    };
  }, [inscritoId]);

  return (
    <div className="flex items-center gap-4 rounded-ds-lg border border-border-subtle bg-surface-raised p-4">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-ds-md bg-surface-base">
        {qr ? (
          <img src={qr} alt={`Ingresso de ${titulo}`} className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-text-tertiary">QR…</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text-primary">{titulo}</p>
        <p className="text-sm text-text-secondary">
          {modalidade} · {kitLabel}
        </p>
        <p className="mt-1 truncate font-mono text-xs text-text-tertiary" title={inscritoId}>
          {inscritoId}
        </p>
      </div>
    </div>
  );
}
