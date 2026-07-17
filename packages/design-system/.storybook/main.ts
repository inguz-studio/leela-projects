import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { StorybookConfig } from '@storybook/react-vite';

const require = createRequire(import.meta.url);

/**
 * Monorepo pnpm (Windows): o @storybook/core não enxerga o framework/addon
 * pelo nome por causa do isolamento de dependências do pnpm. O fix canônico
 * da doc do Storybook é resolver o caminho absoluto do pacote aqui, onde a
 * resolução funciona (config roda no contexto do design-system).
 */
function getAbsolutePath(value: string): string {
  return dirname(require.resolve(join(value, 'package.json')));
}

/**
 * Catálogo do @leela/design-system (LEELA-S001-4-T1 · showroom LEELA-DS-SHOW).
 *
 * Stories vivem ao lado de cada componente (src/components/X/X.stories.tsx) e
 * a doc viva com handoff Copy-to-Clipboard em X.docs.mdx.
 * O toggle de tema (brasa/wine) fica na toolbar — ver preview.tsx.
 */
const config: StorybookConfig = {
  framework: getAbsolutePath('@storybook/react-vite'),
  stories: ['../src/**/*.docs.mdx', '../src/**/*.stories.tsx'],
  addons: [getAbsolutePath('@storybook/addon-essentials')],
  docs: {},
};

export default config;
