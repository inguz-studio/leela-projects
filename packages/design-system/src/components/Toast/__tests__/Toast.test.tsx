import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Toast } from '../Toast';
import {
  ToastProvider,
  useToast,
  DEFAULT_TOAST_DURATION,
  type ToastOptions,
} from '../ToastProvider';

// ---------------------------------------------------------------------------
// Toast (presentational)
// ---------------------------------------------------------------------------

describe('Toast', () => {
  it('renders role="status" for non-danger variants', () => {
    render(<Toast title="Evento salvo" variant="success" />);
    expect(screen.getByRole('status')).toHaveTextContent('Evento salvo');
  });

  it('renders role="alert" for danger', () => {
    render(<Toast title="Falha ao salvar" variant="danger" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao salvar');
  });

  it('applies border-left token per variant', () => {
    render(<Toast title="Ok" variant="success" />);
    const el = screen.getByRole('status');
    expect(el.className).toContain('border-l-[length:var(--toast-border-left)]');
    expect(el.className).toContain('border-l-[color:var(--feedback-success)]');
  });

  it('renders description and dismiss button', () => {
    const onDismiss = vi.fn();
    render(<Toast title="Título" description="Detalhe" onDismiss={onDismiss} />);
    expect(screen.getByText('Detalhe')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar notificação' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// ToastProvider + useToast
// ---------------------------------------------------------------------------

function Trigger({ options }: { options: ToastOptions }) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast(options)}>
      Disparar
    </button>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('toast() shows a toast in the viewport', () => {
    render(
      <ToastProvider>
        <Trigger options={{ title: 'Inscrição confirmada', variant: 'success' }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disparar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Inscrição confirmada');
  });

  it('auto-dismisses non-danger after 4s', () => {
    render(
      <ToastProvider>
        <Trigger options={{ title: 'Salvo', variant: 'success' }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disparar' }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOAST_DURATION);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('danger persists past 4s until manual dismiss', () => {
    render(
      <ToastProvider>
        <Trigger options={{ title: 'Erro no pagamento', variant: 'danger' }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disparar' }));

    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOAST_DURATION * 3);
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar notificação' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('respects custom duration', () => {
    render(
      <ToastProvider>
        <Trigger options={{ title: 'Rápido', variant: 'info', duration: 1000 }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disparar' }));

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('stacks multiple toasts', () => {
    render(
      <ToastProvider>
        <Trigger options={{ title: 'Um', variant: 'info' }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disparar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Disparar' }));
    expect(screen.getAllByRole('status').length).toBe(2);
  });

  it('useToast throws outside provider', () => {
    function Orphan() {
      useToast();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/ToastProvider/);
  });
});
