import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { ThemeProvider, useTheme, getThemeInitScript } from '../ThemeProvider';

// ---------------------------------------------------------------------------
// Helper component
// ---------------------------------------------------------------------------

function ThemeDisplay() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button
        type="button"
        onClick={() => setTheme(theme === 'brasa' ? 'wine' : 'brasa')}
        data-testid="toggle"
      >
        Toggle
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Reset data-theme attribute before each test
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  it('sets data-theme="brasa" on <html> by default', () => {
    render(
      <ThemeProvider theme="brasa">
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('brasa');
  });

  it('sets data-theme="wine" when prop is wine', () => {
    render(
      <ThemeProvider theme="wine">
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('wine');
  });

  it('exposes theme name via useTheme', () => {
    const { getByTestId } = render(
      <ThemeProvider theme="brasa">
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(getByTestId('theme-value').textContent).toBe('brasa');
  });

  it('switches theme on setTheme call', () => {
    const { getByTestId } = render(
      <ThemeProvider theme="brasa">
        <ThemeDisplay />
      </ThemeProvider>,
    );

    act(() => {
      getByTestId('toggle').click();
    });

    expect(getByTestId('theme-value').textContent).toBe('wine');
    expect(document.documentElement.getAttribute('data-theme')).toBe('wine');
  });

  it('persists theme preference in localStorage', () => {
    const { getByTestId } = render(
      <ThemeProvider theme="brasa">
        <ThemeDisplay />
      </ThemeProvider>,
    );

    act(() => {
      getByTestId('toggle').click();
    });

    expect(localStorage.getItem('leela-theme-preference')).toBe('wine');
  });

  it('restores theme from localStorage on mount (sem prop theme)', () => {
    localStorage.setItem('leela-theme-preference', 'wine');

    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    expect(getByTestId('theme-value').textContent).toBe('wine');
  });

  it('retrocompat: valor persistido "leela" migra p/ "wine" na leitura', () => {
    localStorage.setItem('leela-theme-preference', 'leela');

    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    expect(getByTestId('theme-value').textContent).toBe('wine');
    expect(document.documentElement.getAttribute('data-theme')).toBe('wine');
  });

  it('F04: prop theme explícita vence a preferência persistida', () => {
    localStorage.setItem('leela-theme-preference', 'brasa');

    const { getByTestId } = render(
      <ThemeProvider theme="wine">
        <ThemeDisplay />
      </ThemeProvider>,
    );

    expect(getByTestId('theme-value').textContent).toBe('wine');
    expect(document.documentElement.getAttribute('data-theme')).toBe('wine');
  });

  it('F04: mudança da prop theme re-sincroniza o tema ativo', () => {
    const { getByTestId, rerender } = render(
      <ThemeProvider theme="brasa">
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(getByTestId('theme-value').textContent).toBe('brasa');

    rerender(
      <ThemeProvider theme="wine">
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(getByTestId('theme-value').textContent).toBe('wine');
    expect(document.documentElement.getAttribute('data-theme')).toBe('wine');
  });

  it('não persiste o tema no mount — só em setTheme (escolha do usuário)', () => {
    render(
      <ThemeProvider theme="wine">
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(localStorage.getItem('leela-theme-preference')).toBeNull();
  });

  it('throws when useTheme is used outside ThemeProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeDisplay />)).toThrow('[useTheme]');
    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Anti-FOUC init script (F05)
// ---------------------------------------------------------------------------

describe('getThemeInitScript', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  it('aplica o tema padrão quando não há preferência persistida', () => {
    new Function(getThemeInitScript('brasa'))();
    expect(document.documentElement.getAttribute('data-theme')).toBe('brasa');
  });

  it('aplica a preferência persistida antes do paint', () => {
    localStorage.setItem('leela-theme-preference', 'wine');
    new Function(getThemeInitScript('brasa'))();
    expect(document.documentElement.getAttribute('data-theme')).toBe('wine');
  });

  it('retrocompat: init script migra "leela" persistido p/ "wine"', () => {
    localStorage.setItem('leela-theme-preference', 'leela');
    new Function(getThemeInitScript('brasa'))();
    expect(document.documentElement.getAttribute('data-theme')).toBe('wine');
  });

  it('ignora valores inválidos no storage e cai no padrão', () => {
    localStorage.setItem('leela-theme-preference', 'hacker');
    new Function(getThemeInitScript('wine'))();
    expect(document.documentElement.getAttribute('data-theme')).toBe('wine');
  });
});
