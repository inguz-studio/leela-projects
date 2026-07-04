// =============================================================================
// KitEditorPage — container das rotas de edição em tela cheia (S206-T1):
// `/eventos/:slug/kits/novo` e `/eventos/:slug/kits/editar/:kitId` (RN-217, 2
// pontos de entrada). Carrega kit + catálogo, salva e volta ao cadastro.
// =============================================================================

import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Skeleton } from '@leela/design-system';
import { KitEditor } from './KitEditor';
import { useItensKit, useKitMutations, useKits } from '../_data/kits';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function KitEditorPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { kitId } = useParams();
  const navigate = useNavigate();

  const kits = useKits(evento.id);
  const itens = useItensKit(evento.id);
  const { salvar, salvarItem } = useKitMutations(evento.id);

  const carregando = kits.loading || itens.loading;
  const kit = kitId ? kits.data?.find((k) => k.id === kitId) ?? null : null;

  if (carregando) {
    return (
      <div role="status" aria-label="Carregando editor de kit" className="flex flex-col gap-[var(--spacing-4)]">
        <Skeleton variant="rect" className="h-[var(--input-height)]" />
        <Skeleton variant="rect" className="h-60" />
      </div>
    );
  }

  return (
    <KitEditor
      evento={evento}
      kit={kit}
      itens={itens.data ?? []}
      onSalvarKit={salvar}
      onSalvarItem={salvarItem}
      onConcluir={() => navigate(`/eventos/${evento.slug}/kits`)}
    />
  );
}

KitEditorPage.displayName = 'KitEditorPage';
