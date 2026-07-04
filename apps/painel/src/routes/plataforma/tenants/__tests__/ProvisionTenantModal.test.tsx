import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProvisionTenantModal } from '../ProvisionTenantModal';

const baseProps = {
  open: true,
  onOpenChange: () => {},
  running: false,
  onProvision: () => {},
};

describe('ProvisionTenantModal', () => {
  it('renderiza os campos quando aberto', () => {
    render(<ProvisionTenantModal {...baseProps} />);
    expect(screen.getByLabelText('Nome do tenant')).toBeInTheDocument();
    expect(screen.getByLabelText(/Slug/)).toBeInTheDocument();
    expect(screen.getByLabelText(/E-mail do responsável/)).toBeInTheDocument();
  });

  it('submit inválido → erros inline e não chama onProvision', async () => {
    const onProvision = vi.fn();
    render(<ProvisionTenantModal {...baseProps} onProvision={onProvision} />);
    await userEvent.click(screen.getByRole('button', { name: 'Provisionar' }));
    expect(onProvision).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('sugere slug a partir do nome e provisiona com input válido', async () => {
    const onProvision = vi.fn();
    render(<ProvisionTenantModal {...baseProps} onProvision={onProvision} />);

    await userEvent.type(screen.getByLabelText('Nome do tenant'), 'Castelo Produções');
    await userEvent.type(screen.getByLabelText(/E-mail do responsável/), 'dono@exemplo.com');

    // slug auto-derivado
    expect(screen.getByLabelText(/Slug/)).toHaveValue('castelo-producoes');

    await userEvent.click(screen.getByRole('button', { name: 'Provisionar' }));
    expect(onProvision).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Castelo Produções',
        slug: 'castelo-producoes',
        tipo: 'produtor',
        ownerEmail: 'dono@exemplo.com',
      }),
    );
  });

  it('errorMessage (failed-precondition) aparece como alerta', () => {
    render(<ProvisionTenantModal {...baseProps} errorMessage="E-mail com papel conflitante." />);
    expect(screen.getByText('E-mail com papel conflitante.')).toBeInTheDocument();
  });
});
