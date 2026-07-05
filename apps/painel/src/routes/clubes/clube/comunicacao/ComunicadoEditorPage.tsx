// =============================================================================
// ComunicadoEditorPage — container do editor (`/clubes/:slug/comunicacao/nova`).
// `?id` ausente → create; presente → edit (pré-preenchido via getComunicado).
// Monta o agregado de segmentação a partir do clube (qtdMembrosAtivos → 'todos')
// e persiste via porta (rascunho/agendado; 'enviado' é da Function).
// =============================================================================

import { useMemo } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Skeleton } from '@leela/design-system';
import type { AgregadosSegmentacao } from '@leela/core';
import { ComunicadoEditor } from './ComunicadoEditor';
import {
  buildComunicadoInput,
  buildSegmento,
  comunicadoToForm,
  type ComunicadoFormValues,
} from '../../_lib/comunicadoForm';
import {
  atualizarComunicadoPadrao,
  criarComunicadoPadrao,
  useComunicado,
} from '../../_data/comunicados';
import type { ClubeOutletContext } from '../ClubeLayout';

export function ComunicadoEditorPage(): JSX.Element {
  const { clube } = useOutletContext<ClubeOutletContext>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id');
  const { data: comunicado, loading } = useComunicado(clube.id, id);

  const inicial = useMemo(
    () => (comunicado ? comunicadoToForm(comunicado) : undefined),
    [comunicado],
  );

  // Agregados de segmentação: só 'todos' resolve com dado real (E13 traz o resto).
  const agregados: AgregadosSegmentacao = {
    totalMembrosAtivos: clube.qtdMembrosAtivos,
    participantesPorDesafio: {},
    ativosPorJanela: {},
    membrosPorPilar: {},
  };

  function voltar(): void {
    navigate(`/clubes/${clube.slug}/comunicacao`);
  }

  async function salvar(
    values: ComunicadoFormValues,
    status: 'rascunho' | 'agendado',
  ): Promise<void> {
    const input = buildComunicadoInput(values);
    const agendadoPara =
      status === 'agendado' && values.agendadoData && values.agendadoHora
        ? new Date(`${values.agendadoData}T${values.agendadoHora}`)
        : undefined;
    const comum = {
      titulo: input.titulo,
      conteudo: input.conteudo,
      canal: input.canal,
      origem: 'manual' as const,
      segmento: buildSegmento(values),
      status,
      ...(agendadoPara ? { agendadoPara } : {}),
      ...(input.capaUrl ? { capaUrl: input.capaUrl } : {}),
    };
    if (id) {
      // Modo EDIT atualiza o doc existente (fix S2 — antes duplicava).
      await atualizarComunicadoPadrao(clube.id, id, comum);
    } else {
      await criarComunicadoPadrao(clube.id, { tenantId: clube.tenantId, ...comum });
    }
    voltar();
  }

  if (id && loading) {
    return (
      <div role="status" aria-label="Carregando comunicado" className="flex flex-col gap-[var(--spacing-4)]">
        <Skeleton variant="rect" className="h-40" />
        <Skeleton variant="rect" className="h-80" />
      </div>
    );
  }

  return (
    <ComunicadoEditor
      modo={id ? 'edit' : 'create'}
      inicial={inicial}
      agregados={agregados}
      onSalvar={salvar}
      onCancelar={voltar}
    />
  );
}

ComunicadoEditorPage.displayName = 'ComunicadoEditorPage';
