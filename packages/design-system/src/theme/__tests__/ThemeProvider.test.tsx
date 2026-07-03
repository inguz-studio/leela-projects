import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeProvider';

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
        onClick={() => setTheme(theme === 'brasa' ? 'leela' : 'brasa')}
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

  it('sets data-theme="leela" when prop is leela', () => {
    render(
      <ThemeProvider theme="leela">
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('leela');
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

    expect(getByTestId('theme-value').textContent).toBe('leela');
    expect(document.documentElement.getAttribute('data-theme')).toBe('leela');
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

    expect(localStorage.getItem('leela-theme-preference')).toBe('leela');
  });

  it('restores theme from localStorage on mount', () => {
    localStorage.setItem('leela-theme-preference', 'leela');

    const { getByTestId } = render(
      <ThemeProvider theme="brasa">
        <ThemeDisplay />
      </ThemeProvider>,
    );

    expect(getByTestId('theme-value').textContent).toBe('leela');
  });

  it('throws when useTheme is used outside ThemeProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeDisplay />)).toThrow('[useTheme]');
    consoleSpy.mockRestore();
  });
});
