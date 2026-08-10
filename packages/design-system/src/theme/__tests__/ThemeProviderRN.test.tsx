/**
 * ThemeProviderRN — contrato de precedência espelhado do web (F04):
 *   prop > storage > default, e prop pós-mount re-sincroniza.
 * (B1 do REVIEW-E01-b: o storage restaurado no mount sobrescrevia a prop
 * e mudanças da prop pós-mount eram ignoradas.)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import {
  ThemeProviderRN,
  useTheme,
  type StorageAdapter,
  type Theme,
} from '../ThemeProviderRN';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStorage(initial: string | null): StorageAdapter & {
  store: Map<string, string>;
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
} {
  const store = new Map<string, string>();
  if (initial !== null) store.set('leela-theme-preference', initial);
  const adapter = {
    store,
    getItem: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
  };
  return adapter;
}

function ThemeDisplay() {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <span data-testid="theme-value">{theme}</span>
      <button
        type="button"
        data-testid="toggle"
        onClick={() => setTheme(theme === 'brasa' ? 'wine' : 'brasa')}
      >
        Toggle
      </button>
    </>
  );
}

/** Deixa as promises do storage resolverem dentro de act. */
async function flushStorage(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ThemeProviderRN', () => {
  it('default é brasa sem prop e sem storage', () => {
    const { getByTestId } = render(
      <ThemeProviderRN>
        <ThemeDisplay />
      </ThemeProviderRN>,
    );
    expect(getByTestId('theme-value').textContent).toBe('brasa');
  });

  it('restaura preferência do storage no mount (sem prop theme)', async () => {
    const storage = makeStorage('wine');
    const { getByTestId } = render(
      <ThemeProviderRN storage={storage}>
        <ThemeDisplay />
      </ThemeProviderRN>,
    );
    await waitFor(() =>
      expect(getByTestId('theme-value').textContent).toBe('wine'),
    );
  });

  it('restaura preferência "dark-wine" do storage no mount (sem prop theme)', async () => {
    const storage = makeStorage('dark-wine');
    const { getByTestId } = render(
      <ThemeProviderRN storage={storage}>
        <ThemeDisplay />
      </ThemeProviderRN>,
    );
    await waitFor(() =>
      expect(getByTestId('theme-value').textContent).toBe('dark-wine'),
    );
  });

  it('retrocompat: valor "leela" no storage migra p/ "wine"', async () => {
    const storage = makeStorage('leela');
    const { getByTestId } = render(
      <ThemeProviderRN storage={storage}>
        <ThemeDisplay />
      </ThemeProviderRN>,
    );
    await waitFor(() =>
      expect(getByTestId('theme-value').textContent).toBe('wine'),
    );
  });

  it('ignora valor inválido no storage e mantém o default', async () => {
    const storage = makeStorage('hacker');
    const { getByTestId } = render(
      <ThemeProviderRN storage={storage}>
        <ThemeDisplay />
      </ThemeProviderRN>,
    );
    await flushStorage();
    expect(getByTestId('theme-value').textContent).toBe('brasa');
  });

  it('B1: prop theme explícita vence a preferência persistida (F04 espelhado)', async () => {
    const storage = makeStorage('brasa');
    const { getByTestId } = render(
      <ThemeProviderRN theme="wine" storage={storage}>
        <ThemeDisplay />
      </ThemeProviderRN>,
    );
    await flushStorage();
    // storage dizia brasa; prop wine manda — mesmo depois de o getItem resolver
    expect(getByTestId('theme-value').textContent).toBe('wine');
    // com prop presente, o storage nem é consultado
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it('B1: mudança da prop theme pós-mount re-sincroniza o tema ativo', async () => {
    const storage = makeStorage(null);
    const { getByTestId, rerender } = render(
      <ThemeProviderRN theme="brasa" storage={storage}>
        <ThemeDisplay />
      </ThemeProviderRN>,
    );
    expect(getByTestId('theme-value').textContent).toBe('brasa');

    rerender(
      <ThemeProviderRN theme="wine" storage={storage}>
        <ThemeDisplay />
      </ThemeProviderRN>,
    );
    await flushStorage();
    expect(getByTestId('theme-value').textContent).toBe('wine');
  });

  it('B1: getItem que resolve tarde não sobrescreve prop que apareceu depois', async () => {
    let resolveGet!: (value: string | null) => void;
    const storage: StorageAdapter = {
      getItem: vi.fn(
        () =>
          new Promise<string | null>((resolve) => {
            resolveGet = resolve;
          }),
      ),
      setItem: vi.fn(() => Promise.resolve()),
    };

    // mount SEM prop → storage é consultado (promise pendente)
    const { getByTestId, rerender } = render(
      <ThemeProviderRN storage={storage}>
        <ThemeDisplay />
      </ThemeProviderRN>,
    );
    expect(getByTestId('theme-value').textContent).toBe('brasa');

    // prop aparece antes de o storage resolver
    rerender(
      <ThemeProviderRN theme="wine" storage={storage}>
        <ThemeDisplay />
      </ThemeProviderRN>,
    );

    // storage resolve tarde com outro tema — não pode vencer a prop
    await act(async () => {
      resolveGet('brasa');
      await Promise.resolve();
    });
    expect(getByTestId('theme-value').textContent).toBe('wine');
  });

  it('setTheme troca o tema e persiste no storage', async () => {
    const storage = makeStorage(null);
    const { getByTestId } = render(
      <ThemeProviderRN storage={storage}>
        <ThemeDisplay />
      </ThemeProviderRN>,
    );
    await flushStorage();

    act(() => {
      getByTestId('toggle').click();
    });

    expect(getByTestId('theme-value').textContent).toBe('wine');
    await waitFor(() =>
      expect(storage.setItem).toHaveBeenCalledWith(
        'leela-theme-preference',
        'wine',
      ),
    );
  });

  it('não persiste o tema no mount — só em setTheme (escolha do usuário)', async () => {
    const storage = makeStorage(null);
    render(
      <ThemeProviderRN theme="wine" storage={storage}>
        <ThemeDisplay />
      </ThemeProviderRN>,
    );
    await flushStorage();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('tokens acompanham o tema ativo', async () => {
    const themes: Theme[] = [];
    function TokenProbe() {
      const { theme, tokens } = useTheme();
      themes.push(theme);
      return <span data-testid="surface">{tokens['surface-base']}</span>;
    }
    const { getByTestId, rerender } = render(
      <ThemeProviderRN theme="brasa">
        <TokenProbe />
      </ThemeProviderRN>,
    );
    const brasaSurface = getByTestId('surface').textContent;
    rerender(
      <ThemeProviderRN theme="wine">
        <TokenProbe />
      </ThemeProviderRN>,
    );
    expect(getByTestId('surface').textContent).not.toBe(brasaSurface);
  });

  it('throws quando useTheme é usado fora do ThemeProviderRN', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeDisplay />)).toThrow('[useTheme]');
    consoleSpy.mockRestore();
  });
});
