// =============================================================================
// Guarda de regressão de nomenclatura (S206-T2 · RN-216): nenhum termo proibido
// ("tier") pode aparecer no CÓDIGO/COPY das telas de E03. Comentários (que
// referenciam a regra "nunca 'tier'") são removidos antes da varredura, assim
// como os próprios testes. Um PR que introduza "tier" na copy quebra aqui.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { contemTermoProibido, TERMOS_PROIBIDOS } from '../glossario';

const RAIZ_E03 = resolve(process.cwd(), 'src/routes/eventos');

/** Coleta recursiva de fontes .ts/.tsx, exceto __tests__ e este guard. */
function fontesE03(dir: string): string[] {
  const out: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) {
      if (entrada === '__tests__') continue;
      out.push(...fontesE03(caminho));
    } else if (
      /\.(ts|tsx)$/.test(entrada) &&
      !entrada.endsWith('.test.ts') &&
      !entrada.endsWith('.test.tsx') &&
      // glossario.ts DEFINE o termo proibido (em código) — não é copy.
      entrada !== 'glossario.ts'
    ) {
      out.push(caminho);
    }
  }
  return out;
}

/** Remove comentários de bloco e de linha (referências à regra RN-216). */
function semComentarios(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // /* */ e /** */
    .replace(/^\s*\/\/.*$/gm, ' '); // // linha inteira
}

describe('nomenclatura "kit" nunca "tier" (RN-216)', () => {
  it('glossário unit: contemTermoProibido detecta "tier" whole-word', () => {
    expect(contemTermoProibido('Tier Ouro')).toBe('tier');
    expect(contemTermoProibido('frontier')).toBeNull(); // whole-word: não casa dentro de outra palavra
    expect(TERMOS_PROIBIDOS).toContain('tier');
  });

  it('nenhuma fonte de E03 usa termo proibido na copy/código', () => {
    const arquivos = fontesE03(RAIZ_E03);
    expect(arquivos.length).toBeGreaterThan(0);
    const ofensores: string[] = [];
    for (const arquivo of arquivos) {
      const codigo = semComentarios(readFileSync(arquivo, 'utf8'));
      const termo = contemTermoProibido(codigo);
      if (termo) ofensores.push(`${arquivo} → "${termo}"`);
    }
    expect(ofensores, `Termo proibido na copy de E03:\n${ofensores.join('\n')}`).toEqual([]);
  });
});
