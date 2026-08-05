/**
 * ToastProvider + useToast — fila de toasts com auto-dismiss.
 *
 * - `toast({...})` adiciona e devolve o id.
 * - Auto-dismiss em 4s (DEFAULT_TOAST_DURATION); danger persiste até
 *   dismiss manual (regra T4), salvo `duration` explícito (opt-in).
 * - Viewport fixo no canto inferior direito; cada toast tem botão fechar.
 *
 * SAÍDA ANIMADA (BUILD-MOTION · 04/08). `dismiss(id)` não tira mais o item da
 * fila na hora: marca o item como SAINDO (o `Toast` recebe `state="closed"` e
 * roda a animação de saída) e só remove quando a duração do token termina. Sem
 * isso o nó evapora e não há o que animar — mesma raiz do fechamento seco dos
 * modais.
 *
 * DUAS FILAS DE TIMER, e a distinção importa: `timersRef` é o auto-dismiss
 * (quanto tempo o aviso FICA), `saidaRef` é a animação (quanto tempo ele leva
 * para SUMIR). Confundir os dois faria o toast danger — que não auto-dispensa —
 * herdar um timer de remoção que ele nunca deveria ter.
 *
 * Sem token de motion (SSR, jsdom, tema não importado) a duração é 0 e o
 * `dismiss` remove no mesmo tick, exatamente como antes desta lane.
 */

import * as React from 'react';
import { Toast, type ToastVariant } from './Toast';
import { cn } from '../../utils/cn';
import { duracaoDeSaidaMs } from '../../utils/overlayMotion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Duração padrão antes do auto-dismiss (danger nunca auto-dispensa). */
export const DEFAULT_TOAST_DURATION = 4000;

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Sobrescreve os 4s padrão. Em danger, defini-lo liga o auto-dismiss (senão persiste). */
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
  // Ids em SAÍDA: seguem na fila (e na tela) até a animação terminar.
  const [saindo, setSaindo] = React.useState<ReadonlySet<string>>(() => new Set());
  const timersRef = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const saidaRef = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const counterRef = React.useRef(0);

  const remover = React.useCallback((id: string) => {
    saidaRef.current.delete(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    setSaindo((prev) => {
      if (!prev.has(id)) return prev;
      const proximo = new Set(prev);
      proximo.delete(id);
      return proximo;
    });
  }, []);

  const dismiss = React.useCallback(
    (id: string) => {
      const timer = timersRef.current.get(id);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
      // Já está saindo: um segundo clique no X não reinicia a animação.
      if (saidaRef.current.has(id)) return;

      const ms = duracaoDeSaidaMs();
      if (ms <= 0) {
        remover(id);
        return;
      }
      setSaindo((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
      saidaRef.current.set(
        id,
        setTimeout(() => remover(id), ms),
      );
    },
    [remover],
  );

  const toast = React.useCallback(
    (options: ToastOptions): string => {
      counterRef.current += 1;
      const id = `toast-${counterRef.current}`;
      setItems((prev) => [...prev, { ...options, id }]);

      // danger persiste por PADRÃO (T4); demais somem em 4s. Um `duration`
      // EXPLÍCITO liga o auto-dismiss inclusive em danger (opt-in) — antes o
      // duration era ignorado em danger (bug do showroom).
      const autoDismiss = options.variant !== 'danger' || options.duration !== undefined;
      if (autoDismiss) {
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

  // Limpa timers pendentes no unmount — os dois relógios (ficar e sumir).
  React.useEffect(() => {
    const timers = timersRef.current;
    const saidas = saidaRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      saidas.forEach((timer) => clearTimeout(timer));
      saidas.clear();
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
        {items.map((item) => {
          const saiu = saindo.has(item.id);
          return (
            // Toast em saída não engole clique: ele já não é alcançável, só
            // ainda é visível.
            <div key={item.id} className={saiu ? 'pointer-events-none' : 'pointer-events-auto'}>
              <Toast
                title={item.title}
                description={item.description}
                variant={item.variant ?? 'info'}
                state={saiu ? 'closed' : 'open'}
                onDismiss={() => dismiss(item.id)}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

ToastProvider.displayName = 'ToastProvider';

export { ToastProvider };
