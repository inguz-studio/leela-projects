/**
 * ThemeProvider (web) — sets data-theme on <html> and persists user preference.
 *
 * Usage:
 *   import '@leela/design-system/themes/index.css';
 *   <ThemeProvider theme="brasa"><App /></ThemeProvider>
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = 'brasa' | 'leela';

export interface ThemeContextValue {
  /** The active theme name. */
  theme: Theme;
  /** Switch to a different theme. Persists in localStorage. */
  setTheme: (theme: Theme) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ---------------------------------------------------------------------------
// Storage key (localStorage — user preference only, not domain data)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'leela-theme-preference';

function readStoredTheme(defaultTheme: Theme): Theme {
  if (typeof window === 'undefined') return defaultTheme;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'brasa' || stored === 'leela') return stored;
  } catch {
    // storage blocked (private browsing, etc.) — fall through
  }
  return defaultTheme;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ThemeProviderProps {
  /** Initial theme. Overridden by stored user preference if present. */
  theme?: Theme;
  children: ReactNode;
}

export function ThemeProvider({
  theme: defaultTheme = 'brasa',
  children,
}: ThemeProviderProps): JSX.Element {
  const [theme, setThemeState] = useState<Theme>(() =>
    readStoredTheme(defaultTheme),
  );

  // Apply data-theme attribute to <html> whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const setTheme = (next: Theme): void => {
    setThemeState(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the current theme and a setter. Must be used inside <ThemeProvider>.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error(
      '[useTheme] must be called inside a <ThemeProvider>. ' +
      'Wrap your app with <ThemeProvider theme="brasa">.',
    );
  }
  return ctx;
}
