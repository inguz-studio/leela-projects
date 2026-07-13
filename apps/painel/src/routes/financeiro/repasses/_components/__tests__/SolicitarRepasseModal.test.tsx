import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DadosBancarios, Timestamp } from '@leela/core';
import { SolicitarRepasseModal } from '../SolicitarRepasseModal';

function ts(ms: number): Timestamp {
  return { seconds: Math.floor(ms / 1000), nanoseconds: 0, toDate: () => new Date(ms), toMillis: () => ms };
}

function mkDados(over: Partial<DadosBancarios> = {}): DadosBancarios {
  return {
    tenantId: 'castelo',
    banco: '260 — Nubank',
    agencia: '0001',
    contaMascarada: '****1234',
    tipo: 'corrente',
    pixMascarado: null,
    titular: 'Marina Castelo',
    cpfCnpjMascarado: '***.***.***-12',
    criadoEm: ts(0),
    atualizadoEm: ts(0),
    ...over,
  };
}

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ');

describe('SolicitarRepasseModal (E09s-L3-T3)', () => {
  it('lista os dados bancários MASCARADOS + o disponível', () => {
    render(
      <SolicitarRepasseModal
        open
        onOpenChange={vi.fn()}
        dados={mkDados()}
        disponivel={8500}
        running={false}
        onConfirmar={vi.fn(async () => true)}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(norm(dialog.textContent)).toContain('****1234');
    expect(norm(dialog.textContent)).toContain('Marina Castelo');
    expect(norm(dialog.textContent)).toContain('R$ 8.500,00');
  });

  it('botão Solicitar bloqueado com campo vazio', () => {
    render(
      <SolicitarRepasseModal open onOpenChange={vi.fn()} dados={mkDados()} disponivel={8500} running={false} onConfirmar={vi.fn(async () => true)} />,
    );
    expect(screen.getByRole('button', { name: 'Solicitar' })).toBeDisabled();
  });

  it('valor > disponível → botão bloqueado + hint (espelho RN-352)', async () => {
    render(
      <SolicitarRepasseModal open onOpenChange={vi.fn()} dados={mkDados()} disponivel={8500} running={false} onConfirmar={vi.fn(async () => true)} />,
    );
    await userEvent.type(screen.getByLabelText('Valor do repasse (R$)'), '9000');
    expect(screen.getByText('O valor excede o disponível para saque.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitar' })).toBeDisabled();
  });

  it('valor válido → habilita e confirma com o valor', async () => {
    const onConfirmar = vi.fn(async () => true);
    render(
      <SolicitarRepasseModal open onOpenChange={vi.fn()} dados={mkDados()} disponivel={8500} running={false} onConfirmar={onConfirmar} />,
    );
    await userEvent.type(screen.getByLabelText('Valor do repasse (R$)'), '5000');
    const botao = screen.getByRole('button', { name: 'Solicitar' });
    expect(botao).toBeEnabled();
    await userEvent.click(botao);
    expect(onConfirmar).toHaveBeenCalledWith(5000);
  });

  it('running → botão em "Enviando…" e desabilitado', () => {
    render(
      <SolicitarRepasseModal open onOpenChange={vi.fn()} dados={mkDados()} disponivel={8500} running onConfirmar={vi.fn(async () => true)} />,
    );
    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
  });
});
