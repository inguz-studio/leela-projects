// =============================================================================
// Reanimação escopada por filtro (REFACTOR item 10).
//
// A regra: trocar um filtro reanima SÓ o gráfico afetado. O comportamento
// anterior era um contador global — um clique em qualquer filtro fazia a tela
// inteira piscar, e uma tela que pisca inteira a cada clique lê como falha, não
// como resposta.
//
// O mecanismo é um contador POR FILTRO, e ele é binário: alterna entre dois
// nomes de keyframe idênticos (`revela-grafico-a` / `-b`, em
// `tailwind.config.ts`). Trocar o `animation-name` é o que faz o browser rodar
// a animação outra vez — sem remontar o nó, então o estado do componente
// sobrevive à troca. `key` mudando também reanimaria, mas remonta: perderia o
// recorte do próprio card no clique seguinte.
//
// Cada card passa a chave DELE. Se dois cards passarem a mesma chave, os dois
// reanimam juntos — e aí o problema não é este arquivo, é o filtro
// compartilhado que o item 9 acabou de tirar da tela.
// =============================================================================

import { useState } from 'react';

/** Os dois nomes de keyframe. Idênticos no efeito, distintos no nome. */
export type FaseDeReanimacao = 'a' | 'b';

const CLASSE_POR_FASE: Record<FaseDeReanimacao, string> = {
  a: 'animate-revela-grafico-a',
  b: 'animate-revela-grafico-b',
};

/**
 * Classe de animação da fase, já com o desligamento por preferência de
 * movimento. `motion-reduce:animate-none` mantém o ESTADO FINAL (o keyframe
 * termina no natural, e sem animação o elemento nasce natural) — quem pediu
 * menos movimento recebe o gráfico pronto, nunca um gráfico invisível.
 * @pure
 */
export function classeDeReanimacao(fase: FaseDeReanimacao): string {
  return `${CLASSE_POR_FASE[fase]} motion-reduce:animate-none`;
}

/** A fase seguinte. Sai daqui para poder ser testada sem React. @pure */
export function proximaFase(fase: FaseDeReanimacao): FaseDeReanimacao {
  return fase === 'a' ? 'b' : 'a';
}

/**
 * Alterna a fase toda vez que `chave` muda — e só então.
 *
 * O ajuste acontece DURANTE o render (padrão documentado do React para
 * "derivar estado de props"): o React descarta o render em curso e refaz com o
 * novo estado antes de pintar, então não há frame com a classe velha nem
 * commit extra. Um `useEffect` pintaria o gráfico já formado e só depois
 * dispararia a revelação — a animação apareceria como um segundo lampejo.
 */
export function useReanimacao(chave: string): FaseDeReanimacao {
  const [estado, setEstado] = useState<{ chave: string; fase: FaseDeReanimacao }>({
    chave,
    fase: 'a',
  });
  if (estado.chave !== chave) {
    setEstado({ chave, fase: proximaFase(estado.fase) });
  }
  return estado.fase;
}
