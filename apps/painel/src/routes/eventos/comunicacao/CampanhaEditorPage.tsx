// =============================================================================
// CampanhaEditorPage — container do editor (`/eventos/:slug/comunicacao/nova`).
// `?id` ausente → create; presente → edit (pré-preenchido via getCampanha).
// Injeta as portas reais no editor: estimativa ao vivo (callable), persistência
// rascunho/agendado (write direto — Rules-guarded) e envio (callable idempotente
// — cota RN-133 no servidor). Cada escrita INVALIDA as chaves de leitura
// afetadas (read-your-writes · ADR-010): a lista e o histórico refletem sem
// reload. 'enviado'/alcance são EXCLUSIVOS da Function — o cliente nunca os grava.
// =============================================================================

import { useMemo } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@leela/design-system';
import type { CriarCampanhaInput, EnviarCampanhaResult } from '@leela/api-client';
import type { SegmentoCampanha } from '@leela/core';
import { CampanhaEditor, type SalvarCampanhaIntent } from './CampanhaEditor';
import {
  buildCampanhaInput,
  campanhaToForm,
  type CampanhaFormValues,
} from '../_lib/campanhaForm';
import {
  atualizarCampanhaPadrao,
  criarCampanhaPadrao,
  enviarCampanhaPorta,
  estimarAlcancePorta,
  useCampanha,
} from '../_data/campanhas';
import { queryKeys } from '../../../lib/query/keys';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function CampanhaEditorPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const id = params.get('id');
  const { data: campanha, loading } = useCampanha(evento.id, id);

  const inicial = useMemo(
    () => (campanha ? campanhaToForm(campanha) : undefined),
    [campanha],
  );

  function voltar(): void {
    navigate(`/eventos/${evento.slug}/comunicacao`);
  }

  function invalidarLista(): void {
    void queryClient.invalidateQueries({ queryKey: queryKeys.campanhas.doEvento(evento.id) });
    if (id) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.campanhas.detalhe(evento.id, id) });
    }
  }

  /** Monta o payload compartilhado (create sem tenantId; update = Omit). */
  function payload(
    values: CampanhaFormValues,
    status: 'rascunho' | 'agendado',
  ): Omit<CriarCampanhaInput, 'tenantId'> {
    const input = buildCampanhaInput(values);
    const agendadoPara =
      status === 'agendado' && values.agendadoData && values.agendadoHora
        ? new Date(`${values.agendadoData}T${values.agendadoHora}`)
        : undefined;
    return {
      titulo: input.titulo,
      conteudo: input.conteudo,
      canal: input.canal,
      origem: 'manual',
      segmento: input.segmento as SegmentoCampanha,
      status,
      ...(agendadoPara ? { agendadoPara } : {}),
      ...(input.capaUrl ? { capaUrl: input.capaUrl } : {}),
    };
  }

  /** Persiste (create/update) e devolve o id do doc gravado. */
  async function persistir(
    values: CampanhaFormValues,
    status: 'rascunho' | 'agendado',
  ): Promise<string> {
    const dados = payload(values, status);
    if (id) {
      await atualizarCampanhaPadrao(evento.id, id, dados);
      return id;
    }
    const { campanhaId } = await criarCampanhaPadrao(evento.id, {
      tenantId: evento.tenantId,
      ...dados,
    });
    return campanhaId;
  }

  async function onSalvar(
    values: CampanhaFormValues,
    intent: SalvarCampanhaIntent,
  ): Promise<void> {
    await persistir(values, intent === 'agendar' ? 'agendado' : 'rascunho');
    invalidarLista();
    voltar();
  }

  async function onEnviar(values: CampanhaFormValues): Promise<EnviarCampanhaResult> {
    // Salva o estado atual como rascunho (persiste os edits), depois dispara.
    // O carimbo 'enviado'/alcance é do servidor; um bloqueio deixa o rascunho.
    const campanhaId = await persistir(values, 'rascunho');
    const resultado = await enviarCampanhaPorta({ eventoId: evento.id, campanhaId });
    invalidarLista();
    if ('ok' in resultado) {
      // O envio registra no log de comunicação (FABLE-G) → invalida o histórico.
      void queryClient.invalidateQueries({ queryKey: ['comunicacoes'] });
      voltar();
    }
    return resultado;
  }

  if (id && loading) {
    return (
      <div role="status" aria-label="Carregando campanha" className="flex flex-col gap-[var(--spacing-4)]">
        <Skeleton variant="rect" className="h-40" />
        <Skeleton variant="rect" className="h-80" />
      </div>
    );
  }

  return (
    <CampanhaEditor
      modo={id ? 'edit' : 'create'}
      inicial={inicial}
      onEstimar={(segmento: Pick<SegmentoCampanha, 'tipo' | 'referencia'>) =>
        estimarAlcancePorta({ eventoId: evento.id, segmento }).then((r) => r.tamanho)
      }
      onSalvar={onSalvar}
      onEnviar={onEnviar}
      onCancelar={voltar}
    />
  );
}

CampanhaEditorPage.displayName = 'CampanhaEditorPage';
