'use client';

// =============================================================================
// CheckoutStepper — indicador de progresso do checkout (LEELA-R13 · frentes 5+6).
//
// DECISÃO DO VITOR (adendo 10): o comprador vê 3 MACRO-etapas, não 5. As 5
// etapas internas (modalidade → dados → resumo → pagamento → confirmação) e
// suas validações continuam INTACTAS no CheckoutFlow — muda só a APRESENTAÇÃO
// do progresso, para reduzir o viés cognitivo de esforço. Nenhuma lógica de
// checkout/dinheiro passa por aqui.
//
// Agrupamento 4→3 (DEC-0729 · achados 3, 12 e 17):
//   Inscrição   = [0] modalidade+kit · [1] dados
//   Pagamento   = [2] pagar (resumo + instrumento + aceites, uma tela só)
//   Confirmação = [3] confirmação
//
// Era 5→3, com resumo e pagamento em telas internas separadas — as duas dentro
// da MESMA macro-etapa "Pagamento". O comprador escolhia a forma de pagamento
// numa tela e só via o instrumento (campos do cartão / QR do PIX) depois de
// clicar "Ir para pagamento", com a barra de progresso parada no mesmo passo.
// Esse clique era literalmente invisível no indicador — e é o "clicar
// novamente" do achado 17. As duas telas viraram uma; o indicador não mudou.
//
// Por que NÃO usar o <Stepper> do DS: o Stepper do design-system não aceita
// ícone por etapa (o Figma 112-4622 tem um ícone por etapa do checkout) e o DS
// é LEITURA neste lote (território R9-A). Este componente REPLICA os tokens
// visuais do Stepper do showroom (círculo pill, ring brand no atual, Brasa no
// concluído, conector) e ADICIONA o ícone Lucide — mesma linguagem, sem tocar
// no pacote do DS.
// =============================================================================

import { ClipboardList, CreditCard, CircleCheck, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** As 3 macro-etapas visíveis, com o ícone Lucide de cada uma (frente 5). */
const MACRO_ETAPAS: { id: string; label: string; icone: LucideIcon }[] = [
  { id: 'inscricao', label: 'Inscrição', icone: ClipboardList },
  { id: 'pagamento', label: 'Pagamento', icone: CreditCard },
  { id: 'confirmacao', label: 'Confirmação', icone: CircleCheck },
];

/**
 * Mapeia o índice da etapa INTERNA (0-3) para a macro-etapa VISÍVEL (0-2).
 * Fonte única do agrupamento 4→3 — usada só para pintar o indicador.
 */
export function macroDaEtapa(step: number): number {
  if (step <= 1) return 0; // modalidade+kit, dados → Inscrição
  if (step === 2) return 1; // pagar (resumo + instrumento + aceites) → Pagamento
  return 2; // confirmação
}

/**
 * Indicador de progresso em 3 macro-etapas. `step` é o índice interno (0-4); a
 * derivação para 3 macros mora em `macroDaEtapa`. Concluída = macro anterior à
 * atual (derivação linear, igual ao Stepper do DS).
 */
export function CheckoutStepper({
  step,
  className,
  'aria-label': ariaLabel = 'Progresso da inscrição',
}: {
  step: number;
  className?: string;
  'aria-label'?: string;
}): React.JSX.Element {
  const macroAtual = macroDaEtapa(step);

  return (
    <ol aria-label={ariaLabel} className={cn('flex w-full items-start', className)}>
      {MACRO_ETAPAS.map((etapa, index) => {
        const concluida = index < macroAtual;
        const atual = index === macroAtual;
        const Icone = etapa.icone;

        return (
          <li
            key={etapa.id}
            aria-current={atual ? 'step' : undefined}
            className={cn('flex items-start', index < MACRO_ETAPAS.length - 1 && 'flex-1')}
          >
            <div className="flex flex-col items-center gap-[var(--spacing-2)]">
              {/* Círculo da macro-etapa com ícone (frente 5) */}
              <span
                className={cn(
                  'flex items-center justify-center',
                  'h-[var(--stepper-step-size)] w-[var(--stepper-step-size)]',
                  'rounded-[var(--radius-pill)]',
                  'transition-colors duration-[var(--motion-duration-fast)]',
                  concluida && 'bg-[var(--action-primary)] text-[var(--action-primary-fg)]',
                  atual && [
                    'bg-[var(--surface-high)] text-[var(--text-primary)]',
                    'ring-2 ring-[color:var(--border-brand)]',
                  ],
                  !concluida &&
                    !atual &&
                    'bg-[var(--surface-overlay)] text-[var(--text-tertiary)]',
                )}
              >
                <Icone size={18} strokeWidth={2} aria-hidden className="shrink-0" />
              </span>

              {/* Rótulo da macro-etapa */}
              <span
                className={cn(
                  'whitespace-nowrap text-[length:var(--font-size-sm)]',
                  atual
                    ? 'font-[var(--font-weight-semibold)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]',
                )}
              >
                {etapa.label}
                {concluida && <span className="sr-only"> (concluída)</span>}
              </span>
            </div>

            {/* Conector — alinhado ao centro do círculo */}
            {index < MACRO_ETAPAS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'mx-[var(--spacing-3)] mt-[calc(var(--stepper-step-size)/2)] h-[var(--divider-thickness)] flex-1',
                  concluida ? 'bg-[var(--action-primary)]' : 'bg-[var(--border-subtle)]',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
