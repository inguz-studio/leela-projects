import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repasse, Timestamp } from '@leela/core';
import { HistoricoRepasses } from '../HistoricoRepasses';

function ts(ms: number): Timestamp {
  return { seconds: Math.floor(ms / 1000), nanoseconds: 0, toDate: () => new Date(ms), toMillis: () => ms };
}

function mkRepasse(over: Partial<Repasse> = {}): Repasse {
  return {
    id: 'r1',
    tenantId: 'castelo',
    valor: 5000,
    estado: 'solicitado',
    dadosBancariosSnapshot: {
      tenantId: 'castelo',
      banco: '260 — Nubank',
      agencia: '0001',
      contaMascarada: '****1234',
      tipo: 'corrente',
      pixMascarado: null,
      titular: 'Marina Castelo',
      cpfCnpjMascarado: '***.***.***-12',
    },
    transicoes: [],
    criadoEm: ts(Date.UTC(2026, 3, 10)),
    atualizadoEm: ts(Date.UTC(2026, 3, 10)),
    ...over,
  };
}

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ');
const noop = () => {};

describe('HistoricoRepasses (E09s-L3-T4)', () => {
  it('loading → status acessível', () => {
    render(<HistoricoRepasses repasses={[]} loading error={null} onRetry={noop} />);
    expect(screen.getByRole('status', { name: 'Carregando histórico de repasses' })).toBeInTheDocument();
  });

  it('erro → mensagem honesta + Tentar novamente', async () => {
    const onRetry = vi.fn();
    render(<HistoricoRepasses repasses={[]} loading={false} error={new Error('x')} onRetry={onRetry} />);
    expect(screen.getByText('Não foi possível carregar o histórico de repasses.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('vazio → EmptyState honesto (não solicitou ainda)', () => {
    render(<HistoricoRepasses repasses={[]} loading={false} error={null} onRetry={noop} />);
    expect(screen.getByText('Nenhum repasse solicitado ainda')).toBeInTheDocument();
  });

  it('lista com badges por estado + valores', () => {
    const { container } = render(
      <HistoricoRepasses
        repasses={[
          mkRepasse({ id: 'a', estado: 'solicitado', valor: 5000 }),
          mkRepasse({ id: 'b', estado: 'recusado', valor: 1200 }),
          mkRepasse({ id: 'c', estado: 'pago', valor: 3000, comprovanteNumero: 'REP-2026-0007' }),
        ]}
        loading={false}
        error={null}
        onRetry={noop}
      />,
    );
    expect(screen.getByText('Solicitado')).toBeInTheDocument();
    expect(screen.getByText('Recusado')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.getByText('REP-2026-0007')).toBeInTheDocument();
    expect(norm(container.textContent)).toContain('R$ 5.000,00');
  });

  it('só o repasse PAGO tem "Ver comprovante"', () => {
    render(
      <HistoricoRepasses
        repasses={[
          mkRepasse({ id: 'a', estado: 'solicitado' }),
          mkRepasse({ id: 'c', estado: 'pago', comprovanteNumero: 'REP-2026-0007' }),
        ]}
        loading={false}
        error={null}
        onRetry={noop}
      />,
    );
    // Exatamente 1 botão de comprovante (o do pago).
    expect(screen.getAllByRole('button', { name: 'Ver comprovante' })).toHaveLength(1);
  });

  it('abrir um pago → comprovante numerado + mascarado + aviso RN-356', async () => {
    render(
      <HistoricoRepasses
        repasses={[mkRepasse({ id: 'c', estado: 'pago', valor: 3000, comprovanteNumero: 'REP-2026-0008' })]}
        loading={false}
        error={null}
        onRetry={noop}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ver comprovante' }));
    const dialog = screen.getByRole('dialog');
    expect(norm(dialog.textContent)).toContain('REP-2026-0008');
    expect(norm(dialog.textContent)).toContain('****1234');
    expect(norm(dialog.textContent)).toContain('R$ 3.000,00');
    expect(screen.getByText(/pagamento processado manualmente/)).toBeInTheDocument();
    // PDF ausente por ora (V1.1).
    expect(screen.getByText(/PDF/)).toBeInTheDocument();
  });
});
