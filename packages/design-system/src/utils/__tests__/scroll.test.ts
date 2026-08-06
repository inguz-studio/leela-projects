/**
 * Contrato das constantes de rolagem (BUILD-SCROLL-PADRAO).
 *
 * jsdom não faz layout, então nada aqui prova pixel. O que estes testes provam é
 * o CONTRATO: cada constante declara os DOIS eixos, e nenhuma delas pode ser
 * "simplificada" para um eixo só sem ficar vermelha com a explicação junto.
 *
 * O eixo solto é a causa-raiz do "scroll duplo" que o dono reportou três vezes:
 * pela CSS Overflow 3 §3.1, declarar um eixo promove o outro de `visible` para
 * `auto`, e o promovido vira barra no dia em que algum conteúdo o estoura.
 */

import { describe, it, expect } from 'vitest';
import { SCROLL_Y_ONLY, SCROLL_X_ONLY, SCROLL_X_ONLY_SEM_CROMO } from '../scroll';

/** Classes de eixo declaradas por uma constante. */
function eixos(classes: string): { x: string | undefined; y: string | undefined } {
  const tokens = classes.split(/\s+/);
  return {
    x: tokens.find((t) => t.startsWith('overflow-x-')),
    y: tokens.find((t) => t.startsWith('overflow-y-')),
  };
}

describe('as três constantes declaram SEMPRE os dois eixos', () => {
  it.each([
    ['SCROLL_Y_ONLY', SCROLL_Y_ONLY],
    ['SCROLL_X_ONLY', SCROLL_X_ONLY],
    ['SCROLL_X_ONLY_SEM_CROMO', SCROLL_X_ONLY_SEM_CROMO],
  ])('%s declara x e y (senão o CSS promove o que faltar a `auto`)', (_nome, classes) => {
    const { x, y } = eixos(classes);
    expect(x).toBeDefined();
    expect(y).toBeDefined();
  });
});

describe('cada constante rola no eixo que promete e fecha o outro', () => {
  it('SCROLL_Y_ONLY rola na vertical e fecha a horizontal', () => {
    expect(SCROLL_Y_ONLY).toContain('overflow-y-auto');
    expect(SCROLL_Y_ONLY).toContain('overflow-x-hidden');
  });

  it('SCROLL_X_ONLY rola na horizontal e fecha a vertical', () => {
    expect(SCROLL_X_ONLY).toContain('overflow-x-auto');
    expect(SCROLL_X_ONLY).toContain('overflow-y-hidden');
  });

  it('SCROLL_X_ONLY_SEM_CROMO é o SCROLL_X_ONLY sem o desenho da barra', () => {
    expect(SCROLL_X_ONLY_SEM_CROMO).toContain(SCROLL_X_ONLY);
    // Firefox/padrão e os WebKit/Blink — as duas vias, senão a barra volta num
    // dos navegadores e a cascata de altura recomeça.
    expect(SCROLL_X_ONLY_SEM_CROMO).toContain('[scrollbar-width:none]');
    expect(SCROLL_X_ONLY_SEM_CROMO).toContain('[&::-webkit-scrollbar]:hidden');
  });
});

describe('o cromo NÃO é escondido onde a barra é a afordância', () => {
  it('SCROLL_X_ONLY (dado largo) mantém a barra à mostra', () => {
    // Numa grade densa a barra é a única pista de que existe mais coluna para o
    // lado. Se alguém mover o `scrollbar-width:none` para cá, some a pista.
    expect(SCROLL_X_ONLY).not.toContain('scrollbar-width');
    expect(SCROLL_X_ONLY).not.toContain('webkit-scrollbar');
  });

  it('SCROLL_Y_ONLY (página e painéis) mantém a barra vertical à mostra', () => {
    expect(SCROLL_Y_ONLY).not.toContain('scrollbar-width');
    expect(SCROLL_Y_ONLY).not.toContain('webkit-scrollbar');
  });
});

describe('nenhuma constante usa `clip` no lugar de `hidden`', () => {
  // `clip` também fecharia o eixo, mas tira o contêiner da rolagem por programa:
  // o navegador deixaria de revelar o elemento que recebe foco por teclado, e o
  // conteúdo recortado ficaria inalcançável de verdade. `hidden` preserva isso.
  it.each([
    ['SCROLL_Y_ONLY', SCROLL_Y_ONLY],
    ['SCROLL_X_ONLY', SCROLL_X_ONLY],
    ['SCROLL_X_ONLY_SEM_CROMO', SCROLL_X_ONLY_SEM_CROMO],
  ])('%s não usa overflow-*-clip', (_nome, classes) => {
    expect(classes).not.toContain('-clip');
  });
});
