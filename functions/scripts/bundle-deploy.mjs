// =============================================================================
// functions/scripts/bundle-deploy.mjs — empacota as Functions para DEPLOY
// (lane DEPLOY-PREVIEW). NÃO participa do fluxo local (emulador/suíte usam
// functions/lib via tsc + links de workspace, como sempre).
//
// POR QUÊ: o Cloud Build roda `npm install` puro no diretório enviado e não
// entende o protocolo `workspace:*` do pnpm ("@leela/core": "workspace:*").
// Primeiro deploy real falhou com EUNSUPPORTEDPROTOCOL nas 73 functions.
// Solução: esbuild embute os pacotes de workspace (@leela/core via dist já
// compilado) num único index.js; só dependências de REGISTRO ficam externas
// (firebase-admin, firebase-functions, qrcode) — essas o Cloud Build instala.
//
// Saída: functions-deploy/ (gitignored)
//   index.js       — bundle CJS (entry: functions/lib/functions/src/index.js)
//   package.json   — main=index.js + deps de registro copiadas do functions/
//   .env           — cópia do functions/.env (SÓ config não-secreta; os
//                    segredos ficam em .env.local/Secret Manager e NUNCA
//                    entram aqui)
//   node_modules/  — npm install local p/ o CLI analisar o código no deploy
//                    (ignorado no upload pelo firebase.prod.json)
//
// Pré-requisito: `npm --prefix functions run build` (tsc → lib) já rodado —
// o predeploy do firebase.prod.json garante a ordem.
// =============================================================================

/* eslint-disable no-console */

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const FUNCTIONS_DIR = join(ROOT, 'functions');
const OUT_DIR = join(ROOT, 'functions-deploy');
const ENTRY = join(FUNCTIONS_DIR, 'lib', 'functions', 'src', 'index.js');

// esbuild vive no store do pnpm (dependência do Vite) — resolver a partir
// do painel evita adicionar dependência nova só para o deploy.
function loadEsbuild() {
  const bases = [
    join(ROOT, 'apps', 'painel'),
    join(ROOT, 'packages', 'core'),
    ROOT,
  ];
  for (const base of bases) {
    try {
      const req = createRequire(join(base, 'package.json'));
      // via vite (que depende de esbuild) ou direto
      try {
        return req('esbuild');
      } catch {
        const viteReq = createRequire(req.resolve('vite/package.json'));
        return viteReq('esbuild');
      }
    } catch {
      /* tenta a próxima base */
    }
  }
  throw new Error('[bundle-deploy] esbuild não encontrado no workspace.');
}

if (!existsSync(ENTRY)) {
  throw new Error(
    `[bundle-deploy] ${ENTRY} não existe — rode "npm --prefix functions run build" antes.`
  );
}

const esbuild = loadEsbuild();
mkdirSync(OUT_DIR, { recursive: true });

// Dependências de REGISTRO (externas ao bundle) — versões copiadas do
// functions/package.json para o Cloud Build instalar.
const fnPkg = JSON.parse(
  readFileSync(join(FUNCTIONS_DIR, 'package.json'), 'utf8')
);
const EXTERNALS = ['firebase-admin', 'firebase-functions', 'qrcode'];
const deps = {};
for (const name of EXTERNALS) {
  const v = fnPkg.dependencies?.[name];
  if (v === undefined || v.startsWith('workspace:')) {
    throw new Error(`[bundle-deploy] dependência externa ausente/workspace: ${name}`);
  }
  deps[name] = v;
}

await esbuild.build({
  entryPoints: [ENTRY],
  outfile: join(OUT_DIR, 'index.js'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: EXTERNALS.flatMap((n) => [n, `${n}/*`]),
  logLevel: 'warning',
});

writeFileSync(
  join(OUT_DIR, 'package.json'),
  JSON.stringify(
    {
      name: 'leela-functions-deploy',
      private: true,
      description:
        'Artefato de deploy gerado por functions/scripts/bundle-deploy.mjs — não editar.',
      main: 'index.js',
      engines: { node: '20' },
      dependencies: deps,
    },
    null,
    2
  ) + '\n'
);

// .env NÃO-SECRETO acompanha o deploy (dotenv do firebase-tools), assim
// como o dotenv POR PROJETO .env.leela-hub (flag de ativação deliberada —
// só o deploy ao leela-hub o carrega). .env.local / .secret.local NUNCA
// são copiados (segredos ficam no Secret Manager; ver Task 3 da lane).
cpSync(join(FUNCTIONS_DIR, '.env'), join(OUT_DIR, '.env'));
cpSync(join(FUNCTIONS_DIR, '.env.leela-hub'), join(OUT_DIR, '.env.leela-hub'));

// node_modules local para o CLI conseguir carregar/analisar o código.
console.log('[bundle-deploy] npm install (externals) em functions-deploy/ ...');
execSync('npm install --no-audit --no-fund --loglevel=error', {
  cwd: OUT_DIR,
  stdio: 'inherit',
});

console.log('[bundle-deploy] OK →', OUT_DIR);
