// =============================================================================
// @leela/design-system — public API
// =============================================================================

// ── Theme ──────────────────────────────────────────────────────────────────
export {
  ThemeProvider,
  useTheme,
  type Theme,
  type ThemeContextValue,
  type ThemeProviderProps,
} from './theme/ThemeProvider';

export {
  ThemeProviderRN,
  useTheme as useThemeRN,
  type ThemeProviderRNProps,
  type StorageAdapter,
  type RNThemeContextValue,
} from './theme/ThemeProviderRN';

export {
  generateCSS,
  generateRNTheme,
  collectRefs,
  resolvePath,
  flattenTokens,
  type TokenRecord,
  type FlatTokens,
} from './theme/generate';

export { brasaTheme, leelaTheme } from './theme/rn-themes';

// ── Atoms ──────────────────────────────────────────────────────────────────
export { Button, buttonVariants, type ButtonProps } from './components/Button';
export { Input, type InputProps } from './components/Input';
export { Badge, badgeVariants, type BadgeProps } from './components/Badge';
export { Chip, type ChipProps } from './components/Chip';
export { Avatar, type AvatarProps } from './components/Avatar';
export { Divider, type DividerProps } from './components/Divider';

// ── Utilities ──────────────────────────────────────────────────────────────
export { cn } from './utils/cn';
