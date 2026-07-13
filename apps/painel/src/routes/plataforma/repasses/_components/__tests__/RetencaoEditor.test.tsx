import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RetencaoEditor, type RetencaoEditorProps } from '../RetencaoEditor';
import type { RetencaoTenant } from '../../_data/repassesAdmin';

const tenants = [
  { id: 'castelo-producoes', nome: 'Castelo Produções' },
  { id: 'alfa-runs', nome: 'Alfa Runs' },
];

const retencaoBase: RetencaoTenant = { value: 15, usandoDefault: false, loading: false, error: null };

function setup(overrides: Partial<RetencaoEditorProps> = {}) {
  const onSave = vi.fn();
  const onSelectTenant = vi.fn();
  render(
    <RetencaoEditor
      tenants={tenants}
      tenantsLoading={false}
      selectedTenantId="castelo-producoes"
      onSelectTenant={onSelectTenant}
      retencao={retencaoBase}
      saving={false}
      saveError={null}
      onSave={onSave}
      {...overrides}
    />,
  );
  return { onSave, onSelectTenant };
}

describe('RetencaoEditor', () => {
  it('mostra o valor vigente carregado', () => {
    setup();
    expect((screen.getByLabelText('Retenção (%)') as HTMLInputElement).value).toBe('15');
  });

  it('sinaliza quando o tenant usa o default global', () => {
    setup({ retencao: { value: 15, usandoDefault: true, loading: false, error: null } });
    expect(screen.getByText('default global')).toBeInTheDocument();
  });

  it('salva o valor válido chamando onSave com tenant + pct', async () => {
    const { onSave } = setup();
    const input = screen.getByLabelText('Retenção (%)');
    await userEvent.clear(input);
    await userEvent.type(input, '20');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar retenção' }));
    expect(onSave).toHaveBeenCalledWith('castelo-producoes', 20);
  });

  it('bloqueia valor fora de 0..100 com erro inline e sem submit', async () => {
    const { onSave } = setup();
    const input = screen.getByLabelText('Retenção (%)');
    await userEvent.clear(input);
    await userEvent.type(input, '150');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar retenção' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/entre 0 e 100/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('troca de tenant dispara onSelectTenant', async () => {
    const { onSelectTenant } = setup();
    await userEvent.selectOptions(screen.getByLabelText('Tenant'), 'alfa-runs');
    expect(onSelectTenant).toHaveBeenCalledWith('alfa-runs');
  });
});
