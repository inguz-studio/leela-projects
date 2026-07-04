// =============================================================================
// BalcaoView — layout 60/40 do balcão de entrega (S204-T1). Esquerda:
// atendimento (busca + 3 passos). Direita: painel operacional ao vivo.
// Banner de "fora da janela" quando a entrega ainda não abriu (§2.9 estado
// dedicado é a galeria S204-T3; aqui é só o aviso da tela viva).
// =============================================================================

import * as React from 'react';
import { Skeleton } from '@leela/design-system';
import type { Evento, Inscrito } from '@leela/core';
import type { VincularChipResult, RegistrarEntregaResult } from '@leela/api-client';
import { AtendimentoPanel } from './AtendimentoPanel';
import { PainelOperacional } from './PainelOperacional';
import { janelaEntregaAberta } from '../_lib/balcao';

export interface BalcaoViewProps {
  evento: Evento;
  inscritos: Inscrito[];
  loading: boolean;
  error: Error | null;
  onVincular: (
    inscritoId: string,
    chip: string,
    sobrescrever?: boolean,
  ) => Promise<VincularChipResult>;
  onRegistrar: (inscritoId: string) => Promise<RegistrarEntregaResult>;
}

export function BalcaoView({
  evento,
  inscritos,
  loading,
  error,
  onVincular,
  onRegistrar,
}: BalcaoViewProps): JSX.Element {
  const [ultimos, setUltimos] = React.useState<string[]>([]);
  const janelaAberta = janelaEntregaAberta(evento);

  if (loading) {
    return (
      <div role="status" aria-label="Carregando balcão" className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-[3fr_2fr]">
        <Skeleton variant="rect" className="h-80" />
        <Skeleton variant="rect" className="h-80" />
      </div>
    );
  }

  if (error) {
    return <p className="text-[var(--text-danger)]">Não foi possível carregar o balcão.</p>;
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-5)]">
      {!janelaAberta && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border-l-[var(--card-critical-border)] border-l-[var(--border-danger)] bg-[var(--feedback-warning-surface)] p-[var(--spacing-4)]"
        >
          <p className="text-[length:var(--font-size-sm)] text-[var(--feedback-warning-fg)]">
            A janela de entrega ainda não abriu — a prova está distante. Atendimentos
            liberam a partir de 2 dias antes do evento.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-[3fr_2fr]">
        <AtendimentoPanel
          evento={evento}
          inscritos={inscritos}
          onVincular={onVincular}
          onRegistrar={onRegistrar}
          onAtendido={(nome) => setUltimos((prev) => [nome, ...prev])}
        />
        <PainelOperacional inscritos={inscritos} ultimosAtendidos={ultimos} />
      </div>
    </div>
  );
}

BalcaoView.displayName = 'BalcaoView';
