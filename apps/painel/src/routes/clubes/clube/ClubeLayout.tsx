// =============================================================================
// ClubeLayout — container do layout de `/clubes/:slug/*`. Carrega o clube por
// slug (leitura O(1)), deriva a aba ativa do pathname e provê o clube às rotas-
// filhas via Outlet context. Skeleton no load, EmptyState quando não encontrado.
// Implementa o copiar-código (RN-101) com clipboard + toast.
// =============================================================================

import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Skeleton, useToast } from '@leela/design-system';
import type { Clube } from '@leela/core';
import { ClubeShell } from './ClubeShell';
import { abaAtiva } from '../_lib/subnav';
import { useClube } from '../_data/clubes';

export interface ClubeOutletContext {
  clube: Clube;
}

export function ClubeLayout(): JSX.Element {
  const { slug = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: clube, loading, error } = useClube(slug);

  if (loading) {
    return (
      <div role="status" aria-label="Carregando club" className="flex flex-col gap-[var(--spacing-4)]">
        <Skeleton variant="rect" className="h-[var(--header-height)]" />
        <Skeleton variant="rect" className="h-[var(--subnav-height)]" />
        <div className="p-[var(--spacing-6)]">
          <Skeleton variant="rect" className="h-60" />
        </div>
      </div>
    );
  }

  if (error || !clube) {
    return (
      <EmptyState
        title="Club não encontrado"
        description="Ele pode ter sido removido ou você não tem acesso."
        action={
          <Button variant="primary" onClick={() => navigate('/clubes')}>
            Voltar para clubes
          </Button>
        }
      />
    );
  }

  const ativa = abaAtiva(location.pathname, clube.slug);
  const context: ClubeOutletContext = { clube };

  async function copiarCodigo(): Promise<void> {
    try {
      await navigator.clipboard?.writeText(clube!.codigoConvite);
      toast({ variant: 'success', title: 'Código de convite copiado' });
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível copiar o código' });
    }
  }

  return (
    <ClubeShell clube={clube} ativa={ativa} onCopiarCodigo={() => void copiarCodigo()}>
      <Outlet context={context} />
    </ClubeShell>
  );
}

ClubeLayout.displayName = 'ClubeLayout';
