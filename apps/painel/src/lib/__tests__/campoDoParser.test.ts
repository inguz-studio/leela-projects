// =============================================================================
// O CAMPO QUE PASSA PELO PARSER NÃO É `type="number"` (PARSE-1 · REV-CORTE).
//
// A metade do defeito do PARSE-1 foi esta: treze campos eram `input
// type="number"`, e o navegador HIGIENIZA o texto antes de o código ver. Colar
// "1.234,56" num campo desses apaga o campo — medido em jsdom — e a mensagem
// que o parser já sabia montar nunca tinha o que explicar.
//
// A lane fechou os treze e deixou a regra escrita como Directive no commit:
// "campo que lê por `parseValorPtBr`/`parseContagemPtBr` nasce `type='text'`
// com `inputMode`; `type='number'` num campo desses é defeito, não estilo".
//
// ⚠️ Directive sem gate é decoração. Este arquivo torna a regra executável: um
// campo novo que nasça `type="number"` numa tela que lê pelos dois parsers cai
// aqui, na hora, em vez de reaparecer como "o valor sumiu quando colei".
//
// A medição é sobre o CÓDIGO com os comentários removidos — os dois arquivos
// que explicam o defeito citam `type="number"` na explicação, e apagar a
// explicação para o teste passar seria a troca errada.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const RAIZ = resolve(__dirname, '../..');

/** Todo `.ts`/`.tsx` de produção sob `src/` (testes ficam de fora). @pure */
function fontes(dir: string, achados: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      if (nome !== '__tests__' && nome !== 'node_modules') fontes(caminho, achados);
    } else if (/\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome)) {
      achados.push(caminho);
    }
  }
  return achados;
}

/** O código, sem comentários — é sobre ele que a regra vale. @pure */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

const LE_PELO_PARSER = /parseValorPtBr|parseContagemPtBr/;

describe('PARSE-1 · a Directive do campo de texto tem gate', () => {
  it('nenhuma tela que lê pelos dois parsers desenha `type="number"`', () => {
    const infratores = fontes(RAIZ)
      .map((caminho) => ({ caminho, codigo: semComentarios(readFileSync(caminho, 'utf8')) }))
      .filter(({ codigo }) => LE_PELO_PARSER.test(codigo) && codigo.includes('type="number"'))
      .map(({ caminho }) => caminho.slice(RAIZ.length + 1).replace(/\\/g, '/'));

    expect(infratores).toEqual([]);
  });

  it('FALSIFICAÇÃO: a varredura enxerga mesmo os arquivos do parser', () => {
    // Sem este caso o de cima passaria verde no dia em que a varredura
    // deixasse de achar qualquer arquivo — um `[]` que não significa nada.
    const leem = fontes(RAIZ).filter((caminho) =>
      LE_PELO_PARSER.test(semComentarios(readFileSync(caminho, 'utf8'))),
    );
    expect(leem.length).toBeGreaterThanOrEqual(10);
  });
});
