// =============================================================================
// packages/core/src/clubs/desafio-validacao.ts
//
// Validação de PUBLICAÇÃO de desafio por modelo (LEELA-E05 · S106-T1).
// Função pura — usada pelo editor (S106-T2, botão Publicar) e por qualquer
// write path que promova rascunho → ativo.
//
// RN-110 — modelos: A (meta por ação), B (meta de pontos), C (equilíbrio).
// RN-111 — Modelo C é o ÚNICO que opera os 3 pilares simultaneamente:
//          publicar exige metaTotalPontos + minimoPorPilar > 0 para CADA
//          um dos 3 pilares.
// =============================================================================

import type { Pilar } from './catalogo-acoes';
import { PILARES } from './catalogo-acoes';
import type { AcaoDesafio, ModeloDesafio } from './desafio';

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/** Subconjunto do desafio necessário para validar publicação. */
export interface DesafioParaPublicar {
  nome: string;
  modelo: ModeloDesafio;
  dataInicio: Date;
  dataFim: Date;
  metaTotalPontos?: number;
  minimoPorPilar?: Partial<Record<Pilar, number>>;
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

/**
 * Valida um desafio para publicação. Retorna a lista de erros (vazia =
 * pode publicar). Erros são copy-neutras — a tela formata a exibição.
 */
export function validarPublicacao(
  desafio: DesafioParaPublicar,
  acoes: readonly AcaoDesafio[]
): string[] {
  const erros: string[] = [];

  if (!desafio.nome?.trim()) {
    erros.push('nome é obrigatório');
  }

  if (desafio.dataFim.getTime() <= desafio.dataInicio.getTime()) {
    erros.push('dataFim deve ser posterior a dataInicio');
  }

  if (acoes.length === 0) {
    erros.push('selecione ao menos 1 ação do catálogo');
  }

  switch (desafio.modelo) {
    case 'A': {
      // Meta por ação: TODA ação selecionada precisa de meta > 0
      const semMeta = acoes.filter(
        (a) => a.meta === undefined || a.meta <= 0
      );
      if (semMeta.length > 0) {
        erros.push(
          `Modelo A exige meta em cada ação (faltando: ${semMeta
            .map((a) => a.acaoRef)
            .join(', ')})`
        );
      }
      break;
    }

    case 'B': {
      if (!desafio.metaTotalPontos || desafio.metaTotalPontos <= 0) {
        erros.push('Modelo B exige metaTotalPontos > 0');
      }
      break;
    }

    case 'C': {
      if (!desafio.metaTotalPontos || desafio.metaTotalPontos <= 0) {
        erros.push('Modelo C exige metaTotalPontos > 0');
      }
      // RN-111: mínimo por pilar para os 3 pilares
      const faltando = PILARES.filter((pilar) => {
        const minimo = desafio.minimoPorPilar?.[pilar];
        return minimo === undefined || minimo <= 0;
      });
      if (faltando.length > 0) {
        erros.push(
          `Modelo C exige mínimo por pilar nos 3 pilares (RN-111 — ` +
            `faltando: ${faltando.join(', ')})`
        );
      }
      break;
    }
  }

  return erros;
}

/** Conveniência para o botão Publicar: true = sem erros. */
export function podePublicar(
  desafio: DesafioParaPublicar,
  acoes: readonly AcaoDesafio[]
): boolean {
  return validarPublicacao(desafio, acoes).length === 0;
}
