import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DadosBancarios, Timestamp } from '@leela/core';
import { DadosBancariosSection } from '../DadosBancariosSection';

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
    pixMascarado: '***@g***.com',
    titular: 'Marina Castelo',
    cpfCnpjMascarado: '***.***.***-12',
    criadoEm: ts(Date.UTC(2026, 3, 1)),
    atualizadoEm: ts(Date.UTC(2026, 3, 1)),
    ...over,
  };
}

const noop = () => {};
const okSubmit = vi.fn(async () => true);

describe('DadosBancariosSection (E09s-L3-T2)', () => {
  it('loading → status acessível', () => {
    render(
      <DadosBancariosSection dados={null} loading error={null} onRetry={noop} saving={false} onSubmit={okSubmit} />,
    );
    expect(screen.getByRole('status', { name: 'Carregando dados bancários' })).toBeInTheDocument();
  });

  it('erro → mensagem honesta + Tentar novamente', async () => {
    const onRetry = vi.fn();
    render(
      <DadosBancariosSection
        dados={null}
        loading={false}
        error={new Error('x')}
        onRetry={onRetry}
        saving={false}
        onSubmit={okSubmit}
      />,
    );
    expect(screen.getByText('Não foi possível carregar seus dados bancários.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('dado salvo → mostra SÓ o mascarado (nunca número em claro) + Editar', () => {
    render(
      <DadosBancariosSection dados={mkDados()} loading={false} error={null} onRetry={noop} saving={false} onSubmit={okSubmit} />,
    );
    expect(screen.getByText('****1234')).toBeInTheDocument();
    expect(screen.getByText('***.***.***-12')).toBeInTheDocument();
    expect(screen.getByText('***@g***.com')).toBeInTheDocument();
    // Nenhum número em claro nem form visível.
    expect(screen.queryByRole('form', { name: 'Dados bancários para repasse' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('Editar reusa o form; prefilla banco (não-sensível) e pede reentrada da conta', async () => {
    render(
      <DadosBancariosSection dados={mkDados()} loading={false} error={null} onRetry={noop} saving={false} onSubmit={okSubmit} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.getByLabelText('Banco')).toHaveValue('260 — Nubank');
    // Sensível não é prefillado (só temos o mascarado — RN-354).
    expect(screen.getByLabelText('Número da conta')).toHaveValue('');
    expect(screen.getByText(/Reinsira/)).toBeInTheDocument();
  });

  it('dados null → form direto (sem resumo/Editar)', () => {
    render(
      <DadosBancariosSection dados={null} loading={false} error={null} onRetry={noop} saving={false} onSubmit={okSubmit} />,
    );
    expect(screen.getByRole('form', { name: 'Dados bancários para repasse' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('submit com campo obrigatório vazio → erro inline, sem chamar onSubmit', async () => {
    const onSubmit = vi.fn(async () => true);
    render(
      <DadosBancariosSection dados={null} loading={false} error={null} onRetry={noop} saving={false} onSubmit={onSubmit} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar dados bancários' }));
    expect(screen.getByText('Informe o banco.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submit válido → onSubmit recebe o payload (servidor cifra/mascara)', async () => {
    const onSubmit = vi.fn(async () => true);
    render(
      <DadosBancariosSection dados={null} loading={false} error={null} onRetry={noop} saving={false} onSubmit={onSubmit} />,
    );
    await userEvent.type(screen.getByLabelText('Banco'), '260 — Nubank');
    await userEvent.type(screen.getByLabelText('Agência'), '0001');
    await userEvent.type(screen.getByLabelText('Número da conta'), '12345-6');
    await userEvent.type(screen.getByLabelText('Titular'), 'Marina Castelo');
    await userEvent.type(screen.getByLabelText('CPF/CNPJ do titular'), '000.000.000-00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar dados bancários' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ banco: '260 — Nubank', conta: '12345-6', tipo: 'corrente' }),
    );
  });

  it('erro de save vira alerta inline (§2.12)', () => {
    render(
      <DadosBancariosSection
        dados={null}
        loading={false}
        error={null}
        onRetry={noop}
        saving={false}
        saveError="Não foi possível salvar os dados bancários agora."
        onSubmit={okSubmit}
      />,
    );
    expect(screen.getByText('Não foi possível salvar os dados bancários agora.')).toBeInTheDocument();
  });
});
