'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { cupomDaEntrada, isCodigoCupomValido, normalizarCodigoCupom } from '@leela/core';

// =============================================================================
// CupomTracker — captura do cupom do link, por evento (S1215-T2 · RN-430).
//
// A ASSIMETRIA QUE ISTO CORRIGE. O `?ref=` sobrevive à navegação porque o
// `RefTracker` o guarda; o cupom sobrevivia apenas enquanto a querystring
// existisse, porque só o CTA a copiava para o checkout. Quem chegava pelo link
// do afiliado, abria o regulamento e voltava, mantinha a atribuição e PERDIA o
// desconto — acabava pagando cheio num link que prometia desconto.
//
// MESMA DISCIPLINA DO `ref`, deliberadamente:
//   - guarda por EVENTO (`leela:cupom:{slug}`);
//   - MESMO código revisitado preserva a captura mais ANTIGA;
//   - código DIFERENTE sobrescreve (last-link-wins);
//   - storage indisponível (modo privado, cota) degrada em silêncio — a
//     jornada de compra nunca quebra por causa de um parâmetro de marketing.
//
// CHAVE SEPARADA da do `ref`, e não um campo dentro dela: link com cupom e sem
// `ref` existe (cupom geral do evento), e escrever no registro da atribuição
// para guardar um cupom significaria mexer no dado que decide COMISSÃO. São
// dois claims independentes, com tempos de vida independentes.
//
// O VALOR É CLAIM DO CLIENTE e nunca é fonte de verdade: existência, vigência,
// gate do afiliado (RN-315) e valor do desconto são decididos no servidor, na
// cotação e de novo na criação da cobrança (RN-430). Aqui é conveniência.
//
// `c` ENTRA E NÃO SAI: a leitura é `cupomDaEntrada` do core, que aceita `cupom`
// e o apelido histórico `c` (RN-429) — link já impresso em bio de rede social
// continua valendo.
// =============================================================================

export function chaveCupomStorage(slug: string): string {
  return `leela:cupom:${slug}`;
}

export interface CupomCapturado {
  codigo: string;
  capturadoEmMillis: number;
}

/**
 * Lê a captura vigente (`null` = nada capturado, ilegível ou fora do padrão).
 *
 * Revalida o código pela MESMA guarda da escrita: o localStorage é editável por
 * quem estiver no navegador, e um valor plantado à mão não pode virar um
 * `cupomCodigo` torto viajando até a cotação.
 */
export function lerCupomCapturado(slug: string): CupomCapturado | null {
  try {
    const raw = window.localStorage.getItem(chaveCupomStorage(slug));
    if (raw === null) return null;
    const dados = JSON.parse(raw) as Partial<CupomCapturado>;
    if (typeof dados.codigo !== 'string') return null;
    const codigo = normalizarCodigoCupom(dados.codigo);
    if (
      !isCodigoCupomValido(codigo) ||
      typeof dados.capturadoEmMillis !== 'number' ||
      !Number.isInteger(dados.capturadoEmMillis) ||
      dados.capturadoEmMillis <= 0
    ) {
      return null;
    }
    return { codigo, capturadoEmMillis: dados.capturadoEmMillis };
  } catch {
    return null;
  }
}

export function CupomTracker({ slug }: { slug: string }): null {
  const params = useSearchParams();
  // Primitivos como dependências: `params` é um objeto novo a cada render.
  const canonico = params.get('cupom');
  const apelido = params.get('c');

  useEffect(() => {
    const codigo = cupomDaEntrada((chave) => (chave === 'cupom' ? canonico : apelido));
    if (codigo === null) return;
    try {
      const atual = lerCupomCapturado(slug);
      if (atual !== null && atual.codigo === codigo) return; // 1ª captura vale
      window.localStorage.setItem(
        chaveCupomStorage(slug),
        JSON.stringify({ codigo, capturadoEmMillis: Date.now() }),
      );
    } catch {
      // Storage indisponível: o cupom continua valendo enquanto a querystring
      // viajar (o CTA a copia). O que se perde é só a sobrevivência à
      // navegação — nunca a compra.
    }
  }, [canonico, apelido, slug]);

  return null;
}
