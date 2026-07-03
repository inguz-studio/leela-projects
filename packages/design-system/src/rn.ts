// =============================================================================
// @leela/design-system/rn — entry React Native (F06)
//
// Sem CSS custom properties no RN: o tema chega como objeto plano (FlatTokens)
// via ThemeProviderRN/useTheme. Este entry não importa nenhum componente web.
//
//   import { ThemeProviderRN, useTheme } from '@leela/design-system/rn';
// =============================================================================

export {
  ThemeProviderRN,
  useTheme,
  type Theme,
  type ThemeProviderRNProps,
  type StorageAdapter,
  type RNThemeContextValue,
} from './theme/ThemeProviderRN';

export { brasaTheme, leelaTheme } from './theme/rn-themes';

export type { FlatTokens, TokenRecord } from './theme/generate';
