// =============================================================================
// Pureza das entradas Radix-free (ADR-017 · anti-regressão do aceite (a) da
// S1706). Caminha ESTATICAMENTE o grafo de imports de `src/server.ts` e
// `src/dialog.ts` e falha se entrar qualquer coisa que quebre a superfície
// pública da landing:
//   - `@radix-ui/*` (o dist externaliza → MODULE_NOT_FOUND no bundle público
//     — foi o 500 da lane LPVK);
//   - `createContext` (ilegal em escopo de módulo no grafo de Server
//     Component do App Router);
//   - dependência externa fora da allowlist (react, cva, clsx/tw-merge,
//     lucide) — qualquer lib nova aqui é decisão de arquitetura, não drift.
// Adicionalmente, o grafo do `server.ts` não pode conter HOOK nenhum
// (contrato: renderizável em RSC puro). O `dialog.ts` é client por natureza
// (useState/useEffect ok) — só as duas primeiras proibições valem.
// =============================================================================

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const EXTERNAL_ALLOWLIST = new Set([
  'react',
  // `react-dom` entrou em 04/08 com o portal do `Dialog` (FIX-OVERLAY-LOGIN) e
  // é decisão de arquitetura registrada, não drift. O perigo que esta allowlist
  // guarda é o do `@radix-ui/*`: o dist EXTERNALIZA a dependência e, se ela não
  // existir no grafo de quem consome, vira MODULE_NOT_FOUND no bundle público
  // (o 500 da lane LPVK). `react-dom` não corre esse risco por três razões
  // verificadas: é peerDependency declarada do DS, é externalizada pelo tsup
  // pelo MESMO caminho que `react`, e é dependência direta da landing (Next não
  // renderiza sem ela). Some-se que `Modal`, `Drawer` e `DropdownMenu` já a
  // importavam pelo barrel — o `dialog.ts` era a exceção, não a regra.
  'react-dom',
  'class-variance-authority',
  'clsx',
  'tailwind-merge',
  'lucide-react',
]);

const IMPORT_RE = /(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]/g;

/** Remove comentários de linha e de bloco — a análise é sobre CÓDIGO. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

function resolveRelative(fromFile: string, spec: string): string {
  const base = resolve(dirname(fromFile), spec);
  // Só aceita ARQUIVO .ts/.tsx (existsSync em diretório também retorna true).
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    resolve(base, 'index.ts'),
    resolve(base, 'index.tsx'),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`não resolveu import relativo "${spec}" a partir de ${fromFile}`);
}

/** Caminha o grafo a partir da entry; devolve arquivos visitados + externos. */
function walk(entry: string): { files: string[]; externals: string[] } {
  const seen = new Set<string>();
  const externals = new Set<string>();
  const queue = [resolve(SRC, entry)];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = stripComments(readFileSync(file, 'utf8'));
    for (const match of source.matchAll(IMPORT_RE)) {
      const spec = match[1]!;
      if (spec.startsWith('.')) {
        queue.push(resolveRelative(file, spec));
      } else {
        externals.add(spec);
      }
    }
  }
  return { files: [...seen], externals: [...externals] };
}

describe('entradas Radix-free (ADR-017)', () => {
  for (const entry of ['server.ts', 'dialog.ts']) {
    it(`${entry}: grafo sem @radix-ui, sem createContext, externos na allowlist`, () => {
      const { files, externals } = walk(entry);
      expect(files.length).toBeGreaterThan(1);
      for (const external of externals) {
        expect(external, `dependência externa fora da allowlist em ${entry}`).toSatisfy(
          (spec: string) => EXTERNAL_ALLOWLIST.has(spec),
        );
      }
      for (const file of files) {
        const source = stripComments(readFileSync(file, 'utf8'));
        expect(source, `@radix-ui no grafo Radix-free: ${file}`).not.toContain('@radix-ui');
        expect(source, `createContext no grafo Radix-free: ${file}`).not.toContain(
          'createContext',
        );
      }
    });
  }

  it('server.ts: grafo 100% server-safe — nenhum hook de React', () => {
    const { files } = walk('server.ts');
    for (const file of files) {
      const source = stripComments(readFileSync(file, 'utf8'));
      expect(source, `hook de React em grafo server-safe: ${file}`).not.toMatch(
        /\buse(State|Effect|LayoutEffect|Ref|Callback|Memo|Context|Id|Reducer|SyncExternalStore|Transition|ImperativeHandle)\b/,
      );
    }
  });
});

// ===========================================================================
// Peças da Onda C0 que a landing consome pelo boundary `app/_ds/ds.ts`.
//
// A Onda C2 converte cinco pares rótulo+checkbox do checkout e da conta, e a
// fila escreveu a restrição: o `CheckboxField` precisa entrar por
// `@leela/design-system/server` OU pelo boundary de cliente da landing, e a C0
// tem de provar isso ANTES da C2 abrir — o `Checkbox` já passa pelo `_ds/ds.ts`
// e o par não pode ser o que quebra a fronteira.
//
// Pela entrada server-safe elas NÃO passam, e a razão é dura: o `Checkbox` usa
// `useRef`/`useEffect` para o `indeterminate` (o React não tem atributo nativo)
// e o `CheckboxField`/`FieldGroup` usam `useId` para fiar o `htmlFor` e o
// `aria-describedby`. Hook em grafo de RSC é ilegal, e trocar o `useId` por um
// id obrigatório empurraria para dezessete telas a invenção de identificador
// único — que é justamente o que a peça existe para tirar delas.
//
// O que a landing PRECISA, então, é do que o ADR-017 realmente proíbe: Radix no
// bundle público (o `dist` externaliza a dependência e ela vira MODULE_NOT_FOUND
// — o 500 da lane LPVK). É isso que este bloco prova, arquivo por arquivo do
// grafo.
// ===========================================================================

describe('peças da Onda C0 no boundary da landing (ADR-017)', () => {
  for (const peca of ['CheckboxField']) {
    it(`${peca}: grafo sem @radix-ui e com externos na allowlist`, () => {
      const { files, externals } = walk(`components/${peca}/index.ts`);
      expect(files.length).toBeGreaterThan(1);
      for (const external of externals) {
        expect(external, `dependência externa fora da allowlist em ${peca}`).toSatisfy(
          (spec: string) => EXTERNAL_ALLOWLIST.has(spec),
        );
      }
      for (const file of files) {
        const source = stripComments(readFileSync(file, 'utf8'));
        expect(source, `@radix-ui no grafo da landing: ${file}`).not.toContain('@radix-ui');
      }
    });
  }
});
