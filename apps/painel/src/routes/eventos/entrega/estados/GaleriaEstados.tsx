// =============================================================================
// GaleriaEstados — índice navegável dos estados do balcão (S204-T3 · §2.9).
// RN-208: renderiza EXATAMENTE UM estado por vez (nunca empilhados). O índice
// à esquerda seleciona; o painel à direita mostra o estado dedicado isolado.
// =============================================================================

import * as React from 'react';
import { ESTADOS_BALCAO } from './EstadosBalcao';

export function GaleriaEstados(): JSX.Element {
  const [ativo, setAtivo] = React.useState<string>(ESTADOS_BALCAO[0]!.id);
  const estado = ESTADOS_BALCAO.find((e) => e.id === ativo) ?? ESTADOS_BALCAO[0]!;
  const Componente = estado.Componente;

  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <div>
        <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Galeria de estados do balcão
        </h2>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          Cada estado especial é uma tela dedicada — nunca empilhados (RN-208).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-[1fr_2fr]">
        <nav aria-label="Índice de estados" className="flex flex-col gap-[var(--spacing-1)]">
          {ESTADOS_BALCAO.map((e) => {
            const selecionado = e.id === ativo;
            return (
              <button
                key={e.id}
                type="button"
                aria-current={selecionado ? 'true' : undefined}
                onClick={() => setAtivo(e.id)}
                className={
                  selecionado
                    ? 'rounded-[var(--radius-md)] bg-[var(--surface-high)] px-[var(--spacing-4)] py-[var(--spacing-3)] text-left text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]'
                    : 'rounded-[var(--radius-md)] px-[var(--spacing-4)] py-[var(--spacing-3)] text-left text-[length:var(--font-size-sm)] text-[var(--text-secondary)] hover:bg-[var(--action-ghost-hover)]'
                }
              >
                {e.titulo}
              </button>
            );
          })}
        </nav>

        <section
          aria-label={`Estado: ${estado.titulo}`}
          className="rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]"
        >
          <Componente />
        </section>
      </div>
    </div>
  );
}

GaleriaEstados.displayName = 'GaleriaEstados';
