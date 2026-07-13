// =============================================================================
// AppErrorBoundary (500 · Painel) — LEELA-E07-web · S502-T1 (retraduzido Vite).
//
// O router atual é <BrowserRouter>+<Routes> (não data-router), então
// `errorElement` não existe sem migrar para createBrowserRouter. Um ErrorBoundary
// React (class) captura o erro de render sem a migração:
//   - boundary de SEGMENTO (layout="shell") nos *Routes.tsx → mantém sidebar/
//     header (RootShell vive acima, em App.tsx);
//   - boundary RAIZ (layout="fullscreen") em main.tsx, envolvendo <App/> → pega
//     erro fora de qualquer rota (inclusive no próprio RootShell).
//
// Registra no Sentry via observability.captureException → eventId (id de erro).
// NUNCA renderiza error.message/stack na UI (só copy canônica + eventId).
// "Tentar novamente" reseta o boundary (limpa o erro) e re-renderiza os filhos.
// =============================================================================

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { SystemStateScreen } from '@leela/design-system';
import { captureException } from '../../lib/observability';

interface AppErrorBoundaryProps {
  children: ReactNode;
  /** shell = mantém o RootShell (segmento); fullscreen = raiz. Default: shell. */
  layout?: 'shell' | 'fullscreen';
  /** Hook opcional de recuperação (ex.: revalidar dados) no "Tentar novamente". */
  onReset?: () => void;
}

interface AppErrorBoundaryState {
  error: Error | null;
  eventId: string;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null, eventId: '' };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // componentStack vai para o Sentry (contexto), nunca para o DOM.
    const eventId = captureException(error, { componentStack: info.componentStack });
    this.setState({ eventId });
  }

  private readonly handleReset = (): void => {
    this.setState({ error: null, eventId: '' });
    this.props.onReset?.();
  };

  render(): ReactNode {
    const { error, eventId } = this.state;
    if (error !== null) {
      return (
        <SystemStateScreen
          variant="error"
          layout={this.props.layout ?? 'shell'}
          title="Tropeçamos aqui, não foi você"
          message="Algo quebrou do nosso lado e a equipe já foi avisada."
          detail={eventId}
          actions={[
            { label: 'Tentar novamente', onPress: this.handleReset, variant: 'primary' },
            { label: 'Voltar', onPress: () => window.history.back(), variant: 'secondary' },
          ]}
        />
      );
    }
    return this.props.children;
  }
}
