// =============================================================================
// DesafiosPage — container da tela de desafios (`/clubes/:slug/desafios`).
// Pega o clube do Outlet context e busca a lista (L1/L2 prontos). Navegação:
// "+ Criar desafio" → editor sem `?id`; "Editar"/"Ver detalhes" → editor com
// `?id`. Ações que ainda dependem de mutação (duplicar/encerrar/excluir/
// compartilhar) dão feedback via Toast (recorte V1 = listar/criar).
// =============================================================================

import { useNavigate, useOutletContext } from 'react-router-dom';
import { useToast } from '@leela/design-system';
import type { Desafio } from '@leela/core';
import { DesafiosList, type AcaoDesafioId } from './DesafiosList';
import { useDesafios } from '../../_data/desafios';
import type { ClubeOutletContext } from '../ClubeLayout';

export function DesafiosPage(): JSX.Element {
  const { clube } = useOutletContext<ClubeOutletContext>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: desafios, loading, error } = useDesafios(clube.id);

  function base(): string {
    return `/clubes/${clube.slug}/desafios`;
  }

  function acao(desafio: Desafio, tipo: AcaoDesafioId): void {
    switch (tipo) {
      case 'detalhes':
      case 'editar':
        navigate(`${base()}/novo?id=${desafio.id}`);
        break;
      case 'compartilhar':
        void navigator.clipboard
          ?.writeText(`be-hero.com.br/c/${clube.slug}/desafios/${desafio.id}`)
          .then(() => toast({ variant: 'success', title: 'Link do desafio copiado' }))
          .catch(() => toast({ variant: 'danger', title: 'Não foi possível copiar o link' }));
        break;
      default:
        // duplicar/encerrar/excluir dependem de mutação — fora do recorte V1.
        toast({ variant: 'info', title: 'Disponível em breve' });
    }
  }

  return (
    <DesafiosList
      desafios={desafios}
      loading={loading}
      error={error}
      onCriar={() => navigate(`${base()}/novo`)}
      onAcao={acao}
    />
  );
}

DesafiosPage.displayName = 'DesafiosPage';
