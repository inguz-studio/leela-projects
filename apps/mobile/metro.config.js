// metro.config.js — configuração Metro para monorepo pnpm + Turborepo
// Ref: https://docs.expo.dev/guides/monorepos/#configure-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Observa todos os arquivos do monorepo para hot reload de pacotes compartilhados
config.watchFolders = [workspaceRoot];

// Permite que Metro resolva módulos do node_modules da raiz (pnpm não hoist por padrão)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
