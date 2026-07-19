import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index:            'src/index.ts',
    'tailwind-preset':'src/tailwind-preset.ts',
    rn:               'src/rn.ts',
    // ADR-017 — entradas Radix-free para a superfície pública (landing):
    // `server` = estáticos server-safe; `dialog` = modal sem @radix-ui.
    server:           'src/server.ts',
    dialog:           'src/dialog.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: ['react', 'react-dom', 'react-native', 'tailwindcss'],
});
