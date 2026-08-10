/**
 * ThemeProvider (web) — sets data-theme on <html> and persists user preference.
 *
 * Precedência do tema ativo:
 *   1. prop `theme` (controlada pelo app — vence no mount e a cada mudança)
 *   2. preferência persistida em localStorage (quando a prop não é passada)
 *   3. 'brasa' (default)
 *
 * `setTheme()` troca o tema em runtime e persiste a escolha do usuário.
 * Uma mudança posterior da prop `theme` volta a mandar (fonte controlada).
 *
 * Anti-FOUC em SSR:
 *   - themes/*.css já pintam o tema padrão via `:root:not([data-theme])`;
 *   - para respeitar a preferência persistida ANTES do primeiro paint,
 *     injete `getThemeInitScript()` num <script> inline no <head>:
 *
 *       <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
 *
 * Usage:
 *   import '@leela/design-system/themes/index.css';
 *   <ThemeProvider theme="brasa"><App /></ThemeProvider>
 */

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = 'brasa' | 'wine' | 'dark-wine';

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

// A chave de storage mantém o prefixo do produto ('leela-*'); só o VALOR do
// tema foi renomeado (leela → wine). Não renomear a chave preserva a sessão de
// quem já tem preferência salva.
const STORAGE_KEY = 'leela-theme-preference';

function readStoredTheme(defaultTheme: Theme): Theme {
  if (typeof window === 'undefined') return defaultTheme;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'brasa' || stored === 'wine' || stored === 'dark-wine') return stored;
    // Retrocompat: o tema 'leela' foi renomeado para 'wine'. Um valor antigo
    // persistido continua válido e migra na leitura, sem quebrar a sessão.
    if (stored === 'leela') return 'wine';
  } catch {
    // storage blocked (private browsing, etc.) — fall through
  }
  return defaultTheme;
}

// useLayoutEffect no cliente (aplica data-theme antes do paint pós-hidratação),
// useEffect no servidor (evita o warning de useLayoutEffect em SSR).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// ---------------------------------------------------------------------------
// Anti-FOUC init script (SSR)
// ---------------------------------------------------------------------------

/**
 * Retorna o script inline que aplica `data-theme` antes do primeiro paint,
 * respeitando a preferência persistida. Injetar no <head> em apps SSR.
 */
export function getThemeInitScript(defaultTheme: Theme = 'brasa'): string {
  return (
    '(function(){try{' +
    `var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});` +
    // Retrocompat: valor antigo 'leela' migra p/ 'wine' antes de validar.
    'if(t==="leela")t="wine";' +
    'if(t!=="brasa"&&t!=="wine"&&t!=="dark-wine")' +
    `t=${JSON.stringify(defaultTheme)};` +
    'document.documentElement.setAttribute("data-theme",t);' +
    '}catch(e){' +
    `document.documentElement.setAttribute("data-theme",${JSON.stringify(defaultTheme)});` +
    '}})();'
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ThemeProviderProps {
  /**
   * Tema controlado pelo app. Quando presente, vence a preferência
   * persistida (no mount e a cada mudança). Sem a prop, a preferência
   * do usuário em localStorage decide, com fallback 'brasa'.
   */
  theme?: Theme;
  children: ReactNode;
}

export function ThemeProvider({
  theme: themeProp,
  children,
}: ThemeProviderProps): JSX.Element {
  const [theme, setThemeState] = useState<Theme>(
    () => themeProp ?? readStoredTheme('brasa'),
  );

  // Prop controlada muda → ela manda (F04: a prop nunca é ignorada)
  useEffect(() => {
    if (themeProp !== undefined) {
      setThemeState(themeProp);
    }
  }, [themeProp]);

  // Aplica data-theme no <html> antes do paint (layout effect no cliente)
  useIsomorphicLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Persiste apenas escolha explícita do usuário (setTheme), nunca o mount —
  // assim a prop do app não sobrescreve a preferência guardada.
  const setTheme = (next: Theme): void => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
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
