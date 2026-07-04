// =============================================================================
// packages/core/src/clubs/comunicado-validacao.ts
//
// Validações de formulário do comunicado (LEELA-E05 · S109-T1). Funções
// PURAS — o editor (S109-T2) valida antes de Enviar/Agendar; a Function de
// envio (S108-T1) cuida do que é de servidor (limite 4 push/semana —
// RN-133 fica LÁ, não aqui).
//
// Regras (SPEC-02 + RN-134):
//   - título ≥ 5 chars; conteúdo ≥ 10 chars (após trim);
//   - segmento obrigatório; canal obrigatório (1..2, sem duplicata);
//   - push: corpo ≤ 160 chars (RN-134);
//   - capa só existe para email (RN-135) — push-only com capa é erro.
// =============================================================================

import type { CanalComunicado, Segmento } from './comunicado';
import {
  isCanalComunicado,
  PUSH_MAX_CHARS,
  temCanalPush,
} from './comunicado';
import { isTipoSegmento } from './comunicado';

// ---------------------------------------------------------------------------
// Limites de formulário (SPEC-02)
// ---------------------------------------------------------------------------

export const COMUNICADO_TITULO_MIN = 5;
export const COMUNICADO_CONTEUDO_MIN = 10;

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
 */
export function validarComunicado(input: ComunicadoInput): string[] {
  const erros: string[] = [];

  if ((input.titulo?.trim().length ?? 0) < COMUNICADO_TITULO_MIN) {
    erros.push(`título deve ter no mínimo ${COMUNICADO_TITULO_MIN} caracteres`);
  }

  const conteudo = input.conteudo?.trim() ?? '';
  if (conteudo.length < COMUNICADO_CONTEUDO_MIN) {
    erros.push(
      `conteúdo deve ter no mínimo ${COMUNICADO_CONTEUDO_MIN} caracteres`
    );
  }

  if (!input.canal || input.canal.length === 0) {
    erros.push('selecione ao menos 1 canal (push ou email)');
  } else {
    if (input.canal.some((c) => !isCanalComunicado(c))) {
      erros.push('canal inválido (aceitos: push, email)');
    }
    if (new Set(input.canal).size !== input.canal.length) {
      erros.push('canal duplicado');
    }

    // RN-134: push limita o corpo a 160 chars
    if (temCanalPush(input.canal) && contarChars(conteudo) > PUSH_MAX_CHARS) {
      erros.push(
        `push limita o corpo a ${PUSH_MAX_CHARS} caracteres (RN-134) — ` +
          `atual: ${contarChars(conteudo)}`
      );
    }

    // RN-135: capa é recurso de email; push não suporta
    if (input.capaUrl && !input.canal.includes('email')) {
      erros.push('imagem de capa só é suportada no canal email (RN-135)');
    }
  }

  if (!input.segmento || !isTipoSegmento(input.segmento.tipo)) {
    erros.push('segmento é obrigatório');
  } else if (
    input.segmento.tipo !== 'todos' &&
    !input.segmento.referencia
  ) {
    erros.push('segmento requer referência (desafio, pilar ou janela)');
  }

  return erros;
}

// ---------------------------------------------------------------------------
// Truncamento de push (RN-134)
// ---------------------------------------------------------------------------

/** Conta caracteres por code point (emoji não vira "2 chars"). */
function contarChars(texto: string): number {
  return Array.from(texto).length;
}

/**
 * Trunca o corpo do push em 160 caracteres preservando integridade:
 * corta por CODE POINT (nunca no meio de um surrogate pair/emoji).
 * Texto dentro do limite volta intacto.
 */
export function truncarPush(texto: string): string {
  const pontos = Array.from(texto);
  if (pontos.length <= PUSH_MAX_CHARS) return texto;
  return pontos.slice(0, PUSH_MAX_CHARS).join('');
}
