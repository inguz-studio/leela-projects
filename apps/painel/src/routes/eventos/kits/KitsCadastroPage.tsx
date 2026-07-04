// =============================================================================
// KitsCadastroPage — container da rota `/eventos/:slug/kits` (S205-T2 + T3).
// Lê kits + catálogo; o modal de item (S205-T3) cria/edita itens e recarrega
// o catálogo ao salvar.
// =============================================================================

import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { KitsCadastroView } from './KitsCadastroView';
import { ItemKitModal } from './ItemKitModal';
import { useItensKit, useKitMutations, useKits } from '../_data/kits';
import type { EventoOutletContext } from '../evento/EventoLayout';
import type { ItemKit } from '@leela/core';

export function KitsCadastroPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const [reload, setReload] = React.useState(0);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [itemEmEdicao, setItemEmEdicao] = React.useState<ItemKit | null>(null);

  const kits = useKits(evento.id, reload);
  const itens = useItensKit(evento.id, reload);
  const { salvarItem } = useKitMutations(evento.id);

  function abrirNovo(): void {
    setItemEmEdicao(null);
    setModalAberto(true);
  }
  function abrirEdicao(item: ItemKit): void {
    setItemEmEdicao(item);
    setModalAberto(true);
  }

  return (
    <>
      <KitsCadastroView
        slug={evento.slug}
        kits={kits.data ?? []}
        itens={itens.data ?? []}
        loading={kits.loading || itens.loading}
        error={kits.error ?? itens.error}
        onNovoItem={abrirNovo}
        onEditarItem={abrirEdicao}
      />
      <ItemKitModal
        open={modalAberto}
        onOpenChange={setModalAberto}
        item={itemEmEdicao}
        onSalvar={salvarItem}
        onSaved={() => setReload((n) => n + 1)}
      />
    </>
  );
}

KitsCadastroPage.displayName = 'KitsCadastroPage';
