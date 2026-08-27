// =============================================================================
// BalcaoView — layout focado do balcão de entrega (S204-T1). Topo: banner de
// contexto (entrega ativa ↔ fora da janela). Centro: atendimento (busca +
// 3 passos + checklist do kit). Rodapé: barra de atalhos de teclado.
// V2708-17: painel operacional migrado para a Visão geral do evento.
// =============================================================================

import { Alert, Button, Skeleton } from '@leela/design-system';
import type { Evento, Inscrito, ItemKit, Kit } from '@leela/core';
import type { VincularChipResult, RegistrarEntregaResult } from '@leela/api-client';
import { AtendimentoPanel } from './AtendimentoPanel';
import { BalcaoBanner } from './BalcaoBanner';
import { AtalhosBalcao } from './AtalhosBalcao';

export interface BalcaoViewProps {
  evento: Evento;
  inscritos: Inscrito[];
  /** Catálogo de itens do evento — compõe o checklist do kit (S205 · RN-215). */
  itensKit: ItemKit[];
  /** Kits do evento — o card de conferência lê "o que está incluso" daqui. */
  kits: Kit[];
  loading: boolean;
  error: Error | null;
  /** Religa o listener do pool a partir do bloco de erro (superfície viva). */
  onRetry?: (() => void) | undefined;
  onVincular: (
    inscritoId: string,
    chip: string,
    sobrescrever?: boolean,
  ) => Promise<VincularChipResult>;
  onRegistrar: (inscritoId: string) => Promise<RegistrarEntregaResult>;
  /** "Agora" injetável (determinismo do banner p/ o gate visual). */
  agora?: Date | undefined;
}

export function BalcaoView({
  evento,
  inscritos,
  itensKit,
  kits,
  loading,
  error,
  onRetry,
  onVincular,
  onRegistrar,
  agora,
}: BalcaoViewProps): JSX.Element {
  if (loading) {
    return (
      <div role="status" aria-label="Carregando balcão">
        <Skeleton variant="rect" className="h-80" />
      </div>
    );
  }

  if (error) {
    // INSCRITOS-READ-FIX: a fila do balcão não pode ficar sem saída. Enquanto
    // a leitura falhava DENTRO do callback do listener, esta tela nem chegava
    // aqui — ficava nos dois skeletons acima para sempre.
    return (
      <Alert
        tone="vulcao"
        live="alert"
        actions={
          onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Tentar novamente
            </Button>
          ) : null
        }
      >
        Não foi possível carregar o balcão.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-5)]">
      <BalcaoBanner evento={evento} agora={agora} />

      {/* V2708-17: painel operacional migrado para a Visão geral — o balcão
          fica focado na operação de atendimento. */}
      <AtendimentoPanel
        evento={evento}
        inscritos={inscritos}
        itensKit={itensKit}
        kits={kits}
        onVincular={onVincular}
        onRegistrar={onRegistrar}
      />

      <AtalhosBalcao />
    </div>
  );
}

BalcaoView.displayName = 'BalcaoView';
