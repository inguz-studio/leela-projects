import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Radio, RadioGroup } from '../Radio';

function Grupo(props: { value?: string; onValueChange?: (v: string) => void; disabled?: boolean }) {
  return (
    <RadioGroup name="origem" label="Origem" {...props}>
      <Radio value="organizador" label="Organizador" />
      <Radio value="patrocinador" label="Patrocinador" />
    </RadioGroup>
  );
}

describe('RadioGroup / Radio', () => {
  it('renders a fieldset labelled by its legend with the radios', () => {
    render(<Grupo value="organizador" />);
    expect(screen.getByRole('group', { name: 'Origem' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('reflects the selected value', () => {
    render(<Grupo value="organizador" />);
    expect(screen.getByRole('radio', { name: 'Organizador' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Patrocinador' })).not.toBeChecked();
  });

  it('fires onValueChange with the chosen value', async () => {
    const onValueChange = vi.fn();
    render(<Grupo value="organizador" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Patrocinador' }));
    expect(onValueChange).toHaveBeenCalledWith('patrocinador');
  });

  it('moves selection with arrow keys (native radio semantics)', async () => {
    const onValueChange = vi.fn();
    render(<Grupo value="organizador" onValueChange={onValueChange} />);
    screen.getByRole('radio', { name: 'Organizador' }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(onValueChange).toHaveBeenCalledWith('patrocinador');
  });

  it('disables every radio when the group is disabled', () => {
    render(<Grupo value="organizador" disabled />);
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
  });

  it('marks radios aria-invalid and shows the group error', () => {
    render(
      <RadioGroup name="origem" label="Origem" value="" errorMessage="Escolha uma origem">
        <Radio value="organizador" label="Organizador" />
      </RadioGroup>,
    );
    expect(screen.getByRole('radio', { name: 'Organizador' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha uma origem');
  });

  it('wires the group description via aria-describedby without a consumer id', () => {
    render(
      <RadioGroup name="origem" label="Origem" description="Escolha quem criou o item">
        <Radio value="organizador" label="Organizador" />
      </RadioGroup>,
    );
    const group = screen.getByRole('group', { name: 'Origem' });
    const describedBy = group.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent('Escolha quem criou o item');
  });

  it('keeps the group value in control even if a consumer forces checked', () => {
    render(
      <RadioGroup name="origem" label="Origem" value="organizador">
        <Radio value="organizador" label="Organizador" />
        {/* @ts-expect-error checked pertence ao grupo, não ao consumidor (Omit). */}
        <Radio value="patrocinador" label="Patrocinador" checked />
      </RadioGroup>,
    );
    // O value do grupo manda: o forced checked não desacopla a opção.
    expect(screen.getByRole('radio', { name: 'Organizador' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Patrocinador' })).not.toBeChecked();
  });

  it('throws if a Radio is used outside a RadioGroup', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Radio value="x" label="X" />)).toThrow(/RadioGroup/);
    spy.mockRestore();
  });
});

// =============================================================================
// S1218-T1 · B3 — o rótulo do grupo não nasce colado no primeiro cartão
//
// Diagnóstico medido antes do conserto: o espaço NÃO nascia na tela do
// checkout. O `<fieldset>` do RadioGroup é `flex flex-col` com `gap`, e a
// `<legend>` é a "rendered legend" do HTML — o navegador a tira do formatting
// context para desenhá-la sobre a borda, então o `gap` nunca a alcança. Era
// um defeito do design system, valendo para todo RadioGroup do produto, e é
// por isso que o conserto mora AQUI e não em `StepModalidadeKit`.
//
// jsdom não faz layout: o que se pode asserir é o mecanismo (a legend carrega
// a margem, e a margem usa o MESMO token do gap do grupo). A prova visual é do
// olho do dono, e está apontada no handoff.
// =============================================================================
describe('RadioGroup — separação entre o rótulo e as opções (S1218-T1 · B3)', () => {
  it('a legend carrega margem inferior no mesmo token do gap do grupo', () => {
    const { container } = render(<Grupo value="organizador" />);
    const legend = container.querySelector('legend');
    expect(legend).not.toBeNull();
    expect(legend?.className).toContain('mb-[var(--spacing-2)]');

    // O gap do fieldset é o ritmo do grupo — a margem tem de ser o MESMO
    // número, senão o rótulo passa a destoar das opções entre si.
    const fieldset = container.querySelector('fieldset');
    expect(fieldset?.className).toContain('gap-[var(--spacing-2)]');
  });

  it('sem rótulo não há legend — e nada de margem órfã', () => {
    const { container } = render(
      <RadioGroup name="origem" aria-label="Origem">
        <Radio value="organizador" label="Organizador" />
      </RadioGroup>,
    );
    expect(container.querySelector('legend')).toBeNull();
  });
});
