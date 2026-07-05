// =============================================================================
// Guarda de regressão de nomenclatura (S206-T2 · RN-216): nenhum termo proibido
// ("tier"/"tiers") pode aparecer no CÓDIGO/COPY do produto. A RN-216 é
// PRODUTO-WIDE (herdada por E02/E04/E05/E13) — a varredura cobre o monorepo
// inteiro, não só routes/eventos (fix review Onda1 #19). Comentários (que
// referenciam a regra "nunca 'tier'") são removidos antes da varredura, assim
// como testes e o próprio glossário. Um PR que introduza "tier(s)" na copy
// de QUALQUER workspace quebra aqui.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { contemTermoProibido, TERMOS_PROIBIDOS } from '../glossario';

const RAIZ_REPO = resolve(process.cwd(), '../..');

/**
 * Raízes de código de produto (RN-216 vale em todas — spec S206-T2).
 * mobile/landing usam `app/` + `lib/` (Expo Router / Next App Router).
 */
const RAIZES_PRODUTO = [
  resolve(process.cwd(), 'src'),
  resolve(RAIZ_REPO, 'packages/core/src'),
  resolve(RAIZ_REPO, 'packages/design-system/src'),
  resolve(RAIZ_REPO, 'packages/api-client/src'),
  resolve(RAIZ_REPO, 'functions/src'),
  resolve(RAIZ_REPO, 'apps/mobile/app'),
  resolve(RAIZ_REPO, 'apps/mobile/lib'),
  resolve(RAIZ_REPO, 'apps/landing/app'),
  resolve(RAIZ_REPO, 'apps/landing/lib'),
].filter((raiz) => existsSync(raiz));

const DIRS_IGNORADOS = new Set(['__tests__', 'node_modules', 'dist', 'lib-build']);

/** Coleta recursiva de fontes .ts/.tsx, exceto testes e o glossário. */
function fontesDeProduto(dir: string): string[] {
  const out: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) {
      if (DIRS_IGNORADOS.has(entrada)) continue;
      out.push(...fontesDeProduto(caminho));
    } else if (
      /\.(ts|tsx)$/.test(entrada) &&
      !/\.test\.(ts|tsx)$/.test(entrada) &&
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
    expect(contemTermoProibido('tierra')).toBeNull();
    expect(TERMOS_PROIBIDOS).toContain('tier');
  });

  it('glossário unit: PLURAL "tiers" também é violação (review #19)', () => {
    expect(contemTermoProibido('Tiers de inscrição')).toBe('tier');
    expect(contemTermoProibido('os tiers do evento')).toBe('tier');
  });

  it('varredura cobre o monorepo (painel + packages + functions + apps)', () => {
    // ≥5 raízes reais hoje; se uma sumir do disco o guard denuncia.
    expect(RAIZES_PRODUTO.length).toBeGreaterThanOrEqual(5);
  });

  it('nenhuma fonte de PRODUTO usa termo proibido na copy/código', () => {
    const ofensores: string[] = [];
    let total = 0;
    for (const raiz of RAIZES_PRODUTO) {
      const arquivos = fontesDeProduto(raiz);
      total += arquivos.length;
      for (const arquivo of arquivos) {
        const codigo = semComentarios(readFileSync(arquivo, 'utf8'));
        const termo = contemTermoProibido(codigo);
        if (termo) ofensores.push(`${arquivo} → "${termo}"`);
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(ofensores, `Termo proibido na copy do produto:\n${ofensores.join('\n')}`).toEqual([]);
  });
});
