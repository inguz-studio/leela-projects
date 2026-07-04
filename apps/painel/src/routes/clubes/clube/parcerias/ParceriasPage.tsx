// =============================================================================
// ParceriasPage — container da tela de parcerias (`/clubes/:slug/parcerias`).
// Aceitar/recusar convite → transição de status real (RN-120/122) + reload.
// Copiar link master (RN-125). Modais de patrocinador/destrutivos/termos são
// ligados nos commits S107-T3/T4/T5.
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import { useToast } from '@leela/design-system';
import type { ParceriaEventoAfiliado } from '@leela/core';
import { ParceriasView } from './ParceriasView';
import { useParcerias, transicionarParceriaPadrao } from '../../_data/parcerias';
import type { ClubeOutletContext } from '../ClubeLayout';

export function ParceriasPage(): JSX.Element {
  const { clube } = useOutletContext<ClubeOutletContext>();
  const { toast } = useToast();
  const { data: parcerias, loading, error, reload } = useParcerias(clube.id);

  async function transicionar(
    p: ParceriaEventoAfiliado,
    status: 'ativa' | 'inativa',
    okTitle: string,
  ): Promise<void> {
    try {
      await transicionarParceriaPadrao(clube.id, p.id, status);
      toast({ variant: 'success', title: okTitle });
      reload();
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível atualizar a parceria' });
    }
  }

  function copiarLink(p: ParceriaEventoAfiliado): void {
    void navigator.clipboard
      ?.writeText(p.linkMaster)
      .then(() => toast({ variant: 'success', title: 'Link master copiado' }))
      .catch(() => toast({ variant: 'danger', title: 'Não foi possível copiar o link' }));
  }

  const emBreve = (): void => {
    toast({ variant: 'info', title: 'Disponível em breve' });
  };

  return (
    <ParceriasView
      parcerias={parcerias}
      loading={loading}
      error={error}
      onAceitar={(p) => void transicionar(p, 'ativa', `Parceria com ${p.eventoId} aceita`)}
      onRecusar={(p) => void transicionar(p, 'inativa', 'Convite recusado')}
      onCopiarLink={copiarLink}
      onVerTermos={emBreve}
      onRemoverEvento={emBreve}
      onAdicionarPatrocinador={emBreve}
      onDesativarPatrocinador={emBreve}
    />
  );
}

ParceriasPage.displayName = 'ParceriasPage';
