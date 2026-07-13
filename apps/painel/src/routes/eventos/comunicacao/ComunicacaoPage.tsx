// =============================================================================
// ComunicacaoPage — container da rota `/eventos/:slug/comunicacao` (E06-L3).
//
// Lê o ∑ (contadores) e a timeline do log FABLE-G via TanStack Query (ADR-010)
// e entrega à View presentational. `podeEnviar` é FALSE por ora: functions/src
// não expõe callable de envio (`enviarCampanha` é E06-L2, futuro) — a View
// mantém o CTA desabilitado honesto. Quando o callable existir, este é o único
// ponto a virar (passar `podeEnviar` derivado da capacidade real).
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import { ComunicacaoView } from './ComunicacaoView';
import { useComunicacoesDoEvento, useResumoComunicacoes } from '../_data/comunicacoes';
import type { EventoOutletContext } from '../evento/EventoLayout';

/** Não há callable de envio de comunicação na V1 (E06-L2 em diante). */
const PODE_ENVIAR = false;

export function ComunicacaoPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const resumo = useResumoComunicacoes(evento.id);
  const timeline = useComunicacoesDoEvento(evento.id);

  return (
    <ComunicacaoView
      resumo={resumo.data}
      timeline={timeline.data}
      loading={resumo.loading || timeline.loading}
      error={resumo.error ?? timeline.error}
      podeEnviar={PODE_ENVIAR}
    />
  );
}

ComunicacaoPage.displayName = 'ComunicacaoPage';
