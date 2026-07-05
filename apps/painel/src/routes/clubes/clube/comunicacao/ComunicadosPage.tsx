// =============================================================================
// ComunicadosPage — container da lista de comunicados
// (`/clubes/:slug/comunicacao`). "+ Nova campanha" → editor sem `?id`; editar/
// ver relatório → editor com `?id`. Ações de mutação (duplicar/excluir/cancelar)
// dão feedback via Toast (recorte V1).
// =============================================================================

import { useNavigate, useOutletContext } from 'react-router-dom';
import { useToast } from '@leela/design-system';
import type { Comunicado } from '@leela/core';
import { ComunicadosList } from './ComunicadosList';
import type { AcaoComunicadoId } from '../../_lib/comunicados';
import { useComunicados } from '../../_data/comunicados';
import type { ClubeOutletContext } from '../ClubeLayout';

export function ComunicadosPage(): JSX.Element {
  const { clube } = useOutletContext<ClubeOutletContext>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: comunicados, loading, error } = useComunicados(clube.id);

  const base = (): string => `/clubes/${clube.slug}/comunicacao`;

  function acao(c: Comunicado, tipo: AcaoComunicadoId): void {
    if (tipo === 'editar' || tipo === 'relatorio') {
      navigate(`${base()}/nova?id=${c.id}`);
      return;
    }
    toast({ variant: 'info', title: 'Disponível em breve' });
  }

  return (
    <ComunicadosList
      comunicados={comunicados}
      loading={loading}
      error={error}
      onNova={() => navigate(`${base()}/nova`)}
      onAcao={acao}
    />
  );
}

ComunicadosPage.displayName = 'ComunicadosPage';
