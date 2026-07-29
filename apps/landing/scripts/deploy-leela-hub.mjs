#!/usr/bin/env node
// =============================================================================
// apps/landing/scripts/deploy-leela-hub.mjs
//
// Deploy da LANDING pública (Next.js) no site de Hosting `leela-landing` do
// projeto real (alias `prod` = leela-hub). Um comando, sem passo manual:
//
//     node apps/landing/scripts/deploy-leela-hub.mjs
//
// Irmão do `functions/scripts/bundle-deploy.mjs`: existe pela MESMA razão. O
// Cloud Build instala dependências com **npm puro**, e npm não entende o
// protocolo `workspace:*` do pnpm — a lane DEPLOY-PREVIEW já pagou esse
// pedágio com `EUNSUPPORTEDPROTOCOL` nas Functions. Lá a saída foi embutir os
// pacotes com esbuild; aqui o próprio webpack do Next já embute, então basta
// não declarar o que ninguém vai instalar.
//
// O que o script faz, em ordem:
//
//   1. Carrega `apps/landing/.env.leela-hub` no ambiente. O Next não tem
//      `--mode` como o Vite; ou a env está no processo, ou não existe.
//   2. Aplica um patch TEMPORÁRIO no `apps/landing/package.json`:
//        a) move as dependências `workspace:*` (@leela/*) para
//           `devDependencies` — a integração do firebase-tools apaga
//           `devDependencies` ao gerar o package.json da função
//           (frameworks/index.js: `delete packageJson.devDependencies`);
//        b) fixa `engines.node = "22"` — sem isso a integração escreve a
//           versão do Node LOCAL (24 nesta máquina), runtime que o Cloud
//           Functions ainda não serve.
//      O patch é revertido no `finally`, e um backup em disco cobre queda
//      abrupta: a próxima execução restaura antes de qualquer coisa.
//   3. Chama `firebase deploy --only hosting:leela-landing` com
//      `firebase.landing.json` — config que declara UM site e mais nada, então
//      não existe caminho para tocar o painel, as Functions ou as Rules.
//
// Por que (a) é seguro, e não um chute: o rastro de output file tracing do
// build (`.next/server/app/(public)/page.js.nft.json`) lista, de `node_modules`,
// apenas `next` e `firebase-admin`. Dos pacotes de workspace só o
// `package.json` aparece — o código entra bundlado. Nada é resolvido por
// `require('@leela/...')` em runtime.
// =============================================================================

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(AQUI, '..');
const REPO_RAIZ = join(APP_DIR, '..', '..');

const PKG = join(APP_DIR, 'package.json');
const PKG_BACKUP = join(APP_DIR, 'package.json.deploybak');
const ENV_FILE = join(APP_DIR, '.env.leela-hub');

const SITE = 'leela-landing';
const CONFIG = 'firebase.landing.json';
const PROJETO = 'prod';
/** Runtime do Cloud Functions gen2 usado pelo backend SSR. */
const NODE_RUNTIME = '22';

/** Parser de .env deliberadamente simples: KEY=VALUE, `#` comenta a linha. */
function carregarEnv(caminho) {
  if (!existsSync(caminho)) {
    throw new Error(`Arquivo de env não encontrado: ${caminho}`);
  }
  const carregadas = [];
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const limpa = linha.trim();
    if (limpa.length === 0 || limpa.startsWith('#')) continue;
    const sep = limpa.indexOf('=');
    if (sep <= 0) continue;
    const chave = limpa.slice(0, sep).trim();
    const valor = limpa.slice(sep + 1).trim();
    // Env já presente no processo VENCE o arquivo (permite override pontual
    // sem editar o versionado, ex.: apontar NEXT_PUBLIC_LEELA_URL a um canal).
    if (process.env[chave] === undefined) process.env[chave] = valor;
    carregadas.push(chave);
  }
  return carregadas;
}

/** Restaura o package.json do backup, se houver (recuperação de queda). */
function restaurar() {
  if (existsSync(PKG_BACKUP)) {
    copyFileSync(PKG_BACKUP, PKG);
    rmSync(PKG_BACKUP);
    return true;
  }
  return false;
}

function aplicarPatch() {
  copyFileSync(PKG, PKG_BACKUP);
  const pkg = JSON.parse(readFileSync(PKG, 'utf8'));

  const deps = pkg.dependencies ?? {};
  const dev = pkg.devDependencies ?? {};
  const movidas = [];
  for (const [nome, versao] of Object.entries(deps)) {
    if (typeof versao === 'string' && versao.startsWith('workspace:')) {
      dev[nome] = versao;
      delete deps[nome];
      movidas.push(nome);
    }
  }
  pkg.dependencies = deps;
  pkg.devDependencies = dev;
  pkg.engines = { ...(pkg.engines ?? {}), node: NODE_RUNTIME };

  writeFileSync(PKG, `${JSON.stringify(pkg, null, 2)}\n`);
  return movidas;
}

function rodarFirebase() {
  const args = [
    'deploy',
    '--only',
    `hosting:${SITE}`,
    '--project',
    PROJETO,
    '--config',
    CONFIG,
    ...process.argv.slice(2),
  ];
  console.log(`\n> firebase ${args.join(' ')}\n`);
  return new Promise((resolve, reject) => {
    const p = spawn('firebase', args, {
      cwd: REPO_RAIZ,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, FIREBASE_CLI_EXPERIMENTS: 'webframeworks' },
    });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`firebase deploy saiu com código ${code}`))));
  });
}

async function main() {
  if (restaurar()) {
    console.log('[deploy-landing] backup de package.json encontrado e restaurado (execução anterior caiu).');
  }

  const chaves = carregarEnv(ENV_FILE);
  console.log(`[deploy-landing] env carregada de .env.leela-hub: ${chaves.join(', ')}`);

  if (process.env['NEXT_PUBLIC_USE_EMULATOR'] === 'true') {
    throw new Error('NEXT_PUBLIC_USE_EMULATOR=true — este deploy aponta para PRODUÇÃO. Abortado.');
  }
  if (process.env['LEELA_CLOCK'] !== undefined) {
    throw new Error('LEELA_CLOCK definido — o seed de produção já está re-datado. Abortado.');
  }

  const movidas = aplicarPatch();
  console.log(
    `[deploy-landing] patch temporário: workspace:* → devDependencies (${movidas.join(', ') || 'nenhuma'}); engines.node=${NODE_RUNTIME}`,
  );

  try {
    await rodarFirebase();
  } finally {
    restaurar();
    console.log('[deploy-landing] package.json restaurado.');
  }
}

main().catch((err) => {
  console.error(`[deploy-landing] FALHOU: ${err.message}`);
  process.exitCode = 1;
});
