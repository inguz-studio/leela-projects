/**
 * ThemeProvider for React Native — provides resolved token values via context.
 * React Native cannot use CSS custom properties, so this passes a plain JS
 * object (FlatTokens) that components read with useTheme().
 *
 * Storage is opt-in: pass a StorageAdapter (e.g. AsyncStorage) for persistence.
 *
 * Usage (RN):
 *   import { ThemeProviderRN, useTheme } from '@leela/design-system/rn';
 *   <ThemeProviderRN theme="brasa" storage={AsyncStorageAdapter}><App /></ThemeProviderRN>
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { FlatTokens } from './generate';
import { brasaTheme, leelaTheme } from './rn-themes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = 'brasa' | 'leela';

/** Minimal async storage interface (compatible with AsyncStorage). */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface RNThemeContextValue {
  theme: Theme;
  tokens: FlatTokens;
  setTheme: (theme: Theme) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const RNThemeContext = createContext<RNThemeContextValue | null>(null);

const STORAGE_KEY = 'leela-theme-preference';

function resolveTokens(theme: Theme): FlatTokens {
  return theme === 'brasa' ? brasaTheme : leelaTheme;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ThemeProviderRNProps {
  theme?: Theme;
  /** Optional async storage for persistence. Pass AsyncStorage or equivalent. */
  storage?: StorageAdapter;
  children: ReactNode;
}

export function ThemeProviderRN({
  theme: defaultTheme = 'brasa',
  storage,
  children,
}: ThemeProviderRNProps): JSX.Element {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // Restore persisted preference on mount
  useEffect(() => {
    if (!storage) return;
    storage
      .getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'brasa' || stored === 'leela') {
          setThemeState(stored);
        }
      })
      .catch(() => {
        // ignore storage errors
      });
  }, [storage]);

  const setTheme = (next: Theme): void => {
    setThemeState(next);
    if (storage) {
      storage.setItem(STORAGE_KEY, next).catch(() => {});
    }
  };

  return (
    <RNThemeContext.Provider
      value={{ theme, tokens: resolveTokens(theme), setTheme }}
    >
      {children}
    </RNThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTheme(): RNThemeContextValue {
  const ctx = useContext(RNThemeContext);
  if (ctx === null) {
    throw new Error(
      '[useTheme] must be called inside <ThemeProviderRN>.',
    );
  }
  return ctx;
}
