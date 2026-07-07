// =============================================================================
// BalcaoView — layout 60/40 do balcão de entrega (S204-T1). Topo: banner de
// contexto (entrega ativa ↔ fora da janela). Esquerda: atendimento (busca +
// 3 passos + checklist do kit). Direita: painel operacional ao vivo. Rodapé:
// barra de atalhos de teclado. Os estados dedicados vivem na galeria (S204-T3).
// =============================================================================

import * as React from 'react';
import { Skeleton } from '@leela/design-system';
import type { Evento, Inscrito, ItemKit } from '@leela/core';
import type { VincularChipResult, RegistrarEntregaResult } from '@leela/api-client';
import { AtendimentoPanel } from './AtendimentoPanel';
import { PainelOperacional } from './PainelOperacional';
import { BalcaoBanner } from './BalcaoBanner';
import { AtalhosBalcao } from './AtalhosBalcao';

export interface BalcaoViewProps {
  evento: Evento;
  inscritos: Inscrito[];
  /** Catálogo de itens do evento — compõe o checklist do kit (S205 · RN-215). */
  itensKit: ItemKit[];
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
  itensKit,
  loading,
  error,
  onVincular,
  onRegistrar,
}: BalcaoViewProps): JSX.Element {
  const [ultimos, setUltimos] = React.useState<string[]>([]);

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
      <BalcaoBanner evento={evento} />

      <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-[3fr_2fr]">
        <AtendimentoPanel
          evento={evento}
          inscritos={inscritos}
          itensKit={itensKit}
          onVincular={onVincular}
          onRegistrar={onRegistrar}
          onAtendido={(nome) => setUltimos((prev) => [nome, ...prev])}
        />
        <PainelOperacional
          inscritos={inscritos}
          ultimosAtendidos={ultimos}
          usaChip={evento.usaChip}
        />
      </div>

      <AtalhosBalcao />
    </div>
  );
}

BalcaoView.displayName = 'BalcaoView';
