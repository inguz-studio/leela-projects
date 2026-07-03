/**
 * ToastProvider + useToast — fila de toasts com auto-dismiss.
 *
 * - `toast({...})` adiciona e devolve o id.
 * - Auto-dismiss em 4s (DEFAULT_TOAST_DURATION); danger persiste até
 *   dismiss manual (regra T4).
 * - Viewport fixo no canto inferior direito; cada toast tem botão fechar.
 */

import * as React from 'react';
import { Toast, type ToastVariant } from './Toast';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Duração padrão antes do auto-dismiss (danger nunca auto-dispensa). */
export const DEFAULT_TOAST_DURATION = 4000;

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Sobrescreve os 4s padrão (ignorado em danger, que persiste). */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

export interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast deve ser usado dentro de <ToastProvider>.');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ToastProviderProps {
  children: React.ReactNode;
  viewportClassName?: string;
}

function ToastProvider({ children, viewportClassName }: ToastProviderProps): JSX.Element {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const timersRef = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const counterRef = React.useRef(0);

  const dismiss = React.useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback(
    (options: ToastOptions): string => {
      counterRef.current += 1;
      const id = `toast-${counterRef.current}`;
      setItems((prev) => [...prev, { ...options, id }]);

      // danger persiste (T4); demais somem em 4s
      if (options.variant !== 'danger') {
        const timer = setTimeout(
          () => dismiss(id),
          options.duration ?? DEFAULT_TOAST_DURATION,
        );
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  // Limpa timers pendentes no unmount
  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Viewport */}
      <div
        className={cn(
          'fixed bottom-[var(--spacing-6)] right-[var(--spacing-6)] z-50',
          'flex flex-col gap-[var(--spacing-3)]',
          'pointer-events-none',
          viewportClassName,
        )}
      >
        {items.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <Toast
              title={item.title}
              description={item.description}
              variant={item.variant ?? 'info'}
              onDismiss={() => dismiss(item.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

ToastProvider.displayName = 'ToastProvider';

export { ToastProvider };
