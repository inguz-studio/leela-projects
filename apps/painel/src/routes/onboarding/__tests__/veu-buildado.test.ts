// =============================================================================
// O VÉU, MEDIDO NO CSS QUE O BUILD PRODUZ (DEF-C · ONBOARD-REV → ONBOARD-VITRINE).
//
// POR QUE ESTE ARQUIVO EXISTE, e por que ele não é redundante com o teste de
// classe que já mora em `OverlayConvite.test.tsx`.
//
// Em 2026-08-03 o véu do overlay era `bg-[var(--surface-base)]/95`. O teste de
// então lia a CLASSE do elemento e passava verde: a string estava lá, com o
// token certo e a opacidade certa. Só que o Tailwind DESCARTA modificador de
// opacidade sobre valor arbitrário `var()` — a classe não vira regra nenhuma.
// O overlay se anunciava bloqueante e o painel seguia visível por trás dele.
// Nenhum teste podia pegar isso, porque nenhum teste olhava o produto do build:
// o defeito nasce ENTRE a string e o CSS.
//
// Então a pergunta que este arquivo faz não é "a classe é a certa?" — é:
//
//   a classe que está HOJE no elemento do véu produz, quando compilada pelo
//   MESMO Tailwind e pelo MESMO preset do painel, uma cor de fundo de verdade?
//
// Por isso a classe é LIDA DA FONTE, nunca escrita aqui. Trocar o véu por outra
// classe que não compile — a próxima encarnação do DEF-C, com outro nome —
// derruba este teste sem que ninguém precise se lembrar dele.
//
// A COMPILAÇÃO É A DE VERDADE, NÃO UMA IMITAÇÃO. O `tailwindcss` roda com o
// preset do design-system (o mesmo que `tailwind.config.ts` do painel carrega)
// sobre a classe extraída. O que sai daqui é o mesmo texto que o `vite build`
// grava em `dist/assets/*.css` para essas utilidades — sem pagar um bundle
// inteiro a cada `vitest run`.
//
// ONDE O VÉU MORA AGORA (VITRINE-VEU-1 · corte de 09/08). O aviso deixou de
// desenhar o próprio `role="dialog"` e passou a usar o `Modal` do design
// system, que 26 telas do painel já usavam. O véu é o `data-testid="modal-
// overlay"` do `Modal`, e é de lá que a classe é lida — o gate segue a peça em
// vez de medir um véu que o aviso não usa mais. A medição não afrouxou: são as
// mesmas cinco perguntas, sobre a classe que está de fato na tela.
//
// E porque a fonte da classe mudou de arquivo, o gate ganhou o elo que faltava:
// um caso que exige que o aviso USE o `Modal`. Sem ele, alguém reescreveria o
// véu à mão de novo e este arquivo seguiria verde medindo o `Modal` de outra
// pessoa.
//
// E A PROVA DE QUE A MEDIÇÃO MORDE: o último caso compila a classe do DEF-C,
// exatamente como ela era, e exige ZERO declaração de fundo. Um gate que não
// falha no defeito que veio prevenir é decoração; este falha.
//
// A segunda metade do véu não é utilidade, é TOKEN: `--modal-overlay-bg` pode
// existir como regra e ainda assim ser `transparent`. O último bloco lê os
// temas do DS e exige opacidade real em cada um.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import leelaPreset from '@leela/design-system/tailwind-preset';
import type { Config } from 'tailwindcss';

const RAIZ_DS = resolve(__dirname, '../../../../../../packages/design-system');
const FONTE_OVERLAY = resolve(__dirname, '../OverlayConvite.tsx');
const FONTE_MODAL = resolve(RAIZ_DS, 'src/components/Modal/Modal.tsx');

/**
 * Compila `classes` com o Tailwind e o preset REAIS do painel e devolve o CSS.
 * `preflight` sai de propósito: o reset não é o objeto da medição e só faria
 * ruído de milhares de linhas em cada asserção.
 */
async function compilar(classes: string): Promise<string> {
  const config = {
    presets: [leelaPreset as Config],
    content: [{ raw: `<div class="${classes}"></div>`, extension: 'html' }],
    corePlugins: { preflight: false },
  } as Config;
  const resultado = await postcss([tailwindcss(config)]).process('@tailwind utilities;', {
    from: undefined,
  });
  return resultado.css;
}

/**
 * A classe do VÉU, lida da fonte do `Modal` do DS — o elemento
 * `data-testid="modal-overlay"`, que é o que pinta o fundo e cobre a tela.
 *
 * O `Modal` monta a classe com `cn(...)`, então o que se lê são os literais de
 * string do elemento, juntos, na ordem em que estão. Comentários saem antes
 * para que um apóstrofo dentro de um deles não vire classe.
 * @pure
 */
function classeDoVeu(): string {
  const fonte = readFileSync(FONTE_MODAL, 'utf8');
  const inicio = fonte.indexOf('data-testid="modal-overlay"');
  expect(inicio, 'o véu do Modal (data-testid="modal-overlay") sumiu da fonte').toBeGreaterThan(-1);
  const semComentario = fonte.slice(inicio).replace(/\/\/[^\n]*/g, '');
  const fim = semComentario.indexOf('/>');
  expect(fim, 'o elemento do véu não fecha na fonte do Modal').toBeGreaterThan(-1);
  const classe = [...semComentario.slice(0, fim).matchAll(/'([^']*)'/g)]
    .map((m) => m[1] ?? '')
    .join(' ')
    .trim();
  expect(classe, 'o véu ficou sem classe na fonte do Modal').toBeTruthy();
  return classe;
}

/** Todas as declarações `background-color` do CSS compilado. @pure */
function fundosDeclarados(css: string): string[] {
  return [...css.matchAll(/background-color:\s*([^;}]+)/g)]
    .map((m) => m[1]?.trim())
    .filter((valor): valor is string => valor !== undefined);
}

describe('véu do overlay · é o véu DO AVISO que está sendo medido', () => {
  // O elo que amarra os dois arquivos. Sem ele o gate mede o véu do `Modal` e
  // passa verde mesmo que o aviso tenha voltado a desenhar um dialog à mão —
  // que é exatamente o defeito (DEF-R1) que o VITRINE-VEU-1 veio desfazer.
  const fonteDoAviso = (): string => readFileSync(FONTE_OVERLAY, 'utf8');

  /**
   * O CÓDIGO do aviso, sem comentário. O cabeçalho do arquivo explica o DEF-R1
   * citando `role="dialog"` e `aria-modal` — apagar essa explicação para o teste
   * passar seria a troca errada. Mede-se o que roda.
   * @pure
   */
  const codigoDoAviso = (): string =>
    fonteDoAviso()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');

  it('o aviso usa o `Modal` do design system', () => {
    const codigo = codigoDoAviso();
    expect(codigo).toMatch(/import\s*{[^}]*\bModal\b[^}]*}\s*from\s*'@leela\/design-system'/);
    expect(codigo).toMatch(/<Modal\b/);
  });

  it('o aviso não desenha diálogo à mão (DEF-R1 não volta por descuido)', () => {
    // `role="dialog"` + `aria-modal` escritos aqui foram o defeito medido: véu
    // que para o ponteiro e mais nada, sem portal, sem trava de rolagem, com
    // oito controles do fundo alcançáveis por trás dele.
    const codigo = codigoDoAviso();
    expect(codigo).not.toMatch(/role="dialog"/);
    expect(codigo).not.toMatch(/aria-modal/);
  });
});

describe('véu do overlay · o que o BUILD produz (DEF-C)', () => {
  it('a classe que está na fonte compila em cor de fundo de verdade', async () => {
    const css = await compilar(classeDoVeu());
    const fundos = fundosDeclarados(css);
    // Não é "a regra existe em algum lugar do bundle": é esta classe, esta
    // compilação, esta declaração. O DEF-C passava justamente porque a regra
    // que existia no bundle era de OUTRA classe.
    expect(fundos.length, `nenhum background-color saiu do build:\n${css}`).toBeGreaterThan(0);
    expect(fundos.some((valor) => valor.includes('var(--'))).toBe(true);
  });

  it('o fundo compilado aponta para o token de overlay do DS', async () => {
    const css = await compilar(classeDoVeu());
    expect(fundosDeclarados(css)).toContain('var(--modal-overlay-bg)');
  });

  it('o desfoque também compila (era a metade que já funcionava)', async () => {
    // O blur pegava mesmo no desenho quebrado — `backdrop-blur` é utilidade
    // padrão do Tailwind. Trava-se aqui para que a correção da cor não leve o
    // desfoque junto por descuido.
    //
    // A corrente tem dois elos e os dois são medidos: o Tailwind guarda o valor
    // numa variável própria (`--tw-backdrop-blur`) e só depois a consome no
    // `backdrop-filter`. Medir só o segundo elo passaria verde com a variável
    // vazia — que é a mesma classe de defeito do DEF-C, um degrau adiante.
    const css = await compilar(classeDoVeu());
    expect(css).toMatch(/--tw-backdrop-blur:\s*blur\(var\(--modal-overlay-blur\)\)/);
    expect(css).toMatch(/[^-]backdrop-filter:[^;}]*var\(--tw-backdrop-blur\)/);
  });

  it('o véu não usa opacidade sobre valor arbitrário — a forma que não compila', () => {
    // A classe de defeito inteira, não só a instância: qualquer `/NN` colado
    // num `[...]` cai aqui, com o nome da classe no erro.
    const suspeitas = classeDoVeu()
      .split(/\s+/)
      .filter((classe) => /\][/]\d+$/.test(classe));
    expect(suspeitas, 'opacidade sobre valor arbitrário é descartada no build').toEqual([]);
  });

  it('FALSIFICAÇÃO: a classe do DEF-C, compilada, não produz fundo nenhum', async () => {
    // O caso que prova que os anteriores medem alguma coisa. Se este passar a
    // encontrar um fundo, é o Tailwind que mudou de comportamento — e aí os
    // outros casos deste arquivo perderam o sentido e precisam ser relidos.
    const css = await compilar('bg-[var(--surface-base)]/95');
    expect(fundosDeclarados(css)).toEqual([]);
  });
});

describe('véu do overlay · o token é opaco o bastante para ser véu', () => {
  const TEMAS = ['themes/index.css', 'themes/brasa.css', 'themes/wine.css'] as const;

  it.each(TEMAS)('%s define --modal-overlay-blur (o elo que faltava medir)', (arquivo) => {
    // Acrescentado pela review antagonista (REV-VITRINE · DEF-R5). O bloco
    // acima prova que a classe compila a CORRENTE do desfoque
    // (`--tw-backdrop-blur: blur(var(--modal-overlay-blur))` e o
    // `backdrop-filter` que a consome) — mas nunca perguntou se a ponta da
    // corrente EXISTE. `blur(var(--indefinido))` não é um valor válido, e um
    // valor inválido dentro de `backdrop-filter` invalida a declaração INTEIRA:
    // o desfoque some sem que classe nenhuma mude. É o DEF-C um degrau adiante
    // — a regra certa apontando para um token que não está lá.
    //
    // Medido no bundle desta review: `--modal-overlay-blur: 4px` nos dois
    // blocos de tema do `dist`. Aqui trava-se a fonte, tema a tema.
    const css = readFileSync(resolve(RAIZ_DS, arquivo), 'utf8');
    const declaracoes = [...css.matchAll(/--modal-overlay-blur:\s*([^;]+);/g)]
      .map((m) => m[1]?.trim())
      .filter((valor): valor is string => valor !== undefined);
    expect(declaracoes.length, `--modal-overlay-blur não existe em ${arquivo}`).toBeGreaterThan(0);
    for (const valor of declaracoes) {
      // Comprimento com unidade e maior que zero. `0px` compila, resolve e não
      // desfoca nada — a mesma classe de defeito do `transparent`.
      const px = /^([\d.]+)(px|rem|em)$/.exec(valor);
      expect(px, `--modal-overlay-blur sem comprimento legível em ${arquivo}: ${valor}`).not.toBeNull();
      expect(Number(px?.[1])).toBeGreaterThan(0);
    }
  });

  it.each(TEMAS)('%s define --modal-overlay-bg com opacidade real', (arquivo) => {
    // Uma regra que resolve para `transparent` é o mesmo defeito com outra
    // roupa: o véu existe no CSS e não cobre nada. 0,5 é o piso do que ainda
    // lê como véu; o valor do produto hoje é 0,82 (MODAL-LOTE · 17/08, antes
    // 0,6 — o dono via informação de segundo plano demais através do overlay).
    const css = readFileSync(resolve(RAIZ_DS, arquivo), 'utf8');
    const declaracoes = [...css.matchAll(/--modal-overlay-bg:\s*([^;]+);/g)]
      .map((m) => m[1]?.trim())
      .filter((valor): valor is string => valor !== undefined);
    expect(declaracoes.length, `--modal-overlay-bg não existe em ${arquivo}`).toBeGreaterThan(0);
    for (const valor of declaracoes) {
      const alfa = /rgba?\([^)]*,\s*([\d.]+)\s*\)/.exec(valor)?.[1];
      expect(alfa, `--modal-overlay-bg sem alfa legível em ${arquivo}: ${valor}`).toBeDefined();
      expect(Number(alfa)).toBeGreaterThanOrEqual(0.5);
    }
  });
});
