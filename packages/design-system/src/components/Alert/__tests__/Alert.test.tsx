// =============================================================================
// Alert — o aviso em bloco.
//
// Cada caso é um vetor de reincidência real: os quatro avisos que o checkout
// escreveu à mão (`AvisoPedidoEncerrado`, `AvisoPedidoEmConfirmacao`,
// `ProcessandoPagamento`, `DesfechoPosPagamento`) e as cinco divergências entre
// eles. O bloco mais importante é o do canal de ARIA — os três primeiros
// escolheram canais diferentes, cada um com a razão escrita no topo do arquivo,
// e o componente tem de conseguir servir os três sem apagar a distinção.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from '../Alert';

describe('Alert', () => {
  it('renderiza título e corpo', () => {
    render(
      <Alert title="Este pedido não foi concluído">
        A cobrança não foi confirmada e este pedido não vale mais.
      </Alert>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Este pedido não foi concluído' })).toBeInTheDocument();
    expect(screen.getByText(/A cobrança não foi confirmada/)).toBeInTheDocument();
  });

  it('o corpo sozinho, sem título, continua válido', () => {
    render(<Alert>Só o corpo.</Alert>);
    expect(screen.getByText('Só o corpo.')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it.each([2, 3, 4] as const)('titleAs="h%s" muda o NÍVEL do heading', (level) => {
    render(<Alert title="Aviso" titleAs={`h${level}` as 'h2' | 'h3' | 'h4'} />);
    expect(screen.getByRole('heading', { level })).toBeInTheDocument();
  });

  it.each([
    ['info', 'feedback-info'],
    ['vitoria', 'feedback-success'],
    ['alerta', 'feedback-warning'],
    ['vulcao', 'feedback-danger'],
  ] as const)('tone="%s" usa o trio de tokens de %s', (tone, familia) => {
    render(
      <Alert tone={tone} data-testid="a">
        corpo
      </Alert>,
    );
    const classes = screen.getByTestId('a').className;
    expect(classes).toContain(`border-[var(--${familia})]`);
    expect(classes).toContain(`bg-[var(--${familia}-surface)]`);
    expect(classes).toContain(`text-[var(--${familia}-fg)]`);
  });

  it('info é o tom default', () => {
    render(<Alert data-testid="a">corpo</Alert>);
    expect(screen.getByTestId('a').className).toContain('bg-[var(--feedback-info-surface)]');
  });

  // ── O canal de ARIA ──────────────────────────────────────────────────────
  //
  // O default é `none` porque aviso que já estava na tela quando ela carregou
  // NÃO é live region: anunciar conteúdo estático a cada render é ruído, e
  // ruído treina a pessoa a ignorar o canal.
  it('sem live region por default', () => {
    render(<Alert data-testid="a">corpo</Alert>);
    const el = screen.getByTestId('a');
    expect(el).not.toHaveAttribute('role');
    expect(el).not.toHaveAttribute('aria-live');
  });

  // AvisoPedidoEncerrado: desfecho final que muda o que a pessoa precisa fazer.
  it('live="alert" é assertivo e NÃO carrega aria-live', () => {
    render(
      <Alert live="alert" tone="alerta" data-testid="a">
        corpo
      </Alert>,
    );
    const el = screen.getByTestId('a');
    expect(el).toHaveAttribute('role', 'alert');
    // `role="alert"` já é assertivo. Somar `aria-live="polite"` é contradição,
    // e o navegador resolve do jeito dele — um defeito que teste nenhum pega
    // depois. É por isso que os dois saem de UMA prop.
    expect(el).not.toHaveAttribute('aria-live');
  });

  // ProcessandoPagamento: a espera não pode atropelar o anúncio de erro que
  // divide a tela com ela.
  it('live="status" é polido, com role e aria-live coerentes', () => {
    render(
      <Alert live="status" data-testid="a">
        corpo
      </Alert>,
    );
    const el = screen.getByTestId('a');
    expect(el).toHaveAttribute('role', 'status');
    expect(el).toHaveAttribute('aria-live', 'polite');
  });

  it('os três canais são mutuamente exclusivos', () => {
    const canais = [
      ['none', null, null],
      ['alert', 'alert', null],
      ['status', 'status', 'polite'],
    ] as const;
    for (const [live, role, ariaLive] of canais) {
      const { unmount } = render(
        <Alert live={live} data-testid="a">
          corpo
        </Alert>,
      );
      const el = screen.getByTestId('a');
      expect(el.getAttribute('role')).toBe(role);
      expect(el.getAttribute('aria-live')).toBe(ariaLive);
      unmount();
    }
  });

  // ── Ícone ────────────────────────────────────────────────────────────────
  it('traz o ícone do tom por default, escondido do leitor de tela', () => {
    const { container } = render(<Alert data-testid="a">corpo</Alert>);
    const wrapper = container.querySelector('[aria-hidden]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector('svg')).not.toBeNull();
  });

  // AvisoPedidoEmConfirmacao troca o ícone do tom por um envelope: o aviso é
  // `info`, mas o que ele pede é olhar o e-mail.
  it('icon troca o ícone do tom', () => {
    render(
      <Alert icon={<span data-testid="envelope">✉</span>} data-testid="a">
        corpo
      </Alert>,
    );
    expect(screen.getByTestId('envelope')).toBeInTheDocument();
  });

  it('icon={null} remove o ícone', () => {
    const { container } = render(
      <Alert icon={null} data-testid="a">
        corpo
      </Alert>,
    );
    expect(container.querySelector('svg')).toBeNull();
  });

  it('o ícone usa o token de tamanho, nunca px cru', () => {
    const { container } = render(<Alert data-testid="a">corpo</Alert>);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('w-[var(--alert-icon-size)]');
    expect(svg?.getAttribute('class')).toContain('h-[var(--alert-icon-size)]');
  });

  // ── Ações ────────────────────────────────────────────────────────────────
  it('renderiza o slot de ações', () => {
    render(
      <Alert title="Estamos confirmando o seu pedido" actions={<button>Meus pedidos</button>}>
        corpo
      </Alert>,
    );
    expect(screen.getByRole('button', { name: 'Meus pedidos' })).toBeInTheDocument();
  });

  it('sem ações, nenhum contêiner de ação sobra', () => {
    const { container } = render(<Alert>corpo</Alert>);
    expect(container.querySelector('button')).toBeNull();
  });

  it('aceita className e props nativas', () => {
    render(
      <Alert className="teste-alert" aria-label="aviso" data-testid="a">
        corpo
      </Alert>,
    );
    expect(screen.getByTestId('a')).toHaveClass('teste-alert');
    expect(screen.getByTestId('a')).toHaveAttribute('aria-label', 'aviso');
  });

  // ── A forma é UMA ────────────────────────────────────────────────────────
  //
  // As quatro cópias do checkout divergiam em raio, padding, gap, tipografia do
  // título e posição do ícone. Nenhuma dessas diferenças era decisão. Este caso
  // trava que o componente não reabriu nenhuma delas como prop.
  it('a geometria não é configurável — quatro cópias, uma forma', () => {
    const props = Object.keys(
      // Só o que a API aceita; se alguém acrescentar `size` ou `radius`, este
      // caso não pega sozinho, mas a linha abaixo diz o que se espera.
      { tone: 1, title: 1, titleAs: 1, icon: 1, live: 1, actions: 1, children: 1, className: 1 },
    );
    expect(props).not.toContain('size');
    expect(props).not.toContain('radius');
    expect(props).not.toContain('padding');
  });

  it('o raio e o padding saem de token, iguais em todos os tons', () => {
    for (const tone of ['info', 'vitoria', 'alerta', 'vulcao'] as const) {
      const { unmount } = render(
        <Alert tone={tone} data-testid="a">
          corpo
        </Alert>,
      );
      const classes = screen.getByTestId('a').className;
      expect(classes).toContain('rounded-[var(--radius-lg)]');
      expect(classes).toContain('p-[var(--spacing-5)]');
      expect(classes).toContain('gap-[var(--spacing-3)]');
      unmount();
    }
  });
});
