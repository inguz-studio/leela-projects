/**
 * DELTA-UX (D-1008-R4) — a superfície do painel PORTALIZADO, provada ponta a
 * ponta: o defeito do dono era "menus secundários com fundo PRETO".
 *
 * ROOT-CAUSE (provado aqui, não presumido). A hipótese inicial do brief —
 * "painel portalizado fora da árvore das CSS vars de tema" — é FALSA e o
 * primeiro bloco a refuta por render: `data-theme` e `data-glass` vivem no
 * <html> (ThemeProvider + SuperficieDoPainel), então um portal em
 * `document.body` está DENTRO da árvore que carrega as vars. A causa real é a
 * CASCATA: sob o vidro ([data-glass="on"] remapeia `--surface-overlay` no
 * brasa/wine; no dark-wine o overlay já nasce filme) o token de overlay vira
 * um FILME translúcido (rgba branco a 2.8–4.5%) desenhado para elemento EM
 * FLUXO sobre um cartão — e `--popover` o seguia por alias. Painel flutuante
 * em portal pintava o filme tendo atrás só a página escura: lia como PRETO.
 *
 * FIX no canônico (uma causa, um fix): `popover: {surface.overlay-opaque}` —
 * companheiro opaco por tema (mesmo padrão do `--surface-raised-opaque` do
 * fallback @supports). Nenhum componente mudou de classe: DropdownMenu,
 * Popover, Command/Combobox, Tooltip e Toast seguem em `bg-popover`.
 *
 * O segundo bloco afere a var RESOLVIDA pela cascata REAL dos arquivos
 * publicados (themes/index.css) — jsdom não cascateia custom properties, então
 * a resolução é feita sobre o texto publicado, o mesmo byte que o navegador
 * recebe. É a mesma disciplina file-based de glass.test.ts: prova o MECANISMO.
 */

import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen } from '@testing-library/react';
import { DropdownMenu } from '../DropdownMenu';
import { Popover, PopoverContent, PopoverTrigger } from '../../Popover';

const RAIZ_DS = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

// ---------------------------------------------------------------------------
// 1 · O painel vive em PORTAL no body — e o body está DENTRO da árvore de vars
// ---------------------------------------------------------------------------

describe('painel portalizado — dentro da árvore que carrega as CSS vars', () => {
  it('DropdownMenu: menu em portal no body, consumindo bg-popover', () => {
    // O tema/vidro entram no <html>, como no app real (ThemeProvider +
    // SuperficieDoPainel escrevem em document.documentElement).
    document.documentElement.setAttribute('data-theme', 'brasa');
    document.documentElement.setAttribute('data-glass', 'on');

    const { container } = render(
      <DropdownMenu
        open
        onOpenChange={() => {}}
        actions={[{ id: 'a', label: 'Ação', onClick: () => {} }]}
        trigger={<button type="button">Abrir</button>}
      />,
    );

    const menu = screen.getByRole('menu');
    // Portal de verdade: o painel NÃO é descendente do container do React…
    expect(container.contains(menu)).toBe(false);
    // …mas É descendente do <html> que carrega data-theme/data-glass — a
    // hipótese "portal fora da árvore das vars" morre aqui.
    expect(document.documentElement.contains(menu)).toBe(true);
    expect(menu.className).toContain('bg-popover');

    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-glass');
  });

  it('PopoverContent (âncora do Combobox/Calendar): mesmo contrato', () => {
    const { container } = render(
      <Popover open>
        <PopoverTrigger>Abrir</PopoverTrigger>
        <PopoverContent>conteúdo</PopoverContent>
      </Popover>,
    );
    const painel = document.querySelector('[data-radix-popper-content-wrapper], [data-state="open"][role="dialog"], [data-side]');
    const conteudo = Array.from(document.body.querySelectorAll('*')).find(
      (el) => el.className && String(el.className).includes('bg-popover'),
    );
    expect(conteudo, 'PopoverContent não renderizou painel com bg-popover').toBeTruthy();
    expect(container.contains(conteudo as Node)).toBe(false);
    void painel;
  });
});

// ---------------------------------------------------------------------------
// 2 · A var de superfície RESOLVIDA pela cascata publicada (themes/index.css)
// ---------------------------------------------------------------------------

/** Extrai o corpo `{ ... }` de cada bloco cujo seletor contenha `selector`. */
function blocosDoSeletor(css: string, selector: string): string[] {
  const blocos: string[] = [];
  const regex = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(css)) !== null) {
    if (m[1]!.includes(selector)) blocos.push(m[2]!);
  }
  return blocos;
}

/** Mapa var → valor declarado num conjunto de corpos de bloco (último vence). */
function varsDosBlocos(corpos: string[]): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const corpo of corpos) {
    for (const linha of corpo.split(';')) {
      const par = /^\s*(--[\w-]+)\s*:\s*(.+)\s*$/.exec(linha);
      if (par) mapa.set(par[1]!, par[2]!.trim());
    }
  }
  return mapa;
}

/**
 * Resolve `nome` como o navegador faria num elemento sob
 * `html[data-theme=tema][data-glass=on]`: declaração do bloco glass vence a do
 * bloco de tema (mesmo elemento, mesma especificidade de atributo, ordem do
 * arquivo — o bloco [data-glass="on"] vem DEPOIS de cada tema no index.css);
 * referências var() resolvem recursivamente na mesma cadeia.
 */
function resolver(nome: string, tema: Map<string, string>, glass: Map<string, string>, passos = 0): string {
  if (passos > 12) throw new Error(`ciclo de var() resolvendo ${nome}`);
  const bruto = glass.get(nome) ?? tema.get(nome);
  if (bruto === undefined) throw new Error(`var ${nome} não declarada na cascata`);
  const ref = /^var\((--[\w-]+)\)$/.exec(bruto);
  return ref ? resolver(ref[1]!, tema, glass, passos + 1) : bruto;
}

describe('a var de superfície do popover, resolvida pela cascata real', () => {
  const css = readFileSync(resolve(RAIZ_DS, 'themes/index.css'), 'utf8');
  const glass = varsDosBlocos(blocosDoSeletor(css, '[data-glass="on"]'));
  const TEMAS = ['brasa', 'wine', 'dark-wine'] as const;

  for (const nome of TEMAS) {
    describe(`tema ${nome} + [data-glass="on"]`, () => {
      const tema = varsDosBlocos(blocosDoSeletor(css, `[data-theme="${nome}"]`));

      it('--popover resolve para cor OPACA (nunca o filme rgba do vidro)', () => {
        const valor = resolver('--popover', tema, glass);
        expect(valor, `--popover no ${nome} resolveu para o filme: ${valor}`).toMatch(
          /^#[0-9a-fA-F]{6}$/,
        );
      });

      it('--popover é o companheiro opaco do overlay do tema', () => {
        expect(resolver('--popover', tema, glass)).toBe(
          resolver('--surface-overlay-opaque', tema, glass),
        );
      });

      it('o defeito não volta por engano: --surface-overlay sob o vidro É o filme (uso em fluxo)', () => {
        // Regressão de sentido: se alguém "consertar" apontando o overlay
        // inteiro para opaco, o vidro dos elementos em fluxo morre junto.
        expect(resolver('--surface-overlay', tema, glass)).toMatch(/^rgba\(/);
      });
    });

    it(`tema ${nome} SEM vidro: --popover idêntico ao overlay de sempre (zero regressão no opaco)`, () => {
      const tema = varsDosBlocos(blocosDoSeletor(css, `[data-theme="${nome}"]`));
      const semGlass = new Map<string, string>();
      // dark-wine: o overlay base é filme por desenho do tema; o popover tem
      // de ser opaco também SEM data-glass — é o caso que o alias antigo
      // quebrava até fora do vidro.
      const popover = resolver('--popover', tema, semGlass);
      expect(popover).toMatch(/^#[0-9a-fA-F]{6}$/);
      if (nome !== 'dark-wine') {
        expect(popover).toBe(resolver('--surface-overlay', tema, semGlass));
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 3 · Select nativo: o popup herda o bg do CAMPO — as <option> pintam a
//     superfície canônica de painel flutuante
// ---------------------------------------------------------------------------

describe('Select — options na superfície canônica de painel', () => {
  it('o <select> estiliza as options com o par popover (bg + foreground)', () => {
    const fonte = readFileSync(
      resolve(RAIZ_DS, 'src/components/Select/Select.tsx'),
      'utf8',
    );
    expect(fonte).toContain('[&_option]:bg-[var(--popover)]');
    expect(fonte).toContain('[&_option]:text-[var(--popover-foreground)]');
  });
});
