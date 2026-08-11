/**
 * build-frescor-dist.test.ts — PONTE-FIX · B1 ⚔
 *
 * O GATE QUE ENXERGA O DIST DEFASADO, provado como código e não como intenção.
 *
 * Por que este arquivo existe. Duas vezes — 08/08 e 11/08 — o `dist/` de um
 * pacote do workspace ficou para trás da fonte e o bundle da landing saiu com
 * o código velho, com os TRÊS gates da casa verdes:
 *   - `tsc --noEmit` lê a FONTE (o tsconfig mapeia `@leela/api-client` para
 *     `../../packages/api-client/src/index.ts`);
 *   - a suíte lê um DUBLÊ (`vi.mock('@leela/api-client', …)`);
 *   - só o BUNDLE lê o `dist/`, e ninguém o inspeciona antes de subir.
 *
 * A disciplina de "lembrar de rodar o tsup antes" já falhou duas vezes, então
 * ela não é o conserto. O conserto é este gate, e o gate precisa de teste pelo
 * mesmo motivo que qualquer guarda: um gate que não quebra quando deveria é
 * pior que gate nenhum, porque ele produz confiança.
 *
 * Os casos abaixo montam um workspace de mentira em disco e mexem no relógio
 * dos arquivos — a régua do gate é mtime, então é mtime que tem de ser testado.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

import {
  acharRaizDoRepo,
  analisarApp,
  analisarPacote,
  dependenciasDeWorkspace,
  mapearPacotes,
  reprovados,
  // O módulo é `.mjs` sem tipos de propósito: ele roda no `build` por `node`,
  // antes de qualquer compilação, e um segundo artefato tipado para o mesmo
  // arquivo seria a segunda cópia da regra. O contrato dele são estes testes,
  // e o `allowJs` do tsconfig da landing infere o suficiente.
  //
  // ⚠️ Importa a LIB, e nunca o entrypoint. O entrypoint carrega shebang, e
  // shebang é o que matou este arquivo na coleta (ver o caso da última seção).
} from '../../../scripts/lib/frescor-do-workspace.mjs';

const RAIZ_REAL = resolve(__dirname, '../../..');

let sandbox: string;

/** Carimba o mtime de um arquivo em segundos desde a época. */
function datar(caminho: string, segundos: number): void {
  utimesSync(caminho, segundos, segundos);
}

function escrever(caminho: string, conteudo: string, segundos?: number): void {
  writeFileSync(caminho, conteudo);
  if (segundos !== undefined) datar(caminho, segundos);
}

/**
 * Um pacote de mentira que compila para `dist/`, com o relógio nas mãos.
 * `fonteEm` e `distEm` são segundos desde a época.
 */
function pacoteFalso(
  raiz: string,
  nome: string,
  { fonteEm, distEm }: { fonteEm: number; distEm?: number }
): string {
  const dir = join(raiz, 'packages', nome.replace('@leela/', ''));
  mkdirSync(join(dir, 'src'), { recursive: true });
  escrever(
    join(dir, 'package.json'),
    JSON.stringify({
      name: nome,
      main: './dist/index.js',
      module: './dist/index.mjs',
      scripts: { build: 'tsup' },
    }),
    fonteEm
  );
  escrever(join(dir, 'src', 'index.ts'), 'export const x = 1;\n', fonteEm);
  if (distEm !== undefined) {
    mkdirSync(join(dir, 'dist'), { recursive: true });
    escrever(join(dir, 'dist', 'index.js'), 'exports.x=1\n', distEm);
    escrever(join(dir, 'dist', 'index.mjs'), 'export const x=1\n', distEm);
  }
  return dir;
}

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'leela-frescor-'));
  escrever(join(sandbox, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
  mkdirSync(join(sandbox, 'packages'), { recursive: true });
  mkdirSync(join(sandbox, 'apps', 'app-falso'), { recursive: true });
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// ⚔ A régua: dist mais velho que a fonte reprova
// ---------------------------------------------------------------------------

describe('⚔ PONTE-FIX · B1 · o gate de frescor do dist', () => {
  it('⚔ dist MAIS VELHO que a fonte é `defasado` — é o defeito de 08/08 e de 11/08', () => {
    // Exatamente a forma medida pela PONTE-REV: dist de 09/08, fonte de 11/08.
    const dir = pacoteFalso(sandbox, '@leela/api-client', {
      fonteEm: 1_786_000_000,
      distEm: 1_785_000_000,
    });
    const r = analisarPacote(dir);
    expect(r.estado).toBe('defasado');
    expect(r.arquivo).toContain('dist/');
  });

  it('dist mais NOVO que a fonte é `fresco` — o estado normal não pode reprovar', () => {
    const dir = pacoteFalso(sandbox, '@leela/api-client', {
      fonteEm: 1_785_000_000,
      distEm: 1_786_000_000,
    });
    expect(analisarPacote(dir).estado).toBe('fresco');
  });

  it('dist AUSENTE reprova também — prometer no `exports` e não entregar é o mesmo risco', () => {
    const dir = pacoteFalso(sandbox, '@leela/api-client', { fonteEm: 1_786_000_000 });
    const r = analisarPacote(dir);
    expect(r.estado).toBe('ausente');
    expect(reprovados([r])).toHaveLength(1);
  });

  it('⚔ mexer só no `package.json` (o `exports`) também defasa — a fonte não é só `src/`', () => {
    // Trocar o `exports` muda O QUE o bundler lê, sem tocar em `src/`. Se a
    // régua olhasse apenas `src/`, esta mudança passaria batida.
    const dir = pacoteFalso(sandbox, '@leela/api-client', {
      fonteEm: 1_785_000_000,
      distEm: 1_786_000_000,
    });
    expect(analisarPacote(dir).estado).toBe('fresco');
    datar(join(dir, 'package.json'), 1_787_000_000);
    expect(analisarPacote(dir).estado).toBe('defasado');
  });

  it('pacote SEM script de build (só fonte) é ignorado, e não reprovado', () => {
    const dir = join(sandbox, 'packages', 'so-fonte');
    mkdirSync(join(dir, 'src'), { recursive: true });
    escrever(join(dir, 'package.json'), JSON.stringify({ name: '@leela/so-fonte' }));
    expect(analisarPacote(dir).estado).toBe('ignorado');
  });
});

// ---------------------------------------------------------------------------
// O app inteiro: só as dependências de workspace, e todas elas
// ---------------------------------------------------------------------------

describe('PONTE-FIX · B1 · o veredito do app', () => {
  function appFalso(deps: Record<string, string>): string {
    const dir = join(sandbox, 'apps', 'app-falso');
    escrever(
      join(dir, 'package.json'),
      JSON.stringify({ name: '@leela/app-falso', dependencies: deps })
    );
    return dir;
  }

  it('⚔ UM defasado entre três já reprova o app — o gate não tira média', () => {
    pacoteFalso(sandbox, '@leela/core', { fonteEm: 1_785_000_000, distEm: 1_786_000_000 });
    pacoteFalso(sandbox, '@leela/api-client', { fonteEm: 1_786_000_000, distEm: 1_785_000_000 });
    pacoteFalso(sandbox, '@leela/design-system', {
      fonteEm: 1_785_000_000,
      distEm: 1_786_000_000,
    });
    const dirDoApp = appFalso({
      '@leela/core': 'workspace:*',
      '@leela/api-client': 'workspace:*',
      '@leela/design-system': 'workspace:*',
    });

    const { achados } = analisarApp({ raiz: sandbox, dirDoApp });
    const ruins = reprovados(achados);
    expect(ruins).toHaveLength(1);
    expect(ruins[0].nome).toBe('@leela/api-client');
  });

  it('dependência de fora do workspace (versão fixa) não entra na conta', () => {
    pacoteFalso(sandbox, '@leela/core', { fonteEm: 1_786_000_000, distEm: 1_785_000_000 });
    const dirDoApp = appFalso({ next: '^14.2.18', react: '18.3.1' });
    const { achados } = analisarApp({ raiz: sandbox, dirDoApp });
    expect(achados).toHaveLength(0);
  });

  it('a leitura do protocolo `workspace:` não confunde faixa de versão com pacote local', () => {
    expect(
      dependenciasDeWorkspace({
        dependencies: { '@leela/core': 'workspace:*', next: '^14.2.18' },
        devDependencies: { '@leela/design-system': 'workspace:^' },
      })
    ).toEqual(['@leela/core', '@leela/design-system']);
  });

  it('o mapa de pacotes cobre `packages/*` E `apps/*`', () => {
    pacoteFalso(sandbox, '@leela/core', { fonteEm: 1, distEm: 2 });
    appFalso({});
    const mapa = mapearPacotes(sandbox);
    expect(mapa.get('@leela/core')).toBeTruthy();
    expect(mapa.get('@leela/app-falso')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ⚔ A fiação: o gate tem de estar NO build, senão ele é decoração
// ---------------------------------------------------------------------------

describe('⚔ PONTE-FIX · B1 · o gate está ligado ao build da landing', () => {
  it('⚔ o script `build` da landing chama o gate ANTES do `next build`', () => {
    // Sem esta asserção, o gate é um arquivo que ninguém roda — e o defeito
    // volta no próximo deploy, exatamente como voltou entre 08/08 e 11/08.
    const pkg = JSON.parse(
      readFileSync(resolve(__dirname, '../package.json'), 'utf8')
    ) as { scripts: Record<string, string> };
    const build = pkg.scripts['build'] ?? '';
    expect(build).toContain('verificar-frescor-do-workspace.mjs');
    expect(build.indexOf('verificar-frescor')).toBeLessThan(build.indexOf('next build'));
  });

  it('a raiz do repo é achada pelo `pnpm-workspace.yaml`, subindo a partir do app', () => {
    expect(acharRaizDoRepo(resolve(__dirname, '..'))).toBe(RAIZ_REAL);
  });

  it('⚔ a LIB não carrega shebang — é o que matou este arquivo na COLETA', () => {
    // A lane ONDA-0 mediu, em 11/08, este arquivo falhando com `Error: Expected
    // ident` e ZERO casos executados: a lógica morava no mesmo `.mjs` que abre
    // com `#!/usr/bin/env node`, e o parser do `ssrTransform` do Vite aborta na
    // linha 1. O Node importa sem reclamar, então o defeito só aparece por
    // aqui — e some ou volta conforme a versão do parser que o `pnpm install`
    // resolveu no dia. Um teste que pode se apagar sozinho não é guarda.
    //
    // A regra que este caso pina: o arquivo IMPORTÁVEL nunca tem shebang.
    const lib = readFileSync(
      resolve(__dirname, '../../../scripts/lib/frescor-do-workspace.mjs'),
      'utf8'
    );
    expect(lib.startsWith('#!')).toBe(false);
  });

  it('⚔ o entrypoint tem o shebang, e delega — ninguém importa o executável', () => {
    // O outro lado da mesma regra: o shebang continua existindo (o gate é um
    // CLI), mas isolado num arquivo que só lê o argumento e chama a lib. Se
    // alguém um dia mover a lógica de volta para cá, este caso cai.
    const entry = readFileSync(
      resolve(__dirname, '../../../scripts/verificar-frescor-do-workspace.mjs'),
      'utf8'
    );
    expect(entry.startsWith('#!/usr/bin/env node')).toBe(true);
    expect(entry).toContain('./lib/frescor-do-workspace.mjs');
    // A lógica NÃO mora aqui: o entrypoint não exporta nada.
    expect(entry).not.toContain('export function');
  });

  it('⚔ o REPO DE VERDADE está fresco agora — se este caso ficar vermelho, não builde', () => {
    // Este é o caso que fala do disco, e não da mentira do sandbox. Ele é o
    // que teria pego o `dist/` de 09/08 na noite da PONTE-RESOLVE.
    const { achados } = analisarApp({
      raiz: RAIZ_REAL,
      dirDoApp: resolve(__dirname, '..'),
    });
    const nomes = achados.map((a: { nome: string }) => a.nome);
    expect(nomes).toContain('@leela/api-client');
    expect(nomes).toContain('@leela/core');
    expect(nomes).toContain('@leela/design-system');
    expect(reprovados(achados)).toEqual([]);
  });
});
