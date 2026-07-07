// =============================================================================
// MembrosPage — container da tela de membros (`/clubes/:slug/membros`). Pega o
// clube do Outlet context e busca a lista densa de membros (L1 pronto).
//
// Wire das mutations REAIS (E05-L4): remover/transferir/convidar chamam os
// callables publicados pelo L2 via portas em `_data/membrosMutations`. Remover
// o owner devolve `failed-precondition` (a tela sugere transferir antes);
// sucesso recarrega a lista para refletir a recontagem ∑ do servidor.
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import { useToast } from '@leela/design-system';
import type { Membro } from '@leela/core';
import { useState } from 'react';
import { MembrosList } from './MembrosList';
import { ConviteModal } from './ConviteModal';
import { useMembros } from '../../_data/clubes';
import { enviarConvitesPadrao, isFailedPrecondition } from '../../_data/membrosMutations';
import { useRemoverMembro, useTransferirPropriedade } from '../../../../lib/query/mutations';
import type { ClubeOutletContext } from '../ClubeLayout';

export function MembrosPage(): JSX.Element {
  const { clube } = useOutletContext<ClubeOutletContext>();
  const { toast } = useToast();
  const { data: membros, loading, error } = useMembros(clube.id);
  // Mutações via gateway (lib/query): removem/transferem e invalidam a chave
  // membros.doClube — a tabela reflete a escrita sem reload() manual (ADR-010).
  const removerMembroMutation = useRemoverMembro(clube.id);
  const transferirPropriedadeMutation = useTransferirPropriedade(clube.id);
  const [conviteAberto, setConviteAberto] = useState(false);

  async function remover(m: Membro): Promise<void> {
    try {
      await removerMembroMutation.mutateAsync(m.id);
      toast({ variant: 'success', title: `${m.atletaNome} removido do club` });
    } catch (err) {
      toast(
        isFailedPrecondition(err)
          ? {
              variant: 'danger',
              title: 'Não é possível remover o owner',
              description: 'Transfira a propriedade do club antes de removê-lo.',
            }
          : { variant: 'danger', title: 'Não foi possível remover o membro' },
      );
    }
  }

  async function transferir(m: Membro): Promise<void> {
    try {
      await transferirPropriedadeMutation.mutateAsync(m.id);
      toast({ variant: 'success', title: `Propriedade transferida para ${m.atletaNome}` });
    } catch (err) {
      toast(
        isFailedPrecondition(err)
          ? { variant: 'danger', title: `${m.atletaNome} já é o owner do club` }
          : { variant: 'danger', title: 'Não foi possível transferir a propriedade' },
      );
    }
  }

  async function enviarConvites(emails: string[]): Promise<void> {
    try {
      const { enviados } = await enviarConvitesPadrao(clube.id, emails);
      toast({ variant: 'success', title: `${enviados} convite(s) enviado(s)` });
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível enviar os convites' });
    }
  }

  return (
    <>
      <MembrosList
        membros={membros}
        loading={loading}
        error={error}
        onConvidar={() => setConviteAberto(true)}
        onRemover={(m) => void remover(m)}
        onTransferir={(m) => void transferir(m)}
      />
      <ConviteModal
        open={conviteAberto}
        onOpenChange={setConviteAberto}
        clube={clube}
        onEnviar={(emails) => void enviarConvites(emails)}
      />
    </>
  );
}

MembrosPage.displayName = 'MembrosPage';
