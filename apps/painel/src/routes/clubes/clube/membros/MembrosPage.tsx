// =============================================================================
// MembrosPage — container da tela de membros (`/clubes/:slug/membros`). Pega o
// clube do Outlet context e busca a lista densa de membros (L1 pronto).
//
// ⚠ CONTRATO p/ backend: não existem mutations `removerMembro` /
// `transferirPropriedade` em @leela/api-client (S103-T1 expôs só leitura). A
// tela abre o ConfirmModal §2.15 e, ao confirmar, dá feedback via toast; a
// mutation real é contrato do backend. Ver SUMMARY §Bloqueios.
// O modal de convite (S104-T1) é ligado ao botão "Convidar" no próximo commit.
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import { useToast } from '@leela/design-system';
import { MembrosList } from './MembrosList';
import { useMembros } from '../../_data/clubes';
import type { ClubeOutletContext } from '../ClubeLayout';

export function MembrosPage(): JSX.Element {
  const { clube } = useOutletContext<ClubeOutletContext>();
  const { toast } = useToast();
  const { data: membros, loading, error } = useMembros(clube.id);

  return (
    <MembrosList
      membros={membros}
      loading={loading}
      error={error}
      onConvidar={() => {
        // S104-T1 liga o modal de convite aqui.
      }}
      onRemover={(m) =>
        toast({ variant: 'success', title: `${m.atletaNome} removido do clube` })
      }
      onTransferir={(m) =>
        toast({ variant: 'success', title: `Propriedade transferida para ${m.atletaNome}` })
      }
    />
  );
}

MembrosPage.displayName = 'MembrosPage';
