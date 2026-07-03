import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index:            'src/index.ts',
    'tailwind-preset':'src/tailwind-preset.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: ['react', 'react-dom', 'react-native', 'tailwindcss'],
});
