/**
 * Contrato do script anti-FOUC do showroom (REV-SCROLLBAR · DEF-S1).
 *
 * O showroom não usa `getThemeInitScript()`: `showcase/index.html` é HTML
 * estático e carrega uma cópia escrita à mão do script. Cópia à mão sai de
 * sincronia, e essa saiu — a lista de temas válidos ficou no nome antigo
 * (`leela`) depois do rename para `wine`, então o script errava nos dois
 * sentidos:
 *
 *   - preferência `wine` (o valor que o toggle grava HOJE) caía no fallback e
 *     o showroom nascia `brasa`, trocando para wine só no mount;
 *   - preferência `leela` (ainda em localStorage de quem usou o showroom antes
 *     do rename) era estampada no `<html>`, onde não casa com bloco de tema
 *     NENHUM: nem token, nem `color-scheme`, até o `readStoredTheme` do
 *     ThemeProvider migrar no mount.
 *
 * Nos dois casos o script entregava o flash que existe para evitar. Depois de
 * `color-scheme` passar a nascer no tema (`8e10ab8f`), o flash deixou de ser só
 * de cor do nosso CSS: ele inclui a polaridade do cromo do NAVEGADOR — barra de
 * rolagem clara piscando sobre o brasa, e escura sobre o wine. É o sintoma que
 * o dono reportou, reaparecendo por uma janela de tempo, na única superfície
 * que declara o tema sem passar pelo DS.
 *
 * O que se mede aqui é COMPORTAMENTO, não o texto do script: o script real é
 * extraído do HTML e executado, e o que ele estampa é comparado com (a) os
 * blocos que os temas publicados de fato definem e (b) o tema que o
 * ThemeProvider vai escolher no mount. Divergência em (b) é flash.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ_DS = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const CHAVE = 'leela-theme-preference';

/** O script inline do `<head>` — o `<script type="module">` do body não casa. */
function scriptAntiFouc(): string {
  const html = readFileSync(resolve(RAIZ_DS, 'showcase/index.html'), 'utf8');
  const encontrado = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
  expect(encontrado, 'showcase/index.html perdeu o script anti-FOUC inline').toBeDefined();
  return encontrado ?? '';
}

/** Temas que os arquivos publicados realmente definem. */
function temasComBloco(): Set<string> {
  const css = readFileSync(resolve(RAIZ_DS, 'themes/index.css'), 'utf8');
  // [a-z-]+ (não [a-z]+): tema hifenizado (dark-wine) ficava INVISÍVEL para
  // este regex — o bloco existia no CSS mas o helper silenciosamente não o
  // enxergava, e os testes abaixo passavam medindo um conjunto errado
  // (achado da lane REDESIGN-DS-0809 ao introduzir o dark-wine).
  return new Set([...css.matchAll(/\[data-theme="([a-z-]+)"\]/g)].map((m) => m[1] ?? ''));
}

/**
 * O tema que o ThemeProvider escolhe no mount, para a mesma preferência.
 * Espelha `readStoredTheme` (src/theme/ThemeProvider.tsx), que já tem o
 * retrocompat 'leela' → 'wine' coberto por teste próprio.
 */
function temaDoMount(guardado: string | null): string {
  if (guardado === 'brasa' || guardado === 'wine' || guardado === 'dark-wine') return guardado;
  if (guardado === 'leela') return 'wine';
  return 'brasa';
}

const PREFERENCIAS = [null, 'brasa', 'wine', 'dark-wine', 'leela', 'lixo-de-outro-produto'] as const;

describe('o script anti-FOUC do showroom estampa um tema que existe', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it.each(PREFERENCIAS)('preferência %s ⇒ tema com bloco publicado', (guardado) => {
    if (guardado !== null) localStorage.setItem(CHAVE, guardado);

    // O script REAL do arquivo, executado. Não é uma reimplementação: uma
    // reimplementação passaria verde com o HTML errado, que é justamente o
    // defeito que este arquivo existe para pegar.
    new Function(scriptAntiFouc())();

    const estampado = document.documentElement.getAttribute('data-theme');
    expect(
      temasComBloco(),
      `o script estampou data-theme="${estampado ?? '(nada)'}", que não tem bloco em themes/index.css — a tela nasce sem token e sem color-scheme`,
    ).toContain(estampado);
  });

  it.each(PREFERENCIAS)('preferência %s ⇒ mesmo tema que o mount vai escolher (zero flash)', (guardado) => {
    if (guardado !== null) localStorage.setItem(CHAVE, guardado);

    new Function(scriptAntiFouc())();

    const estampado = document.documentElement.getAttribute('data-theme');
    expect(
      estampado,
      `o script pinta "${estampado ?? '(nada)'}" e o ThemeProvider troca para "${temaDoMount(guardado)}" no mount: isso é o flash, e desde 8e10ab8f ele leva junto a polaridade da barra de rolagem`,
    ).toBe(temaDoMount(guardado));
  });

  it('FALSIFICAÇÃO: um tema inventado no script derrubaria o caso acima', () => {
    // Sem este caso, os anteriores poderiam estar medindo um conjunto vazio.
    expect(temasComBloco()).not.toContain('leela');
    expect(temasComBloco()).toEqual(new Set(['brasa', 'wine', 'dark-wine']));
  });
});
