'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card } from '@leela/design-system/server';

/**
 * Ingresso por inscrito (ADR-011: cada inscrito recebe seu QR individual). O QR
 * codifica o id REAL do inscrito devolvido por `createInscricaoCharge` — é o
 * identificador de check-in, nada fabricado.
 *
 * ⚠ S1228-T2 · RN-475 — O `inscritoId` SAIU DA VISTA (era `:52-53`, em mono,
 * com `title` para o texto completo). Ele é `{pedidoId}-i{n}`, ou seja, carrega
 * o id do pedido INTEIRO — e portanto o uid da conta do comprador — dentro de
 * si. Esta é a sexta superfície humana do id, e ela não estava no inventário de
 * cinco da spec: a varredura de lá procurou por `pedidoId` e este vazamento
 * viaja com outro nome. A razão da RN vale aqui palavra por palavra: a pessoa
 * fotografa esta tela e encaminha o print.
 *
 * O QR CONTINUA codificando o `inscritoId`, e isso não contradiz nada: ele é a
 * credencial de check-in, e a RN-475 separa exatamente isso — "continua sendo
 * id interno onde é interno". O que a regra proíbe é o id em texto, para olho
 * humano, numa superfície de produto.
 *
 * O que ficou no lugar: nada. O identificador humano do INGRESSO é o
 * `codigoIngresso` (RN-396), e ele ainda não existe neste instante do fluxo —
 * quem o emite é o webhook, depois do pagamento, e é o e-mail que o entrega. O
 * identificador humano da COMPRA é o código do pedido, e ele está no topo da
 * mesma tela. Inventar um terceiro rótulo aqui seria dar à pessoa um número
 * que nenhum balcão reconhece.
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
    <Card className="flex items-center gap-4 border-border-subtle p-4">
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
      </div>
    </Card>
  );
}
