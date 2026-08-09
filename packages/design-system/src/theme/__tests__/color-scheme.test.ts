/**
 * Contrato do `color-scheme` — a barra de rolagem nativa obedece ao tema
 * (BUILD-SCROLLBAR-TEMA).
 *
 * O dono reportou, verbatim: "o scroll também não está respeitando as regras de
 * DS, para ficar no dark mode." A causa não era descumprimento do DS — era peça
 * que nunca foi escrita: `color-scheme` não existia em ponto nenhum do fonte, e
 * sem ele o navegador assume o esquema CLARO e pinta o cromo que não é nosso
 * (barra de rolagem, controles de formulário, caret, autofill) cinza-claro sobre
 * a interface escura.
 *
 * ⚠️ **jsdom não pinta barra de rolagem.** Nada aqui prova o PIXEL. O que estes
 * casos provam é o CONTRATO: a declaração existe, está no bloco do tema, vem do
 * TOKEN do tema (nunca de um literal no gerador) e a polaridade declarada bate
 * com a polaridade real das cores daquele tema. A cor da barra na tela continua
 * sendo conferência de olho, em navegador de verdade.
 *
 * Este é o TERCEIRO problema de rolagem da série e é distinto dos dois
 * anteriores, que eram sobre a barra EXISTIR (eixo solto promovido a `auto`, em
 * `utils/scroll.ts`; `.sr-only` absoluto esticando o `scrollHeight`). Aqui é a
 * COR dela. Não confundir os três ao ler uma falha destas.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import primitivesBrasa from '../../../tokens/primitives.brasa.json';
import primitivesWine from '../../../tokens/primitives.wine.json';
import semanticBase from '../../../tokens/semantic.json';
import semanticWineOverrides from '../../../tokens/semantic.wine.json';
import component from '../../../tokens/component.json';
import {
  generateCSS,
  generateRNTheme,
  mergeTokens,
  type TokenRecord,
} from '../generate';

const RAIZ_DS = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const brasa = primitivesBrasa as TokenRecord;
const wine = primitivesWine as TokenRecord;
const sem = semanticBase as TokenRecord;
const semWine = mergeTokens(sem, semanticWineOverrides as TokenRecord);
const comp = component as TokenRecord;

/** Os temas do produto hoje, com a polaridade que cada um DECLARA. */
const TEMAS = [
  { nome: 'brasa', prims: brasa, semantic: sem, esperado: 'dark' },
  { nome: 'wine', prims: wine, semantic: semWine, esperado: 'light' },
] as const;

/** Arquivos de tema que o pacote publica (`package.json` → exports/files). */
const ARQUIVOS = [
  { arquivo: 'themes/brasa.css', temas: ['brasa'] },
  { arquivo: 'themes/wine.css', temas: ['wine'] },
  { arquivo: 'themes/index.css', temas: ['brasa', 'wine'] },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Blocos `seletor { declarações }` de um CSS plano. Os arquivos de tema são
 * gerados sem aninhamento nem at-rule, então varrer chaves basta.
 */
function blocos(css: string): Array<{ seletor: string; corpo: string }> {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    seletor: (m[1] ?? '').trim(),
    corpo: m[2] ?? '',
  }));
}

/** O valor de `color-scheme` declarado num corpo de bloco, se houver. */
function colorSchemeDe(corpo: string): string | undefined {
  return /(?:^|[;\s])color-scheme:\s*([^;]+);/.exec(corpo)?.[1]?.trim();
}

/**
 * Brilho grosseiro de um hex (soma dos canais). Deliberadamente NÃO é a
 * luminância WCAG: a matriz de contraste vive em `contrast.test.ts` e responde
 * outra pergunta. Aqui só se decide entre quase-preto e quase-branco, e para
 * isso gama não muda o veredito.
 */
function brilho(hex: string): number {
  const limpo = hex.replace('#', '');
  const cheio = limpo.length === 3 ? limpo.split('').map((c) => c + c).join('') : limpo;
  return (
    parseInt(cheio.slice(0, 2), 16) +
    parseInt(cheio.slice(2, 4), 16) +
    parseInt(cheio.slice(4, 6), 16)
  );
}

// ---------------------------------------------------------------------------
// A declaração existe, tema a tema
// ---------------------------------------------------------------------------

describe('o gerador declara `color-scheme` no bloco de cada tema', () => {
  it.each(TEMAS)('$nome declara color-scheme: $esperado', ({ nome, prims, semantic, esperado }) => {
    const css = generateCSS(nome, prims, semantic, comp, { rootFallback: nome === 'brasa' });
    const [bloco] = blocos(css);
    expect(bloco, 'o tema gerou CSS sem bloco nenhum').toBeDefined();
    expect(colorSchemeDe(bloco?.corpo ?? '')).toBe(esperado);
  });

  it('a var `--color-scheme` continua emitida junto (é dela que uma barra estilizada se serviria)', () => {
    const css = generateCSS('brasa', brasa, sem, comp, { rootFallback: true });
    expect(css).toMatch(/--color-scheme:\s*dark;/);
  });
});

// ---------------------------------------------------------------------------
// O valor vem do TOKEN, não de um literal no gerador
// ---------------------------------------------------------------------------

describe('o valor acompanha o token do tema, nunca uma constante do gerador', () => {
  it('token trocado ⇒ declaração trocada', () => {
    const fake = mergeTokens(sem, { color: { scheme: 'light dark' } });
    const css = generateCSS('brasa', brasa, fake, comp);
    expect(colorSchemeDe(blocos(css)[0]?.corpo ?? '')).toBe('light dark');
  });

  it('FALSIFICAÇÃO: sem o token não sai declaração nenhuma', () => {
    // O caso que prova que os anteriores medem alguma coisa. Também é a
    // degradação escolhida: tema que não declara polaridade cai no `normal` do
    // navegador, em vez de receber um esquema carimbado que pode estar errado.
    const semCor: TokenRecord = { ...sem };
    delete semCor['color'];
    const css = generateCSS('brasa', brasa, semCor, comp);
    expect(colorSchemeDe(blocos(css)[0]?.corpo ?? '')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// A polaridade declarada bate com as cores reais do tema
// ---------------------------------------------------------------------------

describe('a polaridade declarada bate com a polaridade real das cores', () => {
  // Esta é a trava para o tema NOVO. `dark` constante quebraria o wine hoje —
  // ele é CLARO (surface #FDFAF7, texto #262220) — e quebraria qualquer terceiro
  // tema claro que venha do Claude Design. Quem criar um tema e esquecer de
  // declarar a polaridade certa fica vermelho aqui, com o número na mensagem.
  it.each(TEMAS)('$nome: se o texto é mais claro que a superfície, o tema é dark', ({ nome, prims, semantic }) => {
    const rn = generateRNTheme(prims, semantic, comp);
    const superficie = rn['surface-base'];
    const texto = rn['text-primary'];
    expect(superficie).toMatch(/^#[0-9A-Fa-f]{3,8}$/);
    expect(texto).toMatch(/^#[0-9A-Fa-f]{3,8}$/);

    // O lado declarado sai do CSS GERADO, não da tabela deste arquivo: assim a
    // asserção liga o token às cores diretamente, e trocar o token sozinho fica
    // vermelho aqui também.
    const css = generateCSS(nome, prims, semantic, comp);
    const declarado = colorSchemeDe(blocos(css)[0]?.corpo ?? '');
    const real = brilho(texto ?? '') > brilho(superficie ?? '') ? 'dark' : 'light';

    expect(
      declarado,
      `tema declara "${declarado ?? '(nada)'}" mas pinta superfície ${superficie} com texto ${texto}`,
    ).toBe(real);
  });
});

// ---------------------------------------------------------------------------
// Os arquivos que o pacote publica carregam a declaração
// ---------------------------------------------------------------------------

describe('os arquivos de tema publicados carregam a declaração', () => {
  // O gerador estar certo não basta: quem importa `@leela/design-system/themes/*.css`
  // consome o ARQUIVO, e ele é commitado. Um `generate-tokens` não rodado deixa
  // o gerador verde e a barra clara na tela — o mesmo buraco que a lane do
  // deploy achou com o `dist/` do api-client.
  it.each(ARQUIVOS)('$arquivo declara color-scheme em cada bloco de tema', ({ arquivo, temas }) => {
    const css = readFileSync(resolve(RAIZ_DS, arquivo), 'utf8');
    const declarados = blocos(css)
      .map((b) => colorSchemeDe(b.corpo))
      .filter((v): v is string => v !== undefined);

    expect(declarados.length, `nenhum color-scheme em ${arquivo} — rode generate-tokens`).toBe(
      temas.length,
    );
    for (const tema of temas) {
      const esperado = TEMAS.find((t) => t.nome === tema)?.esperado;
      expect(declarados, `${arquivo} sem o esquema do tema ${tema}`).toContain(esperado);
    }
  });

  it('a declaração cai no bloco que casa com o <html>, que é o único lugar onde ela pega o viewport', () => {
    // `color-scheme` só governa a barra de rolagem da PÁGINA a partir do
    // elemento raiz. Os dois apps põem `data-theme` no <html> — o painel pelo
    // ThemeProvider, a landing estática no layout — e antes do mount o
    // `:root:not([data-theme])` cobre. Se um dia o atributo migrar para o
    // <body> ou para um <div>, a barra do viewport volta a nascer clara e este
    // caso não vai pegar: a conferência é de olho, no navegador.
    const css = readFileSync(resolve(RAIZ_DS, 'themes/index.css'), 'utf8');
    for (const { seletor, corpo } of blocos(css)) {
      if (colorSchemeDe(corpo) === undefined) continue;
      expect(seletor, `color-scheme fora de um seletor de tema: ${seletor}`).toMatch(
        /:root:not\(\[data-theme\]\)|\[data-theme="[a-z]+"\]/,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// O que este conserto NÃO fez
// ---------------------------------------------------------------------------

describe('o conserto é a barra NATIVA temada — nenhum cromo próprio foi escrito', () => {
  // Escolha registrada: a nativa resolve o sintoma com uma linha, respeita a
  // preferência de acessibilidade do sistema e não inventa cromo. A barra
  // ESTILIZADA com token (`scrollbar-color` + `::-webkit-scrollbar`) é decisão
  // de MARCA e está no painel canônico como SCROLLBAR-1, aguardando o dono.
  //
  // Se o dono aprovar a estilizada, este bloco muda de propósito — não é para
  // ser contornado, é para ser reescrito junto com a decisão.
  it.each(ARQUIVOS)('$arquivo não estiliza barra de rolagem', ({ arquivo }) => {
    const css = readFileSync(resolve(RAIZ_DS, arquivo), 'utf8');
    expect(css, `${arquivo} ganhou scrollbar-color sem passar por SCROLLBAR-1`).not.toMatch(
      /scrollbar-color\s*:/,
    );
    expect(css, `${arquivo} ganhou ::-webkit-scrollbar sem passar por SCROLLBAR-1`).not.toContain(
      '::-webkit-scrollbar',
    );
  });

  it('e não mexe em quem esconde ou mostra a barra (isso é `utils/scroll.ts`)', async () => {
    // A ordem do dono, dada duas vezes: navegação sem cromo, dado COM cromo (a
    // barra é a única pista de que há mais coluna). O contrato completo dessas
    // constantes é medido em `utils/__tests__/scroll.test.ts`; aqui só se trava
    // que o conserto da COR não invadiu a decisão da EXISTÊNCIA.
    const { SCROLL_X_ONLY, SCROLL_X_ONLY_SEM_CROMO } = await import('../../utils/scroll');
    expect(SCROLL_X_ONLY_SEM_CROMO).toContain('[scrollbar-width:none]');
    expect(SCROLL_X_ONLY).not.toContain('scrollbar-width');
  });
});
