// =============================================================================
// packages/core/src/clubs/comunicado-validacao.ts
//
// Validações de formulário do comunicado do CLUBE (LEELA-E05 · S109-T1).
//
// E06-L1-T1 (extração Camada A): o MIOLO agnóstico (título/conteúdo/canal/
// capa/160) mora em `core/comunicacao/validacao-base.ts` — compartilhado com
// a campanha do evento (E06). Aqui fica SÓ a composição: miolo + predicado
// da taxonomia de segmento do clube. API pública 100% estável
// (COMUNICADO_TITULO_MIN, ComunicadoInput, validarComunicado, truncarPush).
//
// O que é de servidor (limite 4 push/semana — RN-133) fica na Function de
// envio (functions/shared/comunicacaoEnvio.ts), não aqui.
// =============================================================================

import type { CanalComunicado } from '../comunicacao/canal';
import { truncarPush } from '../comunicacao/canal';
import {
  COMUNICACAO_CONTEUDO_MIN,
  COMUNICACAO_TITULO_MIN,
  validarComunicacaoBase,
} from '../comunicacao/validacao-base';
import type { Segmento } from './comunicado';
import { isTipoSegmento } from './comunicado';

// ---------------------------------------------------------------------------
// Limites de formulário (SPEC-02) — aliases estáveis da fonte única
// ---------------------------------------------------------------------------

export const COMUNICADO_TITULO_MIN = COMUNICACAO_TITULO_MIN;
export const COMUNICADO_CONTEUDO_MIN = COMUNICACAO_CONTEUDO_MIN;

// Truncamento de push (RN-134) — re-export da fonte única (API estável).
export { truncarPush };

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/** Payload do formulário do editor de comunicado. */
export interface ComunicadoInput {
  titulo: string;
  conteudo: string;
  canal: CanalComunicado[];
  segmento?: Segmento | null;
  capaUrl?: string;
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

/**
 * Valida o comunicado para envio/agendamento. Retorna a lista de erros
 * (vazia = válido). Copy-neutra — a tela formata os toasts.
 * Composição: miolo agnóstico (Camada A) + segmento do clube (Camada C).
 */
export function validarComunicado(input: ComunicadoInput): string[] {
  const base: Parameters<typeof validarComunicacaoBase>[0] = {
    titulo: input.titulo,
    conteudo: input.conteudo,
    canal: input.canal,
  };
  if (input.capaUrl !== undefined) base.capaUrl = input.capaUrl;
  const erros = validarComunicacaoBase(base);

  if (!input.segmento || !isTipoSegmento(input.segmento.tipo)) {
    erros.push('segmento é obrigatório');
  } else if (input.segmento.tipo !== 'todos' && !input.segmento.referencia) {
    erros.push('segmento requer referência (desafio, pilar ou janela)');
  }

  return erros;
}
