import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Catálogo do @leela/design-system (LEELA-S001-4-T1).
 *
 * Stories vivem ao lado de cada componente (src/components/X/X.stories.tsx).
 * O toggle de tema (brasa/leela) fica na toolbar — ver preview.tsx.
 */
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-essentials'],
  docs: { autodocs: 'tag' },
};

export default config;
