import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegistrarPagamentoModal } from '../RegistrarPagamentoModal';
import { mkFilaItem } from '../../_test/fixtures';
import type { GetBankDetailsResult } from '@leela/api-client';

const item = mkFilaItem({ id: 'rep-9', tenantId: 'castelo-producoes', estado: 'aprovado', valor: 8500 }, 'Castelo Produções');

const detalhes: GetBankDetailsResult = {
  tenantId: 'castelo-producoes',
  repasseId: 'rep-9',
  conta: '123456-7',
  pix: 'marina@demo.dev',
  banco: '260 — Nubank',
  agencia: '0001',
  tipo: 'corrente',
  titular: 'Marina Castelo',
  cpfCnpjMascarado: '***.***.***-12',
  avisoAuditoria: 'Acesso a dado bancário registrado (auditoria LGPD).',
};

describe('RegistrarPagamentoModal', () => {
  it('mostra loading enquanto busca o dado bancário', () => {
    render(
      <RegistrarPagamentoModal
        open
        onOpenChange={() => {}}
        item={item}
        fetchBankDetails={vi.fn().mockReturnValue(new Promise(() => {}))}
        onConfirm={() => {}}
        confirming={false}
      />,
    );
    expect(screen.getByRole('status', { name: 'Carregando dados bancários' })).toBeInTheDocument();
  });

  it('exibe número completo + aviso de auditoria + aviso de registro manual (RN-356)', async () => {
    render(
      <RegistrarPagamentoModal
        open
        onOpenChange={() => {}}
        item={item}
        fetchBankDetails={vi.fn().mockResolvedValue(detalhes)}
        onConfirm={() => {}}
        confirming={false}
      />,
    );
    expect(await screen.findByText('123456-7')).toBeInTheDocument();
    expect(screen.getByText('marina@demo.dev')).toBeInTheDocument();
    expect(screen.getByText(/Acesso a dado bancário registrado/i)).toBeInTheDocument();
    expect(screen.getByText(/nenhuma transferência bancária é feita/i)).toBeInTheDocument();
  });

  it('confirmar dispara onConfirm (markRepassePago é do container)', async () => {
    const onConfirm = vi.fn();
    render(
      <RegistrarPagamentoModal
        open
        onOpenChange={() => {}}
        item={item}
        fetchBankDetails={vi.fn().mockResolvedValue(detalhes)}
        onConfirm={onConfirm}
        confirming={false}
      />,
    );
    const botao = await screen.findByRole('button', { name: 'Registrar pagamento' });
    await userEvent.click(botao);
    expect(onConfirm).toHaveBeenCalled();
  });

  it('confirmar fica desabilitado enquanto o dado ainda carrega', () => {
    render(
      <RegistrarPagamentoModal
        open
        onOpenChange={() => {}}
        item={item}
        fetchBankDetails={vi.fn().mockReturnValue(new Promise(() => {}))}
        onConfirm={() => {}}
        confirming={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Registrar pagamento' })).toBeDisabled();
  });

  it('erro na busca → alerta honesto e confirmar bloqueado', async () => {
    render(
      <RegistrarPagamentoModal
        open
        onOpenChange={() => {}}
        item={item}
        fetchBankDetails={vi.fn().mockRejectedValue(new Error('permission-denied'))}
        onConfirm={() => {}}
        confirming={false}
      />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível carregar/i);
    expect(screen.getByRole('button', { name: 'Registrar pagamento' })).toBeDisabled();
  });

  it('LGPD: ao fechar, o número em claro sai do documento', async () => {
    const { rerender } = render(
      <RegistrarPagamentoModal
        open
        onOpenChange={() => {}}
        item={item}
        fetchBankDetails={vi.fn().mockResolvedValue(detalhes)}
        onConfirm={() => {}}
        confirming={false}
      />,
    );
    expect(await screen.findByText('123456-7')).toBeInTheDocument();
    rerender(
      <RegistrarPagamentoModal
        open={false}
        onOpenChange={() => {}}
        item={null}
        fetchBankDetails={vi.fn().mockResolvedValue(detalhes)}
        onConfirm={() => {}}
        confirming={false}
      />,
    );
    expect(screen.queryByText('123456-7')).not.toBeInTheDocument();
  });
});
