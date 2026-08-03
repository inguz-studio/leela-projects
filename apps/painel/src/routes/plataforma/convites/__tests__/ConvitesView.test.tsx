// =============================================================================
// ConvitesView (S1608-T2 · RN-413) — a tela que o dono usa para abrir a porta.
//
// O que esta suíte trava:
//   - a tabela mostra código, status, nota, quem usou e validade;
//   - "Revogar" aparece SÓ em código `ativo` (revogar não alcança usado);
//   - gerar dispara com nota e validade opcionais e limpa o formulário;
//   - estados de load/erro/vazio são honestos (nunca linha fabricada).
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ConviteOrganizador } from '@leela/core';
import { ConvitesView } from '../ConvitesView';

const convites: ConviteOrganizador[] = [
  { codigo: 'AB23CD45', status: 'ativo', nota: 'Para o Francisco', criadoPor: 'admin' },
  {
    codigo: 'EF67GH89',
    status: 'usado',
    criadoPor: 'admin',
    usadoPor: 'uid-marina',
    tenantId: 'castelo-producoes',
  },
  { codigo: 'JK23MN45', status: 'revogado', criadoPor: 'admin' },
];

const props = {
  convites,
  loading: false,
  error: null,
  gerando: false,
  onRetry: vi.fn(),
  onGerar: vi.fn(),
  onCopiar: vi.fn(),
  onRevogar: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ConvitesView', () => {
  it('lista os códigos com status e quem usou', () => {
    render(<ConvitesView {...props} />);
    expect(screen.getByText('AB23CD45')).toBeInTheDocument();
    expect(screen.getByText('Para o Francisco')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('Usado')).toBeInTheDocument();
    expect(screen.getByText('Revogado')).toBeInTheDocument();
    expect(screen.getByText('castelo-producoes')).toBeInTheDocument();
  });

  it('código sem validade diz "Sem validade", não vazio', () => {
    render(<ConvitesView {...props} />);
    expect(screen.getAllByText('Sem validade').length).toBe(convites.length);
  });

  it('revogar aparece só no código ativo', async () => {
    render(<ConvitesView {...props} />);
    const linhaAtiva = screen.getByText('AB23CD45').closest('tr');
    const linhaUsada = screen.getByText('EF67GH89').closest('tr');
    expect(within(linhaAtiva as HTMLElement).getByRole('button', { name: 'Revogar' })).toBeInTheDocument();
    expect(
      within(linhaUsada as HTMLElement).queryByRole('button', { name: 'Revogar' }),
    ).not.toBeInTheDocument();

    await userEvent.click(within(linhaAtiva as HTMLElement).getByRole('button', { name: 'Revogar' }));
    expect(props.onRevogar).toHaveBeenCalledWith(convites[0]);
  });

  it('copiar dispara por linha, inclusive em código já usado', async () => {
    render(<ConvitesView {...props} />);
    const linhaUsada = screen.getByText('EF67GH89').closest('tr');
    await userEvent.click(within(linhaUsada as HTMLElement).getByRole('button', { name: 'Copiar' }));
    expect(props.onCopiar).toHaveBeenCalledWith('EF67GH89');
  });

  it('gerar manda nota e validade e limpa o formulário', async () => {
    render(<ConvitesView {...props} />);
    await userEvent.type(screen.getByLabelText('Para quem é (opcional)'), 'Beta 2');
    await userEvent.click(screen.getByRole('button', { name: 'Gerar código' }));
    expect(props.onGerar).toHaveBeenCalledWith({ nota: 'Beta 2', expiraEm: '' });
    expect(screen.getByLabelText('Para quem é (opcional)')).toHaveValue('');
  });

  it('gerar sem nota nem validade é permitido (P2/P3)', async () => {
    render(<ConvitesView {...props} />);
    await userEvent.click(screen.getByRole('button', { name: 'Gerar código' }));
    expect(props.onGerar).toHaveBeenCalledWith({ nota: '', expiraEm: '' });
  });

  it('estado de carregamento e de erro são honestos', () => {
    const { unmount } = render(<ConvitesView {...props} convites={null} loading />);
    expect(screen.getByRole('status', { name: 'Carregando convites de organizador' })).toBeInTheDocument();
    unmount();

    render(<ConvitesView {...props} convites={null} error={new Error('boom')} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível carregar/i);
  });

  it('catálogo vazio mostra EmptyState, não tabela fantasma', () => {
    render(<ConvitesView {...props} convites={[]} />);
    expect(screen.getByText('Nenhum convite gerado ainda')).toBeInTheDocument();
    expect(screen.getByText('0 convites')).toBeInTheDocument();
  });
});
