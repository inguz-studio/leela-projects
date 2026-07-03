import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// Source maps + Sentry upload só quando SENTRY_AUTH_TOKEN estiver definido
// (checagem truthy: string vazia também desativa o upload)
const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN);

const sentryPlugins = hasSentryAuthToken
  ? [
      sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT ?? 'leela-painel',
        silent: !process.env.CI,
      }),
    ]
  : [];

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ...sentryPlugins],
  build: {
    // Source maps gerados e enviados apenas quando SENTRY_AUTH_TOKEN existir
    sourcemap: hasSentryAuthToken,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 5173,
  },
});
