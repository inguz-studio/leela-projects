'use client';
// =============================================================================
// PainelCompras — o histórico de compras da conta (S1222-T2 · RN-451).
//
// SIMPLES, na palavra do dono. Cada linha responde quatro perguntas: o quê,
// quando, quanto e em que pé está. O detalhe da compra continua onde já mora —
// a tela do checkout (S1225), que lê o próprio pedido pela RN-469.
//
// O CÓDIGO DA COMPRA É O QUE A PESSOA DITA NO TELEFONE (RN-474). Ele aparece
// formatado pelo core, com o prefixo, porque é assim que ele existe no e-mail
// e na tela de confirmação — três grafias do mesmo código seriam três códigos.
// Compra anterior à S1228 não tem código, e AUSÊNCIA É AUSÊNCIA (RN-475): a
// linha não põe o id no lugar. Um identificador que ninguém consegue ditar não
// é identificador, é ruído com cara de dado.
// =============================================================================

import type { CompraDaConta } from '@leela/api-client';
import { formatarCodigoPedido } from '@leela/core';
import { Badge, EmptyState } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';

const FUSO = 'America/Sao_Paulo';
const fmtDia = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: FUSO,
});

const CARTAO =
  'flex flex-col gap-3 rounded-ds-lg border border-border-default bg-surface-raised p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-5';

const ROTULO_STATUS: Record<CompraDaConta['status'], string> = {
  pago: 'Paga',
  pendente: 'Aguardando pagamento',
  falhou: 'Não concluída',
  cancelado: 'Cancelada',
};

const VARIANTE_STATUS: Record<CompraDaConta['status'], 'vitoria' | 'alerta' | 'neutro'> = {
  pago: 'vitoria',
  pendente: 'alerta',
  falhou: 'neutro',
  cancelado: 'neutro',
};

/** "05/08/2026" — vazio quando não há carimbo legível. @pure */
function formatarDia(iso: string | null): string {
  if (iso === null) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : fmtDia.format(d);
}

function LinhaCompra({ compra }: { compra: CompraDaConta }): React.JSX.Element {
  const dia = formatarDia(compra.compradoEmIso);
  const pessoas =
    compra.participantes === 1 ? '1 participante' : `${compra.participantes} participantes`;
  return (
    <li className={CARTAO} data-slot="compra-linha">
      <div className="min-w-0">
        <p className="text-base font-semibold text-text-primary">
          {compra.eventoNome.length > 0 ? compra.eventoNome : 'Experiência'}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          {[dia, pessoas].filter((t) => t.length > 0).join(' · ')}
        </p>
        {compra.codigoPedido !== null ? (
          <p className="mt-2 font-mono text-sm text-text-secondary" data-slot="compra-codigo">
            {formatarCodigoPedido(compra.codigoPedido)}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <span className="text-base font-semibold text-text-primary">
          {formatarPreco(compra.valorTotal)}
        </span>
        <Badge variant={VARIANTE_STATUS[compra.status]}>{ROTULO_STATUS[compra.status]}</Badge>
      </div>
    </li>
  );
}

export function PainelCompras({ compras }: { compras: CompraDaConta[] }): React.JSX.Element {
  if (compras.length === 0) {
    return (
      <EmptyState
        title="Você ainda não fez nenhuma compra"
        description="Quando você se inscrever numa experiência, a compra aparece aqui."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3" data-slot="painel-compras">
      {compras.map((c) => (
        <LinhaCompra key={c.pedidoId} compra={c} />
      ))}
    </ul>
  );
}
