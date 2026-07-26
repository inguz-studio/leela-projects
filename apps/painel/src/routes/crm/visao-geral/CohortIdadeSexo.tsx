// =============================================================================
// CohortIdadeSexo — viz do cohort idade × sexo (RN-822 · S-R9-02).
// Barras EMPILHADAS por sexo dentro de cada faixa etária (bandas de 5 anos),
// horizontais — a forma que o verbatim pede ("gráfico cohort, de idade e
// sexo"). Componente LOCAL da rota (o DS não tem stacked bar e a lane não
// toca packages/design-system): construído com tokens do DS + paleta
// categórica `chartCategoryVar` (mesma família visual de BarChart/Donut),
// sem dependência nova.
//
// PRIVACIDADE (k-anonimato — RN-822/LGPD): este componente só recebe linhas
// que JÁ passaram por `suprimirCohortPorK` (via somarDemografia). Linha com
// `segmentos: null` = detalhamento retido pela salvaguarda — mostra o total
// da faixa e declara a supressão; NUNCA renderiza célula pequena.
//
// ACESSIBILIDADE (padrão dos charts do DS · dataviz): o plot é role="img"
// decorativo para SR; a semântica vive na TABELA sr-only equivalente. Cor
// nunca é a única pista — todo segmento tem rótulo/valor na tabela e
// tooltip nativo (title) no hover.
// =============================================================================

import { chartCategoryVar, EmptyState } from '@leela/design-system';
import { K_MIN_COHORT } from '@leela/core';
import type { CohortLinha } from './_lib/demografia';

export interface CohortIdadeSexoProps {
  /** Linhas pós-salvaguarda (somarDemografia → suprimirCohortPorK). */
  cohort: CohortLinha[];
  /** Alguma faixa teve o detalhamento suprimido? (declara a salvaguarda) */
  temSupressao: boolean;
}

/** Formata inteiro pt-BR. @pure */
function fmt(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(n);
}

export function CohortIdadeSexo({ cohort, temSupressao }: CohortIdadeSexoProps): JSX.Element {
  if (cohort.length === 0) {
    return (
      <EmptyState
        title="Sem dados para o cohort"
        description="O cruzamento de idade e sexo aparece quando houver inscrições confirmadas com data de nascimento e sexo declarados no checkout."
      />
    );
  }

  // Legenda: só os sexos presentes em alguma linha exposta (ordem canônica,
  // cor FIXA por sexo — colorIndex vem do lib, estável entre renders).
  const legenda = new Map<string, number>();
  for (const linha of cohort) {
    for (const s of linha.segmentos ?? []) {
      if (!legenda.has(s.label)) legenda.set(s.label, s.colorIndex);
    }
  }

  const maxTotal = Math.max(1, ...cohort.map((l) => l.total));

  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      {temSupressao && (
        <p
          role="note"
          className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--feedback-warning)] bg-[var(--surface-raised)] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]"
        >
          Para proteger a privacidade dos inscritos, faixas com grupos de menos
          de {K_MIN_COHORT} pessoas mostram só o total — o detalhamento por sexo
          fica retido (k-anonimato, mínimo {K_MIN_COHORT} por grupo).
        </p>
      )}

      {legenda.size > 0 && (
        <ul className="flex flex-wrap gap-x-[var(--spacing-4)] gap-y-[var(--spacing-2)]" aria-hidden="true">
          {[...legenda.entries()].map(([label, colorIndex]) => (
            <li key={label} className="flex items-center gap-[var(--spacing-2)]">
              <span
                className="inline-block size-[var(--spacing-2)] rounded-[var(--radius-sm)]"
                style={{ background: chartCategoryVar(colorIndex) }}
              />
              <span className="text-[length:var(--font-size-xs)] text-[var(--text-secondary)]">{label}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Plot — decorativo p/ SR (a tabela abaixo carrega a semântica). */}
      <div
        role="img"
        aria-label="Cohort de compradores por faixa etária e sexo"
        className="flex flex-col gap-[var(--spacing-2)]"
      >
        {cohort.map((linha) => (
          <div key={linha.faixa} className="grid grid-cols-[var(--spacing-16)_1fr_var(--spacing-12)] items-center gap-[var(--spacing-3)]">
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)] [font-variant-numeric:tabular-nums]">
              {linha.faixa}
            </span>
            <div className="h-[var(--spacing-4)] w-full overflow-hidden rounded-[var(--radius-sm)] bg-[var(--chart-track)]">
              {linha.segmentos === null ? (
                <div
                  data-testid={`cohort-suprimido-${linha.faixa}`}
                  className="flex h-full items-center bg-[var(--surface-raised)] px-[var(--spacing-2)]"
                  style={{ width: `${Math.max(8, (linha.total / maxTotal) * 100)}%` }}
                  title={`${linha.faixa}: ${fmt(linha.total)} — detalhamento por sexo retido (privacidade)`}
                >
                  <span className="truncate text-[length:var(--font-size-xs)] leading-none text-[var(--text-tertiary)]">
                    detalhe retido
                  </span>
                </div>
              ) : (
                <div className="flex h-full" style={{ width: `${(linha.total / maxTotal) * 100}%` }}>
                  {linha.segmentos.map((s) => (
                    <div
                      key={s.label}
                      className="h-full"
                      style={{
                        width: `${(s.value / linha.total) * 100}%`,
                        background: chartCategoryVar(s.colorIndex),
                      }}
                      title={`${linha.faixa} · ${s.label}: ${fmt(s.value)}`}
                    />
                  ))}
                </div>
              )}
            </div>
            <span className="text-right text-[length:var(--font-size-sm)] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
              {fmt(linha.total)}
            </span>
          </div>
        ))}
      </div>

      {/* Tabela equivalente (semântica p/ leitores de tela — dataviz §6). */}
      <table className="sr-only">
        <caption>Cohort de compradores por faixa etária e sexo</caption>
        <thead>
          <tr>
            <th scope="col">Faixa</th>
            <th scope="col">Total</th>
            <th scope="col">Por sexo</th>
          </tr>
        </thead>
        <tbody>
          {cohort.map((linha) => (
            <tr key={linha.faixa}>
              <th scope="row">{linha.faixa}</th>
              <td>{fmt(linha.total)}</td>
              <td>
                {linha.segmentos === null
                  ? 'Detalhamento retido para proteger a privacidade'
                  : linha.segmentos.map((s) => `${s.label}: ${fmt(s.value)}`).join('; ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

CohortIdadeSexo.displayName = 'CohortIdadeSexo';
