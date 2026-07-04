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
  /**
   * Tema controlado pelo app. Quando presente, vence a preferência
   * persistida (no mount e a cada mudança). Sem a prop, a preferência
   * do usuário no storage decide, com fallback 'brasa'.
   * Mesmo contrato de precedência do ThemeProvider web (F04):
   * prop > storage > default.
   */
  theme?: Theme;
  /** Optional async storage for persistence. Pass AsyncStorage or equivalent. */
  storage?: StorageAdapter;
  children: ReactNode;
}

export function ThemeProviderRN({
  theme: themeProp,
  storage,
  children,
}: ThemeProviderRNProps): JSX.Element {
  const [theme, setThemeState] = useState<Theme>(themeProp ?? 'brasa');

  // Prop controlada muda → ela manda (espelha F04 web: a prop nunca é
  // ignorada, nem no mount nem depois)
  useEffect(() => {
    if (themeProp !== undefined) {
      setThemeState(themeProp);
    }
  }, [themeProp]);

  // Restaura preferência persistida no mount — SÓ quando a prop não é
  // passada (prop > storage > default). Guard de cancelamento: um getItem
  // que resolve tarde nunca sobrescreve prop que apareceu depois.
  useEffect(() => {
    if (!storage || themeProp !== undefined) return;
    let cancelled = false;
    storage
      .getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === 'brasa' || stored === 'leela') {
          setThemeState(stored);
        }
      })
      .catch(() => {
        // ignore storage errors
      });
    return () => {
      cancelled = true;
    };
  }, [storage, themeProp]);

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
