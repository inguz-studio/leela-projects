// =============================================================================
// apps/landing/lib/estadoVenda.ts
//
// Derivações PURAS da superfície pública (S1201-T3), compostas 100% sobre os
// primitivos de `@leela/core` (loteAtivo/loteEsgotado/loteEncerrado) — nada de
// aritmética de preço ou regra de virada reimplementada aqui (reuso-first).
//
// Também concentra o "relógio do servidor" (`agoraDoServidor`): o instante de
// observação passado a `precoVigente`/`loteAtivo`. Default = relógio real. Um
// override opcional `LEELA_CLOCK` (ISO) permite observar o seed no estado para
// o qual foi escrito (Lote 2 vigente na janela fev–abr/2026) sem FABRICAR
// preço — o preço continua derivado dos lotes reais no instante escolhido.
// =============================================================================

import { loteAtivo, loteEsgotado, type Lote, type StatusEvento } from '@leela/core';
import type { EstadoVenda } from './tipos';

/**
 * Instante de observação do servidor. Override honesto por `LEELA_CLOCK` (ISO);
 * data inválida cai no relógio real com aviso. Ver nota no header.
 */
export function agoraDoServidor(): Date {
  const override = process.env['LEELA_CLOCK'];
  if (override !== undefined && override.trim().length > 0) {
    const d = new Date(override);
    if (!Number.isNaN(d.getTime())) return d;
    console.warn(`[estadoVenda] LEELA_CLOCK inválido ("${override}") — usando relógio real`);
  }
  return new Date();
}

/**
 * Um evento com este `status` é legível publicamente? (gate S1200/S1201).
 * Só `publicado`/`ao_vivo` são públicos; `rascunho`/`encerrado` → não (a rota
 * resolve 404). Puro e testável sem Firebase.
 */
export function statusEhPublico(status: StatusEvento): boolean {
  return status === 'publicado' || status === 'ao_vivo';
}

/** Lotes agrupados por modalidade — entrada da derivação de estado. */
export interface ModalidadeLotes {
  modalidade: string;
  lotes: Lote[];
}

/**
 * Estado público de venda do evento (S1201-T3):
 * - `aberto`   → existe pelo menos uma modalidade com lote ATIVO no instante.
 * - `esgotado` → prova ainda não passou, mas a janela corrente de toda
 *                modalidade está sem lote ativo POR QUANTIDADE (vendidos ≥ limite).
 * - `encerrado`→ demais casos (data passada ou janelas encerradas por tempo).
 *
 * Composição pura de `loteAtivo`/`loteEsgotado` — a virada RN-300/ADR-012 mora
 * no core, não aqui.
 */
export function deriveEstadoVenda(
  modalidades: readonly ModalidadeLotes[],
  dataEvento: Date,
  agora: Date,
): EstadoVenda {
  const algumAtivo = modalidades.some((m) => loteAtivo(m.lotes, agora) !== null);
  if (algumAtivo) return 'aberto';

  const eventoPassou = agora.getTime() >= dataEvento.getTime();
  if (eventoPassou) return 'encerrado';

  // Sem lote ativo e prova no futuro: é esgotado se, em toda modalidade com
  // lotes, a janela que cobre `agora` existe e está esgotada por quantidade.
  const temLotes = modalidades.some((m) => m.lotes.length > 0);
  if (!temLotes) return 'encerrado';

  const esgotadoPorQuantidade = modalidades.every((m) => {
    if (m.lotes.length === 0) return true;
    return m.lotes.some((l) => {
      const cobreAgora =
        agora.getTime() >= l.inicioEm.toMillis() && agora.getTime() < l.fimEm.toMillis();
      return cobreAgora && loteEsgotado(l);
    });
  });

  return esgotadoPorQuantidade ? 'esgotado' : 'encerrado';
}

/** A inscrição está disponível? (só quando a venda está aberta). */
export function inscricaoDisponivel(estado: EstadoVenda): boolean {
  return estado === 'aberto';
}

/** Mensagem pública do estado de venda (CTA desabilitado / rótulo). */
export function rotuloEstadoVenda(estado: EstadoVenda): string {
  switch (estado) {
    case 'aberto':
      return 'Inscrições abertas';
    case 'esgotado':
      return 'Esgotado';
    case 'encerrado':
      return 'Inscrições encerradas';
  }
}
