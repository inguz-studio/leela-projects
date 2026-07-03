/**
 * Tailwind config LOCAL do package — usado apenas pelo Storybook (catálogo).
 * Apps consumidores têm o próprio config importando o preset publicado.
 */
import type { Config } from 'tailwindcss';
import leelaPreset from './src/tailwind-preset';

const config: Config = {
  presets: [leelaPreset as Config],
  content: ['./src/**/*.{ts,tsx}', './.storybook/**/*.{ts,tsx}'],
};

export default config;
