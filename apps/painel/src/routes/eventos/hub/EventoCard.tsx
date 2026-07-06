// =============================================================================
// EventoCard — consome o CardEvento do DS (media 16/10 + hover translateY).
// Presentational: recebe o Evento e um callback de navegação. Mostra status
// (Badge semântico), data, local e contador de inscritos.
//
// Navegação client-side (SPA): passa só `onClick` ao CardEvento (que então
// renderiza <button>). Não usa `href` para não disparar reload de página
// concorrente com o router — o callback chama `navigate` no container.
// =============================================================================

import { Badge, CardEvento } from '@leela/design-system';
import type { Evento } from '@leela/core';
import { eventoEsgotado, statusEventoBadge } from '../_lib/status';
import { formatDataEvento, formatInt } from '../_lib/format';

export interface EventoCardProps {
  evento: Evento;
  /** Navega para o Overview do evento (SPA). */
  onAbrir: (slug: string) => void;
}

export function EventoCard({ evento, onAbrir }: EventoCardProps): JSX.Element {
  const status = statusEventoBadge(evento.status);

  return (
    <CardEvento
      title={evento.nome}
      onClick={() => onAbrir(evento.slug)}
      media={
        evento.imagemUrl ? (
          <img
            src={evento.imagemUrl}
            alt={evento.nome}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : undefined
      }
      modality={
        evento.modalidades.length > 0 ? (
          <Badge variant="neutro">{evento.modalidades[0]}</Badge>
        ) : undefined
      }
      meta={
        <>
          <span>{formatDataEvento(evento.data)}</span>
          {evento.local ? <span aria-hidden>·</span> : null}
          {evento.local ? <span>{evento.local}</span> : null}
        </>
      }
      footer={
        <div className="flex items-center justify-between gap-[var(--spacing-2)]">
          <div className="flex items-center gap-[var(--spacing-2)]">
            <Badge variant={status.variant}>{status.label}</Badge>
            {/* QA m2: esgotamento sinalizado na lista (capacidade conhecida) */}
            {eventoEsgotado(evento) ? <Badge variant="vulcao">Esgotado</Badge> : null}
          </div>
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {formatInt(evento.qtdInscritos)} inscritos
          </span>
        </div>
      }
    />
  );
}

EventoCard.displayName = 'EventoCard';
