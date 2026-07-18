// =============================================================================
// ConfiguracoesPage - container das configuracoes (`/clubes/:slug/
// configuracoes`). Persiste os campos do club via atualizarClube (write real);
// moderacao/permissoes ficam "Em breve" na view (fix S4 — sem sucesso falso).
// O fluxo de exclusao abre o modal LGPD (S110-T2); deletar/exportar chamam os
// callables (Functions Fable S110-T2).
// =============================================================================

import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useToast } from '@leela/design-system';
import {
  problemaDoArquivoImagem,
  uploadCapaClube,
  type AtualizarClubeInput,
} from '@leela/api-client';
import { ConfiguracoesView } from './ConfiguracoesView';
import { DeletarClubeModal } from './DeletarClubeModal';
import {
  atualizarClubePadrao,
  deletarClubePadrao,
  exportarDadosPadrao,
} from '../../_data/clubes';
import type { ClubeOutletContext } from '../ClubeLayout';

export function ConfiguracoesPage(): JSX.Element {
  const { clube } = useOutletContext<ClubeOutletContext>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deletarAberto, setDeletarAberto] = useState(false);

  // Upload da capa (LEELA-R5): valida tipo/tamanho ANTES do roundtrip (a
  // mensagem do Error vira erro inline do FileInput na view); a fronteira real
  // são as storage.rules (ownership por firestore.get do tenant do clube).
  async function uploadCapa(file: File): Promise<string> {
    const problema = problemaDoArquivoImagem(file);
    if (problema) throw new Error(problema);
    return uploadCapaClube(clube.id, file);
  }

  async function salvar(patch: AtualizarClubeInput): Promise<void> {
    try {
      await atualizarClubePadrao(clube.slug, patch);
      toast({ variant: 'success', title: 'Alterações salvas' });
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível salvar as alterações' });
    }
  }

  async function exportar(): Promise<void> {
    try {
      await exportarDadosPadrao(clube.id);
      toast({ variant: 'success', title: 'Exportação iniciada', description: 'Você receberá o link por email (retenção LGPD 90 dias).' });
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível iniciar a exportação' });
    }
  }

  async function deletar(): Promise<void> {
    try {
      await deletarClubePadrao(clube.id);
      toast({ variant: 'success', title: `${clube.nome} excluído` });
      setDeletarAberto(false);
      navigate('/clubes');
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível excluir o clube' });
    }
  }

  return (
    <>
      <ConfiguracoesView
        clube={clube}
        onSalvar={salvar}
        onDeletar={() => setDeletarAberto(true)}
        onUploadCapa={uploadCapa}
      />
      <DeletarClubeModal
        open={deletarAberto}
        onOpenChange={setDeletarAberto}
        nomeClube={clube.nome}
        onExportar={() => void exportar()}
        onConfirmar={() => void deletar()}
      />
    </>
  );
}

ConfiguracoesPage.displayName = 'ConfiguracoesPage';
