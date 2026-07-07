// =============================================================================
// TermosModal — termos do programa de afiliação (S107-T5 / SPEC §2.7.4).
// READ-ONLY: comissão, cupom, janela, link e os termos espelhados
// (critério de liberação, prazo de repasse, teto) são definidos pelo
// ORGANIZADOR e apenas refletidos aqui (RN-120/121/122). O clube não edita.
// =============================================================================

import { Badge, Modal } from '@leela/design-system';
import type { ParceriaEventoAfiliado } from '@leela/core';
import { formatBRL } from '../../_lib/parcerias';

export interface TermosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parceria: ParceriaEventoAfiliado;
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-[var(--spacing-4)] border-b border-b-[var(--border-subtle)] py-[var(--spacing-2)] last:border-b-0">
      <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">{rotulo}</span>
      <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        {valor}
      </span>
    </div>
  );
}

export function TermosModal({ open, onOpenChange, parceria }: TermosModalProps): JSX.Element {
  const t = parceria.termosEspelho;
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Termos do programa"
      description="Definidos pelo organizador do evento — somente leitura."
    >
      <div className="flex flex-col gap-[var(--spacing-3)]">
        <div className="flex items-center gap-[var(--spacing-2)]">
          <Badge variant="neutro">Somente leitura</Badge>
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">RN-122</span>
        </div>
        <div className="flex flex-col rounded-[var(--radius-md)] bg-[var(--surface-base)] px-[var(--spacing-4)]">
          <Linha rotulo="Evento" valor={parceria.eventoId} />
          <Linha rotulo="Comissão" valor={`${parceria.comissaoPct}%`} />
          <Linha rotulo="Cupom do clube" valor={parceria.cupom ?? '—'} />
          <Linha rotulo="Janela de atribuição" valor={`${parceria.janelaAtribuicaoDias} dias`} />
          <Linha rotulo="Critério de liberação" valor={t.criterioLiberacao} />
          <Linha rotulo="Prazo de repasse" valor={`${t.prazoRepasseDiasUteis} dias úteis`} />
          <Linha rotulo="Teto mensal" valor={t.tetoMensal !== null ? formatBRL(t.tetoMensal) : 'Sem limite'} />
        </div>
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">Link master</span>
          <span className="break-all text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
            {parceria.linkMaster}
          </span>
        </div>
      </div>
    </Modal>
  );
}

TermosModal.displayName = 'TermosModal';
