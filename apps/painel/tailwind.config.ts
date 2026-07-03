import type { Config } from 'tailwindcss';
import leelaPreset from '@leela/design-system/tailwind-preset';

const config: Config = {
  presets: [leelaPreset as Config],
  darkMode: ['selector', '[data-theme="brasa"]'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/design-system/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
