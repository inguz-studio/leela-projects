// metro.config.js — configuração Metro para monorepo pnpm + Turborepo
// Ref: https://docs.expo.dev/guides/monorepos/#configure-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Cap de workers do Metro (RCA exit 134 — gate Onda 0, trace leela-build-2d6ee98d):
// o default (~6 child processes em 8 cores) amplia o footprint de memória e a
// janela da race de teardown no force-exit do expo export (process.exit com
// handles uv vivos → SIGABRT intermitente sob paralelismo pesado do turbo).
// Override local: LEELA_METRO_WORKERS=N.
config.maxWorkers = Number(process.env.LEELA_METRO_WORKERS) || 2;

// Observa todos os arquivos do monorepo para hot reload de pacotes compartilhados
config.watchFolders = [workspaceRoot];

// Permite que Metro resolva módulos do node_modules da raiz (pnpm não hoist por padrão)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
