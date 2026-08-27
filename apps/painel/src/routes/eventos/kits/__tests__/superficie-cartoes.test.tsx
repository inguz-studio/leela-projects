/**
 * AJUSTES-DONO (D-1008-R11) — cartões de kit com superfície de verdade,
 * provado na cascata REAL: o defeito do dono era "não consigo visualizar os
 * bento cards, ou contêineres de informação, estão todas as informações
 * flutuantes" na tela de registro de kits.
 *
 * ROOT-CAUSE (provado aqui, não presumido). NÃO é var que não resolve fora da
 * VG (`--surface-raised` é declarada por tema no <html> e resolve em qualquer
 * rota), nem o defeito do popover portalizado (D-1008-R4). É a mesma FAMÍLIA:
 * sob o vidro ([data-glass="on"], ligado em TODA rota do organizador —
 * `vidroDaRota`), `--surface-raised` é remapeada para o FILME translúcido do
 * vidro (rgba a 34–62% conforme o tema), desenhado para ler como cartão SÓ com
 * a receita completa — backdrop-blur (`--card-blur`) + borda + elevação. Os
 * componentes canônicos carregam a receita (Card: bg+borda+sombra+blur;
 * KpiCard/CartaoV3: bg+blur+sombra). KitCard/ItemCard eram `<article>` CRUS
 * com `bg-[var(--surface-raised)]` e nada mais (re-implementação pré-cânone,
 * L-021): filme sem pareamento sobre a página escura = invisível.
 *
 * FIX no canônico: KitCard/ItemCard viram composição do `Card` do DS —
 * nenhuma cor nova, nenhum conserto por tela; a tela passa a consumir a
 * receita que o cânone já provê.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ItemKit, Kit } from '@leela/core';
import { KitsCadastroView } from '../KitsCadastroView';

const INDEX_CSS = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../../..',
  'packages/design-system/themes/index.css',
);

const kit: Kit = {
  id: 'k1',
  nome: 'Kit Ouro',
  descricao: '',
  preco: 120,
  capacidade: 50,
  modalidades: ['5k'],
  itens: [],
  imagemUrl: null,
  galeria: [],
} as unknown as Kit;

const item: ItemKit = {
  id: 'i1',
  nome: 'Camiseta',
  tamanhado: true,
  origem: 'organizacao',
  marca: null,
  exibirLogo: false,
  usadoEm: [],
} as unknown as ItemKit;

// ---------------------------------------------------------------------------
// 1 · Os cartões renderizam a RECEITA canônica do Card (não o bg cru)
// ---------------------------------------------------------------------------

describe('KitCard/ItemCard — superfície canônica do Card do DS', () => {
  function renderView(): void {
    render(
      <MemoryRouter>
        <KitsCadastroView slug="e1" kits={[kit]} itens={[item]} loading={false} error={null} />
      </MemoryRouter>,
    );
  }

  it('card do kit carrega a receita completa: bg-card + elevação + blur (sem borda — V2708-07)', () => {
    renderView();
    const card = screen.getByRole('heading', { name: 'Kit Ouro' }).closest('[role="article"]');
    expect(card).not.toBeNull();
    const cls = (card as HTMLElement).className;
    expect(cls).toContain('bg-card');
    // V2708-07: sem borda decorativa no bento card — separação por superfície/elevação.
    expect(cls).not.toContain('border-border');
    expect(cls).toContain('shadow-elev-1');
    expect(cls).toContain('[backdrop-filter:var(--card-blur)]');
    // Regressão do defeito: o bg CRU sem pareamento não volta.
    expect(cls).not.toContain('bg-[var(--surface-raised)]');
  });

  it('card de item do catálogo: mesma receita canônica (sem borda — V2708-07)', () => {
    renderView();
    const card = screen.getByRole('heading', { name: 'Camiseta' }).closest('[role="article"]');
    expect(card).not.toBeNull();
    const cls = (card as HTMLElement).className;
    expect(cls).toContain('bg-card');
    // V2708-07: sem borda decorativa no bento card.
    expect(cls).not.toContain('border-border');
    expect(cls).toContain('shadow-elev-1');
    expect(cls).not.toContain('bg-[var(--surface-raised)]');
  });
});

// ---------------------------------------------------------------------------
// 2 · O MECANISMO, resolvido pela cascata publicada (themes/index.css) — a
//     mesma disciplina file-based de superficie-portal.test.tsx do DS.
// ---------------------------------------------------------------------------

/**
 * Remove os at-rules `@supports` inteiros (com contagem de chaves). Sem isto,
 * o bloco `[data-glass="on"]` do FALLBACK sem-backdrop-filter (que devolve o
 * opaco) entraria no mapa e venceria o filme por "último vence" — o navegador
 * moderno (o caso do defeito do dono) NÃO aplica esse fallback.
 */
function semSupports(css: string): string {
  let saida = '';
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf('@supports', i);
    if (at === -1) {
      saida += css.slice(i);
      break;
    }
    saida += css.slice(i, at);
    let j = css.indexOf('{', at);
    if (j === -1) break;
    let profundidade = 1;
    j += 1;
    while (j < css.length && profundidade > 0) {
      if (css[j] === '{') profundidade += 1;
      else if (css[j] === '}') profundidade -= 1;
      j += 1;
    }
    i = j;
  }
  return saida;
}

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

/** Resolve como o navegador: bloco glass vence o de tema; var() recursivo. */
function resolver(
  nome: string,
  tema: Map<string, string>,
  glass: Map<string, string>,
  passos = 0,
): string {
  if (passos > 12) throw new Error(`ciclo de var() resolvendo ${nome}`);
  const bruto = glass.get(nome) ?? tema.get(nome);
  if (bruto === undefined) throw new Error(`var ${nome} não declarada na cascata`);
  const ref = /^var\((--[\w-]+)\)$/.exec(bruto);
  return ref ? resolver(ref[1]!, tema, glass, passos + 1) : bruto;
}

describe('a superfície dos cartões, resolvida pela cascata real', () => {
  const css = semSupports(readFileSync(INDEX_CSS, 'utf8'));
  const glass = varsDosBlocos(blocosDoSeletor(css, '[data-glass="on"]'));
  const TEMAS = ['brasa', 'wine', 'dark-wine'] as const;

  for (const nome of TEMAS) {
    describe(`tema ${nome} + [data-glass="on"] (toda rota do organizador)`, () => {
      const tema = varsDosBlocos(blocosDoSeletor(css, `[data-theme="${nome}"]`));

      it('--surface-raised sob o vidro É o filme translúcido — bg cru não desenha cartão', () => {
        // O mecanismo do defeito: quem consome a var NUA (sem blur+borda+
        // sombra) pinta um rgba translúcido sobre a página — informação solta.
        expect(resolver('--surface-raised', tema, glass)).toMatch(/^rgba\(/);
      });

      it('--card (o bg do Card canônico) segue a MESMA superfície — o fix é a receita, não outra cor', () => {
        expect(resolver('--card', tema, glass)).toBe(resolver('--surface-raised', tema, glass));
      });

      it('o pareamento existe na cascata: --card-blur resolve para blur real sob o vidro', () => {
        expect(resolver('--card-blur', tema, glass)).toMatch(/blur\(/);
      });
    });

    it(`tema ${nome} SEM vidro: --surface-raised é opaco — por isso os cartões crus "funcionavam" antes do redesign`, () => {
      const tema = varsDosBlocos(blocosDoSeletor(css, `[data-theme="${nome}"]`));
      const semGlass = new Map<string, string>();
      expect(resolver('--surface-raised', tema, semGlass)).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  }
});
