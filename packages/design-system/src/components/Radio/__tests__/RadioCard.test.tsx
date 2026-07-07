import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioCard, RadioGroup } from '../Radio';
import { Badge } from '../../Badge';

function Grupo(props: { value?: string; onValueChange?: (v: string) => void; disabled?: boolean }) {
  return (
    <RadioGroup name="modelo" label="Modelo" {...props}>
      <RadioCard value="A" title="Meta por ação" description="Cada ação tem sua meta." />
      <RadioCard
        value="C"
        title="Equilíbrio mínimo"
        description="Meta total + mínimo por pilar."
        aria-label="Modelo C · Equilíbrio mínimo"
      >
        <span>Sub-seletor revelado</span>
      </RadioCard>
    </RadioGroup>
  );
}

describe('RadioCard', () => {
  it('renders rich radio-cards inside the group (native radio semantics)', () => {
    render(<Grupo value="A" />);
    expect(screen.getByRole('group', { name: 'Modelo' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'Meta por ação' })).toBeChecked();
  });

  it('honours aria-label as the accessible name (description stays out of the name)', () => {
    render(<Grupo value="A" />);
    expect(screen.getByRole('radio', { name: 'Modelo C · Equilíbrio mínimo' })).toBeInTheDocument();
  });

  it('links the description via aria-describedby', () => {
    render(<Grupo value="A" />);
    const radio = screen.getByRole('radio', { name: 'Meta por ação' });
    const describedBy = radio.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent('Cada ação tem sua meta.');
  });

  it('fires onValueChange with the chosen value', async () => {
    const onValueChange = vi.fn();
    render(<Grupo value="A" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Modelo C · Equilíbrio mínimo' }));
    expect(onValueChange).toHaveBeenCalledWith('C');
  });

  it('reveals children only when the card is selected', () => {
    const { rerender } = render(<Grupo value="A" />);
    expect(screen.queryByText('Sub-seletor revelado')).not.toBeInTheDocument();
    rerender(<Grupo value="C" />);
    expect(screen.getByText('Sub-seletor revelado')).toBeInTheDocument();
  });

  it('moves selection with arrow keys (native radio semantics)', async () => {
    const onValueChange = vi.fn();
    render(<Grupo value="A" onValueChange={onValueChange} />);
    screen.getByRole('radio', { name: 'Meta por ação' }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(onValueChange).toHaveBeenCalledWith('C');
  });

  it('disables every card when the group is disabled', () => {
    render(<Grupo value="A" disabled />);
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
  });

  it('throws if used outside a RadioGroup', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<RadioCard value="x" title="X" />)).toThrow(/RadioGroup/);
    spy.mockRestore();
  });

  // Fix #1 — o selo NÃO polui o nome acessível (era "título + selo"). Sem aria-label,
  // o nome vem só do título porque o badge é aria-hidden.
  it('keeps the badge out of the accessible name (badge is decorative)', () => {
    render(
      <RadioGroup name="modelo" label="Modelo" value="A">
        <RadioCard value="A" title="Meta por ação" badge={<Badge>Mais simples</Badge>} />
      </RadioGroup>,
    );
    // Nome = só o título; a query falharia se o texto do selo entrasse no nome.
    expect(screen.getByRole('radio', { name: 'Meta por ação' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Mais simples/ })).not.toBeInTheDocument();
  });

  // Fix #3 — reveal associado ao controle: aria-expanded reflete o estado revelado.
  it('exposes aria-expanded on the input when it has revealable children', () => {
    const { rerender } = render(
      <RadioGroup name="modelo" label="Modelo" value="A">
        <RadioCard value="A" title="Sem reveal" />
        <RadioCard value="C" title="Com reveal">
          <span>Sub-seletor revelado</span>
        </RadioCard>
      </RadioGroup>,
    );
    const semReveal = screen.getByRole('radio', { name: 'Sem reveal' });
    const comReveal = screen.getByRole('radio', { name: 'Com reveal' });
    // Sem children: nenhum aria-expanded (não é um disclosure).
    expect(semReveal).not.toHaveAttribute('aria-expanded');
    // Com children mas não marcado: collapsed.
    expect(comReveal).toHaveAttribute('aria-expanded', 'false');
    // Marcado: expanded + aria-controls apontando o painel renderizado.
    rerender(
      <RadioGroup name="modelo" label="Modelo" value="C">
        <RadioCard value="A" title="Sem reveal" />
        <RadioCard value="C" title="Com reveal">
          <span>Sub-seletor revelado</span>
        </RadioCard>
      </RadioGroup>,
    );
    const comRevealOn = screen.getByRole('radio', { name: 'Com reveal' });
    expect(comRevealOn).toHaveAttribute('aria-expanded', 'true');
    const controls = comRevealOn.getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls!)).toHaveTextContent('Sub-seletor revelado');
  });

  // Fix #4 — o anel de foco é restrito ao input nativo do radio, não a qualquer
  // controle interno (era focus-within genérico, que acendia p/ o botão do reveal).
  it('scopes the focus ring to the radio input, not focus-within', () => {
    render(
      <RadioGroup name="modelo" label="Modelo" value="C">
        <RadioCard value="C" title="Com reveal">
          <button type="button">Ação interna</button>
        </RadioCard>
      </RadioGroup>,
    );
    const card = screen.getByRole('radio', { name: 'Com reveal' }).closest('div')!;
    // Não usa mais o gatilho genérico que acenderia p/ o botão do reveal.
    expect(card.className).not.toMatch(/focus-within:ring/);
    // Usa o anel condicionado ao foco do input do radio.
    expect(card.className).toMatch(/has-\[\.radiocard-native:focus-visible\]:ring-2/);
  });

  // Fix #5 — grupo inválido dá sinal visual: borda de perigo tokenizada no card.
  it('applies the tokenized danger border when the group is invalid', () => {
    render(
      <RadioGroup name="modelo" label="Modelo" value="A" errorMessage="Escolha um modelo válido.">
        <RadioCard value="A" title="Meta por ação" />
      </RadioGroup>,
    );
    const card = screen.getByRole('radio', { name: 'Meta por ação' }).closest('div')!;
    expect(card.className).toContain('border-[var(--border-danger)]');
  });

  // Fix #6 — o aria-describedby do consumidor é preservado (merge), não sobrescrito
  // pela descrição interna.
  it('merges a consumer-provided aria-describedby with the internal description', () => {
    render(
      <div>
        <span id="ext-hint">Dica externa</span>
        <RadioGroup name="modelo" label="Modelo" value="A">
          <RadioCard
            value="A"
            title="Meta por ação"
            description="Cada ação tem sua meta."
            aria-describedby="ext-hint"
          />
        </RadioGroup>
      </div>,
    );
    const describedBy = screen.getByRole('radio', { name: 'Meta por ação' }).getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const ids = describedBy!.split(' ');
    expect(ids).toContain('ext-hint');
    // e o id interno da descrição também está presente (merge, não override).
    expect(ids.length).toBeGreaterThan(1);
    expect(document.getElementById(ids[ids.length - 1]!)).toHaveTextContent('Cada ação tem sua meta.');
  });
});
