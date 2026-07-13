// =============================================================================
// Testes do ConvidarMembroModal (S304-T3). Aceites de UI: nome vazio bloqueia,
// papéis oferecidos são os permitidos (nunca organizador), convite válido chama
// o handler com o payload correto (e-mail vazio → null).
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import type { PapelConvite } from '@leela/api-client';
import { ConvidarMembroModal } from '../ConvidarMembroModal';

const PERMITIDOS: PapelConvite[] = ['administrador', 'operador', 'financeiro'];

function setup(papeis: PapelConvite[] = PERMITIDOS) {
  const onConvidar = vi.fn().mockResolvedValue(undefined);
  const onOpenChange = vi.fn();
  render(
    <ToastProvider>
      <ConvidarMembroModal
        open
        onOpenChange={onOpenChange}
        papeisPermitidos={papeis}
        onConvidar={onConvidar}
      />
    </ToastProvider>,
  );
  return { onConvidar, onOpenChange };
}

describe('ConvidarMembroModal (S304-T3)', () => {
  it('nome vazio bloqueia o convite', async () => {
    const { onConvidar } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar convite' }));
    expect(await screen.findByText('Informe o nome do membro.')).toBeInTheDocument();
    expect(onConvidar).not.toHaveBeenCalled();
  });

  it('oferece só os papéis permitidos (nunca organizador)', () => {
    setup();
    const select = screen.getByLabelText('Papel');
    const labels = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(labels).toEqual(['Administrador', 'Operador', 'Financeiro']);
    expect(labels).not.toContain('Organizador');
  });

  it('convite válido chama o handler (e-mail vazio → null)', async () => {
    const { onConvidar, onOpenChange } = setup();
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Souza');
    await userEvent.selectOptions(screen.getByLabelText('Papel'), 'operador');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar convite' }));
    await waitFor(() => expect(onConvidar).toHaveBeenCalledTimes(1));
    expect(onConvidar).toHaveBeenCalledWith({ nome: 'Ana Souza', email: null, papel: 'operador' });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
