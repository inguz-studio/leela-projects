// =============================================================================
// Lógica pura do form de Exigências de saúde + regulamento (LEELA-S306-T2 · E04).
// Sem React, testável isolado. As flags e o shape são do kernel (@leela/core):
// `exigenciasSaudePadrao` (default OFF — minimização LGPD RN-146) e
// `versaoRegulamento` (versão efetiva, monotônica server-side RN-149). Aqui só
// se converte o estado do form ⇄ o payload da api-client. O DADO de saúde em si
// NUNCA passa por esta camada (vive isolado em `inscritos/{id}/saude`, RN-147).
// =============================================================================

import type { AtualizarExigenciasRegulamentoInput } from '@leela/api-client';
import { exigenciasSaudePadrao, versaoRegulamento, type Evento } from '@leela/core';

/** Estado controlado do form. */
export interface SaudeRegulamentoValues {
  atestado: boolean;
  parq: boolean;
  regulamento: string;
}

/**
 * Preenche o form a partir do evento: flags de `exigenciasSaude` (ausente ⇒
 * default OFF do kernel, nunca liga coleta por engano) + texto do regulamento
 * (ausente ⇒ vazio). @pure
 */
export function valoresDoEventoSaude(
  evento: Pick<Evento, 'exigenciasSaude' | 'regulamento'>
): SaudeRegulamentoValues {
  const flags = evento.exigenciasSaude ?? exigenciasSaudePadrao();
  return {
    atestado: flags.atestado,
    parq: flags.parq,
    regulamento: evento.regulamento ?? '',
  };
}

/** Monta o payload da api-client (regulamento vazio → null = remover). @pure */
export function construirExigenciasRegulamento(
  values: SaudeRegulamentoValues
): AtualizarExigenciasRegulamentoInput {
  const texto = values.regulamento.trim();
  return {
    exigenciasSaude: { atestado: values.atestado, parq: values.parq },
    regulamento: texto.length > 0 ? texto : null,
  };
}

/** Versão vigente do regulamento (0 = sem regulamento publicado — RN-149). @pure */
export function versaoVigente(evento: Pick<Evento, 'regulamentoVersao'>): number {
  return versaoRegulamento(evento.regulamentoVersao);
}
