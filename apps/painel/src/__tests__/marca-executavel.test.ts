// =============================================================================
// Marca executável — a fiação tipográfica do painel, provada por gate.
//
// O contrato da lane pede "font-family computada = design system". Sem
// navegador (e a suíte roda com `css: false`, então `getComputedStyle` não
// enxerga o `globals.css`), a computação real não é observável aqui — e um
// teste que fingisse observá-la seria pior que nenhum.
//
// O que É observável, e é onde a marca pode quebrar de verdade, é a FIAÇÃO:
// se as duas famílias do pareamento vêm de token, e se os cortes que os tokens
// `--peso-*` do brasa usam estão de fato carregados. Uma família apontando para
// literal, ou um peso sem corte carregado (que o browser resolve em negrito
// sintético), são exatamente os dois modos de falha desta seção do handoff —
// e os dois são legíveis no arquivo.
//
// A outra metade da prova de marca não mora aqui: o valor de cada token é
// travado pela suíte do design system (`tokens.test.ts` fixa Exo 2 no display
// e Rubik na ui), e "nenhum hex/px de tema fora de token" é o lint da casa
// (`leela-tokens/no-hardcoded-tokens`), que roda no gate.
// =============================================================================

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// `import.meta.url` vem como URL de ambiente do vitest (não `file:`) sob jsdom;
// o cwd da suíte é a raiz do app, então o caminho relativo é o estável.
const globalsCss = readFileSync(resolve(process.cwd(), 'src/globals.css'), 'utf8');

/** A regra de um seletor no `@layer base` (basta para ler as declarações). */
function regra(seletor: string): string {
  const i = globalsCss.indexOf(`${seletor} {`);
  if (i < 0) throw new Error(`regra "${seletor}" não existe em globals.css`);
  return globalsCss.slice(i, globalsCss.indexOf('}', i));
}

describe('pareamento tipográfico do brasa', () => {
  it('o texto corrido vem do token de família ui — nunca de um literal', () => {
    expect(regra('html')).toMatch(/font-family:\s*var\(--font-family-ui/);
  });

  it('os títulos vêm do token de família display (senão o Exo 2 some do painel)', () => {
    expect(regra('h1, h2, h3, h4, h5, h6')).toMatch(
      /font-family:\s*var\(--font-family-display/,
    );
  });

  it('no título, display vem PRIMEIRO — a ui só entra como rede de segurança', () => {
    const decl = /font-family:\s*([^;]+);/.exec(regra('h1, h2, h3, h4, h5, h6'))?.[1] ?? '';
    const posDisplay = decl.indexOf('--font-family-display');
    const posUi = decl.indexOf('--font-family-ui');
    expect(posDisplay).toBeGreaterThanOrEqual(0);
    // Tema sem família de display cai na ui em vez de cair no sans do sistema —
    // por isso a ui pode aparecer, mas nunca antes.
    expect(posUi === -1 || posUi > posDisplay).toBe(true);
  });
});

describe('carga das webfontes', () => {
  const familias = globalsCss.slice(0, globalsCss.indexOf('@tailwind'));

  it('carrega Rubik, o texto corrido do brasa desde a lane TOKENS', () => {
    expect(familias).toMatch(/family=Rubik/);
  });

  it('continua carregando Exo 2, a voz da marca nos títulos', () => {
    expect(familias).toMatch(/family=Exo\+2/);
  });

  it.each([
    ['400', '--peso-suave cai para 400 quando a família não tem 500'],
    ['500', '--peso-suave'],
    ['600', '--peso-medio'],
    ['700', '--peso-forte e --peso-display'],
  ])('Rubik traz o corte %s (%s) — sem corte, o browser sintetiza', (corte) => {
    const rubik = /family=Rubik:wght@([\d;]+)/.exec(familias)?.[1] ?? '';
    expect(rubik.split(';')).toContain(corte);
  });
});
