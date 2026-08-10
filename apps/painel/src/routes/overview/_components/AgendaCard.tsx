// =============================================================================
// AgendaCard — o calendário da coluna direita do protótipo "Visao Geral v3"
// (lane HIFI-REC): eyebrow "Agenda" + legenda, navegação de mês, grade 7×n com
// ponto nos dias com evento, lista do dia selecionado e link para o hub.
//
// Fonte REAL: a mesma lista de eventos do organizador que a tela já busca —
// nenhuma query nova (derivação em `_lib/agenda`). O protótipo também pinta
// DESAFIOS (segunda cor da legenda); desafio vive por club e não há agregado
// por dia num round-trip só — impedimento nomeado no handoff. A legenda só
// diz o que a grade desenha: Eventos.
//
// Movimento (README §5): a lista do dia troca com fade+pop de 160ms
// (`animate-pop-v3`, keyframe no tailwind.config), desligado sob
// prefers-reduced-motion. A grade não reanima ao trocar mês — só a lista.
// =============================================================================

import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton, cn } from '@leela/design-system';
import {
  DIAS_DA_SEMANA,
  ROTULO_STATUS,
  anoMesDoISO,
  isoDoDia,
  itensPorDia,
  mesDaAgenda,
  mesVizinho,
  rotuloDoDia,
  type ItemDaAgenda,
} from '../_lib/agenda';
import { PanelError } from './PanelError';
import { CartaoV3, EyebrowV3, LinkV3 } from '../../../components/CartaoV3';

export interface AgendaCardProps {
  /** Eventos com dia civil resolvido (derivarAgenda); null = carregando/erro. */
  itens: ItemDaAgenda[] | null;
  loading: boolean;
  /** Falha ao listar eventos — nunca fabricar "Nada agendado" (#03). */
  error?: boolean;
  onRetry?: (() => void) | undefined;
  /** Dia civil de HOJE ("2026-08-10") — injetável nos testes. */
  hojeISO: string;
  onNavigate: (href: string) => void;
}

/** Sigla de duas letras do tile do item (protótipo: "EV" para eventos). */
const SIGLA_EVENTO = 'EV';

export function AgendaCard({
  itens,
  loading,
  error,
  onRetry,
  hojeISO,
  onNavigate,
}: AgendaCardProps): JSX.Element {
  const [mesAtual, setMesAtual] = useState(() => anoMesDoISO(hojeISO));
  const [diaSel, setDiaSel] = useState(hojeISO);

  const mes = mesDaAgenda(mesAtual.ano, mesAtual.mes);
  const porDia = itensPorDia(itens ?? []);
  const doDia = porDia.get(diaSel) ?? [];

  const celasVazias = Array.from({ length: mes.offset });
  const dias = Array.from({ length: mes.dias }, (_, i) => i + 1);

  return (
    <CartaoV3 aria="Agenda de eventos" elev={1} className="flex flex-col">
      <div className="flex items-center justify-between gap-[var(--spacing-3)] flex-wrap">
        <EyebrowV3 icon={<Calendar />}>Agenda</EyebrowV3>
        {/* Legenda: só o que a grade desenha (desafios sem fonte = fora). */}
        <span className="flex items-center gap-[var(--spacing-1-5)] mb-[var(--spacing-4)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          <span
            aria-hidden
            className="w-[var(--v3-dot)] h-[var(--v3-dot)] rounded-[var(--radius-pill)] bg-[var(--text-brand)]"
          />
          Eventos
        </span>
      </div>

      {loading ? (
        <div role="status" aria-label="Carregando agenda" className="flex flex-col gap-[var(--spacing-2)]">
          <Skeleton variant="rect" className="h-40" />
          <Skeleton variant="rect" className="h-14" />
        </div>
      ) : error || itens === null ? (
        <PanelError message="Não foi possível carregar a agenda dos seus eventos." onRetry={onRetry} />
      ) : (
        <>
          {/* Navegação de mês (protótipo: botões redondos de 30px). */}
          <div className="flex items-center justify-between gap-[var(--spacing-3)] mb-[var(--spacing-3)]">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => setMesAtual((m) => mesVizinho(m.ano, m.mes, -1))}
              className={cn(
                'w-[var(--v3-cal-nav)] h-[var(--v3-cal-nav)] shrink-0',
                'flex items-center justify-center border-none rounded-[var(--radius-pill)]',
                'bg-[var(--surface-overlay)] text-[var(--text-secondary)] cursor-pointer',
                'hover:bg-[var(--surface-high)] hover:text-[var(--text-primary)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
              )}
            >
              <ChevronLeft aria-hidden className="w-[var(--v3-icon-sm)] h-[var(--v3-icon-sm)]" />
            </button>
            <span className="text-[length:var(--font-size-base-plus)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
              {mes.rotulo}
            </span>
            <button
              type="button"
              aria-label="Mês seguinte"
              onClick={() => setMesAtual((m) => mesVizinho(m.ano, m.mes, 1))}
              className={cn(
                'w-[var(--v3-cal-nav)] h-[var(--v3-cal-nav)] shrink-0',
                'flex items-center justify-center border-none rounded-[var(--radius-pill)]',
                'bg-[var(--surface-overlay)] text-[var(--text-secondary)] cursor-pointer',
                'hover:bg-[var(--surface-high)] hover:text-[var(--text-primary)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
              )}
            >
              <ChevronRight aria-hidden className="w-[var(--v3-icon-sm)] h-[var(--v3-icon-sm)]" />
            </button>
          </div>

          {/* Letras da semana. */}
          <div role="presentation" className="grid grid-cols-7 mb-[var(--spacing-1-5)]">
            {DIAS_DA_SEMANA.map((letra, i) => (
              <span
                key={`${letra}-${i}`}
                className={cn(
                  'flex items-center justify-center h-[var(--spacing-5)]',
                  'text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)]',
                  'tracking-[var(--v3-label-spacing)] text-[var(--text-tertiary)]',
                )}
              >
                {letra}
              </span>
            ))}
          </div>

          {/* Grade do mês. */}
          <div
            role="grid"
            aria-label={mes.rotulo}
            className="grid grid-cols-7 gap-y-[var(--v3-cal-gap)] mb-[var(--spacing-4-5)]"
          >
            {celasVazias.map((_, i) => (
              <span key={`vazio-${i}`} aria-hidden className="h-[var(--v3-cal-cell-h)]" />
            ))}
            {dias.map((dia) => {
              const iso = isoDoDia(mes.ano, mes.mes, dia);
              const eHoje = iso === hojeISO;
              const eSel = iso === diaSel;
              const temEvento = porDia.has(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  aria-label={rotuloDoDia(iso)}
                  aria-pressed={eSel}
                  onClick={() => setDiaSel(iso)}
                  className={cn(
                    'relative flex items-center justify-center border-none cursor-pointer',
                    'h-[var(--v3-cal-cell-h)] rounded-[var(--v3-cal-cell-radius)]',
                    'text-[length:var(--font-size-sm-plus)]',
                    'transition-colors duration-[var(--motion-duration-fast)] motion-reduce:transition-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
                    eSel
                      ? 'bg-[var(--action-primary)] text-[var(--action-primary-fg)] font-[var(--font-weight-bold)]'
                      : eHoje
                        ? 'bg-[var(--action-brand-tint)] text-[var(--text-brand)] font-[var(--font-weight-bold)]'
                        : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)]',
                  )}
                >
                  {dia}
                  {temEvento ? (
                    <span
                      aria-hidden
                      className={cn(
                        'absolute bottom-[var(--spacing-1)] left-1/2 -translate-x-1/2',
                        'w-[var(--v3-dot-sm)] h-[var(--v3-dot-sm)] rounded-[var(--radius-pill)]',
                        eSel ? 'bg-[var(--action-primary-fg)]' : 'bg-[var(--text-brand)]',
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Dia selecionado. */}
          <p
            className={cn(
              'pt-[var(--spacing-4-5)] mb-[var(--spacing-3)]',
              'border-t border-t-[var(--border-subtle)]',
              'text-[length:var(--font-size-base)] font-[var(--font-weight-bold)] text-[var(--text-primary)]',
            )}
          >
            {rotuloDoDia(diaSel)}
          </p>
          <ul
            key={diaSel}
            role="list"
            className={cn(
              'list-none m-0 p-0 flex flex-col gap-[var(--spacing-2)] flex-1',
              'animate-pop-v3 motion-reduce:animate-none',
            )}
          >
            {doDia.length === 0 ? (
              <li className="flex items-center gap-[var(--spacing-3-5)] p-[var(--spacing-3)] rounded-[var(--radius-md)] bg-[var(--surface-overlay)]">
                <span
                  aria-hidden
                  className={cn(
                    'shrink-0 flex items-center justify-center rounded-[var(--radius-pill)]',
                    'w-[var(--v3-tile)] h-[var(--v3-tile)]',
                    'bg-[var(--surface-high)] text-[var(--text-tertiary)]',
                    'text-[length:var(--font-size-sm)] font-[var(--font-weight-bold)]',
                  )}
                >
                  —
                </span>
                <span className="min-w-0">
                  <span className="block text-[length:var(--font-size-base)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
                    Nada agendado
                  </span>
                  <span className="block mt-[var(--spacing-0-5)] text-[length:var(--font-size-sm-plus)] text-[var(--text-tertiary)]">
                    Nenhum evento neste dia
                  </span>
                </span>
              </li>
            ) : (
              doDia.map((item) => (
                <li key={item.slug}>
                  <button
                    type="button"
                    onClick={() => onNavigate(`/eventos/${item.slug}`)}
                    className={cn(
                      'w-full flex items-center gap-[var(--spacing-3-5)] text-left',
                      'p-[var(--spacing-3)] border-none rounded-[var(--radius-md)] cursor-pointer',
                      'bg-[var(--surface-overlay)] hover:bg-[var(--surface-high)]',
                      'transition-colors duration-[var(--motion-duration-fast)]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'shrink-0 flex items-center justify-center rounded-[var(--radius-pill)]',
                        'w-[var(--v3-tile)] h-[var(--v3-tile)]',
                        '[background-image:var(--thumb-corrida)] text-[var(--thumb-icon-fg)]',
                        'text-[length:var(--font-size-sm)] font-[var(--font-weight-bold)]',
                      )}
                    >
                      {SIGLA_EVENTO}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-[length:var(--font-size-base)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
                        {item.nome}
                      </span>
                      <span className="block mt-[var(--spacing-0-5)] truncate text-[length:var(--font-size-sm-plus)] text-[var(--text-tertiary)]">
                        {item.local}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 whitespace-nowrap rounded-[var(--radius-sm)]',
                        'px-[var(--spacing-2-5)] py-[var(--v3-tag-py)]',
                        'text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)]',
                        'bg-[var(--action-brand-tint)] text-[var(--action-brand-tint-fg)]',
                      )}
                    >
                      {ROTULO_STATUS[item.status]}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="flex justify-center pt-[var(--spacing-4)]">
            <LinkV3 onClick={() => onNavigate('/eventos')}>Ver agenda completa</LinkV3>
          </div>
        </>
      )}
    </CartaoV3>
  );
}

AgendaCard.displayName = 'AgendaCard';
