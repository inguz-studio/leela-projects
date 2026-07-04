// =============================================================================
// DesafioEditorPage — container do editor (`/clubes/:slug/desafios/novo`).
// `?id` ausente → modo create; presente → modo edit (pré-preenchido via
// getDesafio). Publicar/salvar montam o payload real (buildParaPublicar +
// buildAcoes) e escrevem via porta (criar/atualizar). Volta à lista ao concluir.
// =============================================================================

import { useMemo } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Skeleton } from '@leela/design-system';
import { DesafioEditor } from './DesafioEditor';
import { buildAcoes, buildParaPublicar, desafioToForm } from '../../_lib/desafioForm';
import type { DesafioFormValues } from '../../_lib/desafioForm';
import {
  atualizarDesafioPadrao,
  criarDesafioPadrao,
  useDesafio,
} from '../../_data/desafios';
import type { ClubeOutletContext } from '../ClubeLayout';

export function DesafioEditorPage(): JSX.Element {
  const { clube } = useOutletContext<ClubeOutletContext>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id');
  const { data: desafio, loading } = useDesafio(clube.id, id);

  const inicial = useMemo(
    () => (desafio ? desafioToForm(desafio) : undefined),
    [desafio],
  );

  function voltar(): void {
    navigate(`/clubes/${clube.slug}/desafios`);
  }

  async function salvar(values: DesafioFormValues, status: 'rascunho' | 'ativo'): Promise<void> {
    const dp = buildParaPublicar(values);
    const comum = {
      nome: dp.nome.trim(),
      descricao: values.descricao.trim(),
      modelo: values.modelo,
      dataInicio: dp.dataInicio,
      dataFim: dp.dataFim,
      status,
      recompensaTipo: values.recompensaTipo,
      visibilidade: values.visibilidade,
      ...(dp.metaTotalPontos !== undefined ? { metaTotalPontos: dp.metaTotalPontos } : {}),
      ...(dp.minimoPorPilar ? { minimoPorPilar: dp.minimoPorPilar } : {}),
    };
    if (id) {
      await atualizarDesafioPadrao(clube.id, id, comum);
    } else {
      await criarDesafioPadrao(clube.id, { tenantId: clube.tenantId, ...comum, acoes: buildAcoes(values) });
    }
    voltar();
  }

  if (id && loading) {
    return (
      <div role="status" aria-label="Carregando desafio" className="flex flex-col gap-[var(--spacing-4)]">
        <Skeleton variant="rect" className="h-40" />
        <Skeleton variant="rect" className="h-80" />
      </div>
    );
  }

  return (
    <DesafioEditor
      modo={id ? 'edit' : 'create'}
      inicial={inicial}
      onPublicar={(v) => salvar(v, 'ativo')}
      onSalvarRascunho={(v) => salvar(v, 'rascunho')}
      onCancelar={voltar}
    />
  );
}

DesafioEditorPage.displayName = 'DesafioEditorPage';
