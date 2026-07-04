// =============================================================================
// Alertas operacionais do Overview (S202-T2) — derivação pura do estado do
// evento (status + data + agregados). Não inventa dados: só o que já existe
// no doc `eventos/{slug}` (L1). Alertas mais ricos (estoque de kit por SKU)
// dependem de aprovisionamento (S210, fora da Onda 1) — ver SUMMARY.
// =============================================================================

import type { Evento } from '@leela/core';
import { diasParaEvento } from './format';

export type SeveridadeAlerta = 'critico' | 'aviso' | 'info';

export interface AlertaOperacional {
  id: string;
  severidade: SeveridadeAlerta;
  mensagem: string;
}

/** Janela (em dias) a partir da qual "evento se aproxima" vira aviso. */
export const JANELA_PROXIMIDADE_DIAS = 7;

/**
 * Deriva os alertas inline do Overview a partir do evento.
 * Ordena por severidade (crítico → aviso → info).
 */
export function derivaAlertas(
  evento: Pick<Evento, 'status' | 'data' | 'qtdInscritos'>,
  agora: Date = new Date(),
): AlertaOperacional[] {
  const alertas: AlertaOperacional[] = [];

  if (evento.status === 'rascunho') {
    alertas.push({
      id: 'rascunho',
      severidade: 'aviso',
      mensagem: 'Evento em rascunho. Publique para gerar a página pública e o QR.',
    });
  }

  const dias = diasParaEvento(evento.data, agora);
  if (
    dias !== null &&
    dias >= 0 &&
    dias <= JANELA_PROXIMIDADE_DIAS &&
    (evento.status === 'publicado' || evento.status === 'ao_vivo')
  ) {
    alertas.push({
      id: 'proximidade',
      severidade: dias <= 2 ? 'critico' : 'aviso',
      mensagem:
        dias === 0
          ? 'O evento é hoje. Prepare o balcão de entrega.'
          : `Faltam ${dias} ${dias === 1 ? 'dia' : 'dias'} para o evento.`,
    });
  }

  if (evento.status === 'publicado' && evento.qtdInscritos === 0) {
    alertas.push({
      id: 'sem-inscritos',
      severidade: 'info',
      mensagem: 'Ainda sem inscritos. Divulgue a página pública para começar a vender.',
    });
  }

  const ordem: Record<SeveridadeAlerta, number> = { critico: 0, aviso: 1, info: 2 };
  return alertas.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);
}
