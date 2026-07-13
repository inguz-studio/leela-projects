// =============================================================================
// packages/core/src/comunicacao/validacao-base.ts
//
// MIOLO AGNÓSTICO da validação de formulário de comunicação (E06-L1-T1 —
// Camada A do plano de extração). Tudo de `validarComunicado` (S109-T1) que
// NÃO depende da taxonomia de segmento:
//   - título ≥ 5 chars; conteúdo ≥ 10 chars (após trim);
//   - canal obrigatório (1..2, dentro do enum, sem duplicata);
//   - push: corpo ≤ 160 chars por CODE POINT (RN-134);
//   - capa só existe para email (RN-135) — push-only com capa é erro.
//
// A taxonomia de segmento é a Camada C (genuinamente por domínio): o clube
// valida `todos|por_desafio|por_pilar|por_engajamento` em
// `clubs/comunicado-validacao.ts`; o evento valida
// `todos_inscritos|por_modalidade|por_kit|por_status` em
// `eventos/campanha.ts`. Cada lado compõe este miolo + seu predicado.
//
// Funções PURAS, copy-neutra — a tela formata os toasts. O que é de
// servidor (limite 4 push/semana — RN-133) fica na Function de envio.
// =============================================================================

import type { CanalComunicado } from './canal';
import {
  contarChars,
  isCanalComunicado,
  PUSH_MAX_CHARS,
  temCanalPush,
} from './canal';

// ---------------------------------------------------------------------------
// Limites de formulário (SPEC-02) — mesmos nos dois lados
// ---------------------------------------------------------------------------

export const COMUNICACAO_TITULO_MIN = 5;
export const COMUNICACAO_CONTEUDO_MIN = 10;

// ---------------------------------------------------------------------------
// Input base (sem segmento — o segmento é da Camada C de cada domínio)
// ---------------------------------------------------------------------------

/** Campos de formulário comuns a comunicado (clube) e campanha (evento). */
export interface ComunicacaoBaseInput {
  titulo: string;
  conteudo: string;
  canal: CanalComunicado[];
  capaUrl?: string;
}

// ---------------------------------------------------------------------------
// Validação base
// ---------------------------------------------------------------------------

/**
 * Valida os campos agnósticos de uma comunicação (título/conteúdo/canal/
 * capa/160). Retorna a lista de erros (vazia = válido). Os validadores de
 * domínio (clube/evento) CONCATENAM os erros do próprio segmento. @pure
 */
export function validarComunicacaoBase(input: ComunicacaoBaseInput): string[] {
  const erros: string[] = [];

  if ((input.titulo?.trim().length ?? 0) < COMUNICACAO_TITULO_MIN) {
    erros.push(
      `título deve ter no mínimo ${COMUNICACAO_TITULO_MIN} caracteres`
    );
  }

  const conteudo = input.conteudo?.trim() ?? '';
  if (conteudo.length < COMUNICACAO_CONTEUDO_MIN) {
    erros.push(
      `conteúdo deve ter no mínimo ${COMUNICACAO_CONTEUDO_MIN} caracteres`
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

  return erros;
}
