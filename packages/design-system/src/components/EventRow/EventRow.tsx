/**
 * EventRow — linha densa de evento (mockup be-hero `.event-row` e o hub híbrido
 * `.event-card` de "Meus Eventos"). DEFAULT COMPACT persistido: pad 8×14,
 * thumb 40, gap 12.
 *
 * DEDUP (mds-librarian): NÃO é variante do CardEvento — aquele é card
 * VERTICAL de mídia 16/10; este é grid HORIZONTAL denso para listas/hub.
 * Anatomias disjuntas → componente próprio.
 *
 * Anatomia (grid `40px 1fr auto auto auto`):
 *   [thumb: FOTO da capa OU gradiente por modalidade]
 *   [nome + meta com dot-sep]
 *   [métricas inline `.stats-inline` (Inscritos/Receita/Vagas) OU contagem x/y]
 *   [badge de status] [ação(ões) — menu + Gerenciar]
 *
 * - Thumb HÍBRIDO (decisão FID-EVT-HUB): `thumbImage` renderiza a capa real
 *   (reconhecimento veloz do hub); sem foto, cai no gradiente semântico
 *   `--thumb-{variant}` + ícone da modalidade (AA do ícone branco .9 provado
 *   por composição — contrast.test.ts, EventThumb §). A foto é DECORATIVA
 *   (alt=""): o nome do evento, ao lado, já é o rótulo acessível da linha.
 * - `metrics` (mockup `.stats-inline`): grupo denso de KPIs por evento com
 *   divisor à esquerda; substitui a `count` única. Serve a triagem do hub
 *   ("inscritos / receita / vagas" batendo o olho). Cada métrica é uma COLUNA
 *   de largura mínima tokenizada (`--eventrow-metric-col-min-w`) com valor
 *   tabular à direita → as colunas batem na vertical entre TODAS as linhas,
 *   qualquer que seja o tamanho do número (fix FID-EVT-HUB).
 * - Hover: levanta 1px (mockup) + elev-2; motion por token.
 * - Responsivo (fix M6): em <lg (colapso do shell, 1024px) a linha reflui p/ 3
 *   faixas à DIREITA do thumb — que ocupa a col1 em `row-span-3` — na ordem
 *   [nome+meta] / [métricas] / [status + ação]. As métricas ganham a PRÓPRIA
 *   linha e nunca cortam no limite direito; o alinhamento vertical entre linhas
 *   segue de graça (mesma `--eventrow-metric-col-min-w` + text-right). Em lg+ o
 *   grid original de 5 colunas é byte-idêntico (nenhuma classe mobile vaza).
 * - A11y: a navegação acessível é o slot `action` (botão real). `onClick` na
 *   row é atalho de mouse (cursor-pointer), sem role — replica o mockup sem
 *   aninhar interativos.
 */

import * as React from 'react';
import {
  Bike,
  Dumbbell,
  Flower2,
  Footprints,
  MonitorPlay,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EventThumbVariant = 'corrida' | 'ciclismo' | 'yoga' | 'virtual' | 'crossfit';

export interface EventRowCount {
  /** Valor principal (ex.: "453"). */
  value: string;
  /** Total opcional — renderiza " / total" em texto terciário (ex.: "500"). */
  total?: string;
  /** Rótulo uppercase sob o valor (ex.: "Inscrições"). */
  label: string;
}

/** Foto de capa do evento — substitui o gradiente por variante no thumb. */
export interface EventRowThumbImage {
  src: string;
  /** Descrição; default decorativo (""), pois o nome já rotula a linha. */
  alt?: string;
}

/** Uma métrica do grupo inline (`.stats-inline` do mockup). */
export interface EventRowMetric {
  /** Valor já formatado (ex.: "453", "R$ 85.617", "∞"). */
  value: string;
  /** Rótulo uppercase sob o valor (ex.: "Inscritos"). */
  label: string;
}

export interface EventRowProps {
  name: string;
  thumbVariant: EventThumbVariant;
  /**
   * Foto de capa (hub híbrido). Quando presente, renderiza a imagem no lugar
   * do gradiente+ícone. Ausente → fallback para o gradiente da `thumbVariant`.
   */
  thumbImage?: EventRowThumbImage;
  /** Ícone central do thumb; default: ícone lucide da variante. */
  thumbIcon?: React.ReactNode;
  /** Itens da linha de meta — intercalados com dot-sep (`.event-meta`). */
  metaItems?: React.ReactNode[];
  count?: EventRowCount;
  /**
   * Métricas inline (mockup `.stats-inline`): grupo denso Inscritos/Receita/
   * Vagas. Tem precedência sobre `count` quando informado.
   */
  metrics?: EventRowMetric[];
  /** Badge de status (ex.: `<Badge variant="vitoria">Publicado</Badge>`). */
  badge?: React.ReactNode;
  /** Ação da linha (ex.: `<Button variant="secondary" size="sm">Gerenciar</Button>`). */
  action?: React.ReactNode;
  /** Atalho de mouse na row inteira; o caminho de teclado é o `action`. */
  onClick?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Thumb — mapa fechado variante → classe token (nada de style dinâmico)
// ---------------------------------------------------------------------------

const THUMB_BG: Record<EventThumbVariant, string> = {
  corrida:  'bg-[image:var(--thumb-corrida)]',
  ciclismo: 'bg-[image:var(--thumb-ciclismo)]',
  yoga:     'bg-[image:var(--thumb-yoga)]',
  virtual:  'bg-[image:var(--thumb-virtual)]',
  crossfit: 'bg-[image:var(--thumb-crossfit)]',
};

const THUMB_ICON: Record<EventThumbVariant, LucideIcon> = {
  corrida:  Footprints,
  ciclismo: Bike,
  yoga:     Flower2,
  virtual:  MonitorPlay,
  crossfit: Dumbbell,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EventRow = React.forwardRef<HTMLDivElement, EventRowProps>(
  (
    {
      name,
      thumbVariant,
      thumbImage,
      thumbIcon,
      metaItems,
      count,
      metrics,
      badge,
      action,
      onClick,
      className,
    },
    ref,
  ) => {
    const DefaultIcon = THUMB_ICON[thumbVariant];
    const meta = (metaItems ?? []).filter(
      (item) => item !== null && item !== undefined && item !== false,
    );

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'grid items-center',
          'grid-cols-[var(--eventrow-thumb-size)_minmax(0,1fr)_auto_auto_auto]',
          // <lg: 3 colunas [thumb | 1fr | auto] + 3 linhas (ver JSDoc). O thumb
          // ancora a col1 em row-span; nome/métricas/rodapé empilham à direita.
          'max-lg:grid-cols-[var(--eventrow-thumb-size)_minmax(0,1fr)_auto]',
          'gap-[var(--eventrow-gap)]',
          'px-[var(--eventrow-px)] py-[var(--eventrow-py)]',
          'rounded-[var(--radius-lg)] bg-[var(--surface-raised)] shadow-elev-1',
          'transition-[transform,box-shadow] duration-[var(--motion-duration-normal)] ease-[var(--motion-easing-default)]',
          'hover:-translate-y-[calc(var(--spacing-0-5)/2)] hover:shadow-elev-2',
          onClick && 'cursor-pointer',
          className,
        )}
      >
        {/* Thumb híbrido: FOTO da capa quando houver; senão gradiente + ícone */}
        <span
          aria-hidden
          className={cn(
            'relative flex items-center justify-center shrink-0 overflow-hidden',
            // <lg: ancora a col1 do topo (self-start) atravessando as 3 linhas.
            'max-lg:col-start-1 max-lg:row-start-1 max-lg:row-span-3 max-lg:self-start',
            'w-[var(--eventrow-thumb-size)] h-[var(--eventrow-thumb-size)]',
            'rounded-[var(--radius-md)]',
            // Gradiente só sem foto (a foto cobre o box inteiro)
            thumbImage ? 'bg-[var(--surface-high)]' : THUMB_BG[thumbVariant],
            'text-[color:var(--thumb-icon-fg)]',
            '[&_svg]:w-[var(--eventrow-thumb-icon-size)] [&_svg]:h-[var(--eventrow-thumb-icon-size)]',
            '[&_svg]:[stroke-width:var(--icon-stroke)]',
          )}
        >
          {thumbImage ? (
            <img
              src={thumbImage.src}
              alt={thumbImage.alt ?? ''}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            (thumbIcon ?? <DefaultIcon />)
          )}
        </span>

        {/* Nome + meta */}
        <div className="min-w-0 max-lg:col-start-2 max-lg:col-span-2 max-lg:row-start-1">
          <div
            className={cn(
              'truncate',
              'text-[length:var(--eventrow-name-size)] font-[var(--font-weight-semibold)]',
              'text-[var(--text-primary)]',
              'mb-[var(--eventrow-name-mb)]',
            )}
          >
            {name}
          </div>
          {meta.length > 0 && (
            <div
              className={cn(
                'flex items-center flex-wrap',
                'gap-[var(--eventrow-meta-gap)]',
                'text-[length:var(--eventrow-meta-size)] text-[var(--text-tertiary)]',
              )}
            >
              {meta.map((item, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <span
                      aria-hidden
                      className={cn(
                        'rounded-[var(--radius-pill)]',
                        'w-[var(--eventrow-dot-size)] h-[var(--eventrow-dot-size)]',
                        // Aproximação registrada: mockup usa neutro-500 #313131;
                        // o semantic mais próximo é border-default (#383838).
                        'bg-[var(--border-default)]',
                      )}
                    />
                  )}
                  <span className="flex items-center min-w-0">{item}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Métricas inline (mockup `.stats-inline`) — precedem a contagem única.
            Cada métrica é uma COLUNA de largura mínima fixa (token) com valor
            tabular alinhado à DIREITA: Inscritos/Receita/Vagas batem na vertical
            entre TODAS as linhas, independentemente do tamanho do número
            ("0" ou "R$ 167.277") — some o desalinhamento com valores de dígitos
            desiguais. Largura tokenizada dimensiona a maior métrica (Receita);
            `min-w` cresce com gentileza em valores atípicos sem quebrar layout. */}
        {metrics && metrics.length > 0 ? (
          <div
            className={cn(
              'flex items-center',
              'gap-[var(--eventrow-metric-gap)] pl-[var(--spacing-3)]',
              'border-l border-l-[var(--border-subtle)]',
              // <lg: 2ª linha, à direita do thumb. Larga o divisor/pad (o nome já
              // fica acima) e ganha flex-wrap de segurança p/ larguras < 390.
              'max-lg:col-start-2 max-lg:col-span-2 max-lg:row-start-2',
              'max-lg:border-l-0 max-lg:pl-0 max-lg:flex-wrap',
            )}
          >
            {metrics.map((m) => (
              <div
                key={m.label}
                className="min-w-[var(--eventrow-metric-col-min-w)] text-right"
              >
                <div
                  className={cn(
                    'text-[length:var(--eventrow-count-size)] font-[var(--font-weight-semibold)]',
                    'text-[var(--text-primary)] tabular-nums leading-tight',
                  )}
                >
                  {m.value}
                </div>
                <div
                  className={cn(
                    'mt-[var(--spacing-0-5)]',
                    'text-[length:var(--eventrow-count-label-size)] font-[var(--font-weight-semibold)]',
                    'text-[var(--text-tertiary)] uppercase',
                    'tracking-[var(--eventrow-count-label-spacing)]',
                  )}
                >
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        ) : count ? (
          <div className="text-right min-w-[var(--eventrow-count-min-w)] max-lg:col-start-2 max-lg:col-span-2 max-lg:row-start-2 max-lg:text-left">
            <div
              className={cn(
                'text-[length:var(--eventrow-count-size)] font-[var(--font-weight-semibold)]',
                'text-[var(--text-primary)] tabular-nums',
              )}
            >
              {count.value}
              {count.total ? (
                <span className="text-[var(--text-tertiary)] font-[var(--font-weight-regular)]">
                  {' '}/ {count.total}
                </span>
              ) : null}
            </div>
            <div
              className={cn(
                'mt-[var(--spacing-0-5)]',
                'text-[length:var(--eventrow-count-label-size)] font-[var(--font-weight-semibold)]',
                'text-[var(--text-tertiary)] uppercase',
                'tracking-[var(--eventrow-count-label-spacing)]',
              )}
            >
              {count.label}
            </div>
          </div>
        ) : (
          <span aria-hidden className="max-lg:col-start-2 max-lg:row-start-2" />
        )}

        {/* Badge de status */}
        {badge ? (
          <div className="flex items-center max-lg:col-start-2 max-lg:row-start-3">
            {badge}
          </div>
        ) : (
          <span aria-hidden className="max-lg:col-start-2 max-lg:row-start-3" />
        )}

        {/* Ação */}
        {action ? (
          <div
            className="flex items-center max-lg:col-start-3 max-lg:row-start-3 max-lg:justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            {action}
          </div>
        ) : (
          <span aria-hidden className="max-lg:col-start-3 max-lg:row-start-3" />
        )}
      </div>
    );
  },
);
EventRow.displayName = 'EventRow';

export { EventRow };
