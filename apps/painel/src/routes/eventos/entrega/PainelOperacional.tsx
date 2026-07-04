// =============================================================================
// PainelOperacional — coluna direita (40%) do balcão (S204-T1): resumo ao vivo
// (atendidos/pendentes), alertas e últimos atendimentos. Presentational puro.
// =============================================================================

import { Badge } from '@leela/design-system';
import type { Inscrito } from '@leela/core';
import { presencaRegistrada } from '@leela/core';
import { resumoBalcao } from '../_lib/balcao';
import { formatInt } from '../_lib/format';

export interface PainelOperacionalProps {
  inscritos: Inscrito[];
  /** Nomes dos últimos atendidos nesta sessão (mais recente primeiro). */
  ultimosAtendidos: string[];
}

export function PainelOperacional({
  inscritos,
  ultimosAtendidos,
}: PainelOperacionalProps): JSX.Element {
  const resumo = resumoBalcao(inscritos);
  const jaComPresenca = inscritos.filter((i) => presencaRegistrada(i)).map((i) => i.atletaNome);
  const ultimos = ultimosAtendidos.length > 0 ? ultimosAtendidos : jaComPresenca.slice(0, 5);

  return (
    <aside
      aria-label="Painel operacional"
      className="flex flex-col gap-[var(--spacing-5)] rounded-[var(--radius-lg)] bg-[var(--surface-high)] p-[var(--spacing-5)]"
    >
      <section aria-label="Resumo ao vivo" className="grid grid-cols-2 gap-[var(--spacing-3)]">
        <Estatistica rotulo="Atendidos" valor={resumo.atendidos} tom="success" />
        <Estatistica rotulo="Pendentes" valor={resumo.pendentes} tom="warning" />
      </section>

      {resumo.pendentes > 0 && (
        <section
          aria-label="Alertas"
          className="rounded-[var(--radius-md)] border-l-[var(--card-critical-border)] border-l-[var(--border-danger)] bg-[var(--feedback-warning-surface)] p-[var(--spacing-3)]"
        >
          <p className="text-[length:var(--font-size-sm)] text-[var(--feedback-warning-fg)]">
            {formatInt(resumo.pendentes)} atleta(s) ainda sem retirada de kit.
          </p>
        </section>
      )}

      <section aria-label="Últimos atendimentos" className="flex flex-col gap-[var(--spacing-2)]">
        <h3 className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
          Últimos atendimentos
        </h3>
        {ultimos.length === 0 ? (
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            Nenhum atendimento ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-[var(--spacing-2)]">
            {ultimos.slice(0, 5).map((nome, i) => (
              <li
                key={`${nome}-${i}`}
                className="flex items-center justify-between gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]"
              >
                {nome}
                <Badge variant="vitoria">Presente</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

function Estatistica({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: number;
  tom: 'success' | 'warning';
}): JSX.Element {
  const cor = tom === 'success' ? 'text-[var(--text-success)]' : 'text-[var(--feedback-warning-fg)]';
  return (
    <div className="flex flex-col gap-[var(--spacing-1)] rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-[var(--spacing-3)]">
      <span className={`text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] ${cor}`}>
        {formatInt(valor)}
      </span>
      <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
        {rotulo}
      </span>
    </div>
  );
}

PainelOperacional.displayName = 'PainelOperacional';
