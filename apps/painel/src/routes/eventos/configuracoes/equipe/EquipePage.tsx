// =============================================================================
// EquipePage — container da rota `/eventos/:slug/configuracoes/equipe`
// (S304-T3 · E04-L5). Lê `{ evento, papel }` do Outlet da ConfiguracoesLayout
// (que já gateou o acesso à área por papel), lista a equipe e fia as três
// operações: trocar papel (Function), convidar (escrita direta) e remover
// (ConfirmModal §2.15 com preview → Function/delete conforme o vínculo). Toast
// em cada resultado; erro do servidor sobe intacto (§2.12).
// =============================================================================

import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { ConfirmModal, EmptyState, Skeleton, useToast } from '@leela/design-system';
import type { MembroEquipe, PapelEvento } from '@leela/core';
import {
  useConvidarMembroEquipe,
  useRemoverMembroEquipe,
  useSetPapelEquipe,
} from '../../../../lib/query/mutations';
import { useEquipe } from '../../_data/equipe';
import { useTenantSession } from '../../../../lib/session/tenantSession';
import { ConvidarMembroModal } from '../_components/ConvidarMembroModal';
import { EquipeLista } from '../_components/EquipeLista';
import { LABEL_PAPEL, perdeAoRemover } from '../_lib/equipeLabels';
import { papeisConvidaveis } from '../_lib/opcoesPapel';
import type { ConfiguracoesOutletContext } from '../ConfiguracoesLayout';

export function EquipePage(): JSX.Element {
  const { evento, papel } = useOutletContext<ConfiguracoesOutletContext>();
  const session = useTenantSession();
  const { toast } = useToast();

  const { data: membros, loading, error } = useEquipe(evento.id);
  const setPapel = useSetPapelEquipe(evento.id);
  const convidar = useConvidarMembroEquipe({
    eventoId: evento.id,
    tenantId: session.tenantId ?? '',
  });
  const remover = useRemoverMembroEquipe(evento.id);

  const [convidarAberto, setConvidarAberto] = React.useState(false);
  const [alvoRemocao, setAlvoRemocao] = React.useState<MembroEquipe | null>(null);
  const [trocandoUid, setTrocandoUid] = React.useState<string | null>(null);

  async function onTrocarPapel(membro: MembroEquipe, novoPapel: PapelEvento) {
    if (membro.uid === null || novoPapel === membro.papel) return;
    setTrocandoUid(membro.uid);
    try {
      await setPapel.mutateAsync({ uid: membro.uid, papel: novoPapel });
      toast({ variant: 'success', title: `Papel alterado para ${LABEL_PAPEL[novoPapel]}` });
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível trocar o papel' });
    } finally {
      setTrocandoUid(null);
    }
  }

  async function confirmarRemocao() {
    if (!alvoRemocao) return;
    try {
      await remover.mutateAsync(alvoRemocao);
      toast({ variant: 'success', title: 'Membro removido' });
      setAlvoRemocao(null);
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível remover o membro' });
    }
  }

  if (loading) {
    return (
      <div role="status" aria-label="Carregando equipe" className="flex flex-col gap-[var(--spacing-3)]">
        <Skeleton variant="rect" className="h-16" />
        <Skeleton variant="rect" className="h-16" />
        <Skeleton variant="rect" className="h-16" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Não foi possível carregar a equipe"
        description="Tente novamente em instantes. Se persistir, verifique seu acesso a este evento."
      />
    );
  }

  const permitidos = papeisConvidaveis(papel);

  return (
    <>
      <EquipeLista
        membros={membros ?? []}
        gestor={papel}
        gestorUid={session.uid}
        onTrocarPapel={(m, p) => void onTrocarPapel(m, p)}
        onRemover={(m) => setAlvoRemocao(m)}
        onConvidar={() => setConvidarAberto(true)}
        trocandoUid={trocandoUid}
      />

      <ConvidarMembroModal
        open={convidarAberto}
        onOpenChange={setConvidarAberto}
        papeisPermitidos={permitidos}
        onConvidar={(input) => convidar.mutateAsync(input).then(() => undefined)}
      />

      <ConfirmModal
        open={alvoRemocao !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setAlvoRemocao(null);
        }}
        title="Remover membro"
        description="O acesso do membro a este evento é revogado imediatamente."
        target={
          alvoRemocao ? (
            <div className="flex flex-col gap-[var(--spacing-1)]">
              <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                {alvoRemocao.nome}
              </span>
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                {LABEL_PAPEL[alvoRemocao.papel]}
              </span>
            </div>
          ) : undefined
        }
        loses={alvoRemocao ? perdeAoRemover(alvoRemocao.papel) : []}
        keeps={['O histórico do que o membro já fez no evento']}
        confirmLabel="Remover membro"
        loading={remover.isPending}
        onConfirm={() => void confirmarRemocao()}
      />
    </>
  );
}

EquipePage.displayName = 'EquipePage';
