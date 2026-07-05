// =============================================================================
// ConfiguracoesPage - container das configuracoes (`/clubes/:slug/
// configuracoes`). Persiste os campos do clube via atualizarClube (write real);
// moderacao/permissoes dao feedback (V1). O fluxo de exclusao (modal LGPD) e
// ligado no commit S110-T2.
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import { useToast } from '@leela/design-system';
import type { AtualizarClubeInput } from '@leela/api-client';
import { ConfiguracoesView } from './ConfiguracoesView';
import { atualizarClubePadrao } from '../../_data/clubes';
import type { ClubeOutletContext } from '../ClubeLayout';

export function ConfiguracoesPage(): JSX.Element {
  const { clube } = useOutletContext<ClubeOutletContext>();
  const { toast } = useToast();

  async function salvar(patch: AtualizarClubeInput): Promise<void> {
    try {
      await atualizarClubePadrao(clube.slug, patch);
      toast({ variant: 'success', title: 'Alterações salvas' });
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível salvar as alterações' });
    }
  }

  return (
    <ConfiguracoesView
      clube={clube}
      onSalvar={salvar}
      onSalvarPreferencias={(rotulo) => toast({ variant: 'success', title: `${rotulo} atualizada` })}
      onDeletar={() => toast({ variant: 'info', title: 'Fluxo de exclusão disponível em breve' })}
    />
  );
}

ConfiguracoesPage.displayName = 'ConfiguracoesPage';
