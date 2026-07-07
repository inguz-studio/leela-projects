// =============================================================================
// ChartErrorBoundary — isola o plot de gráfico (Recharts) do resto do card.
// Se a lib de render falhar (ex.: ambiente sem layout como jsdom, ou um dado
// degenerado), a rosca/barra some mas a LEGENDA/TABELA equivalente e o rótulo
// acessível continuam — o painel nunca "apaga". Degradação graciosa (dataviz:
// a table view é o fallback canônico). Presentational, sem estado externo.
// =============================================================================

import * as React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  failed: boolean;
}

export class ChartErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render(): React.ReactNode {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
