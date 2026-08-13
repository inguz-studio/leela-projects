// =============================================================================
// FieldGroup — o grupo de campos.
//
// O que este arquivo trava:
//
//   - o AGRUPAMENTO acessível. `fieldset` + `legend` visível é o que faz o
//     leitor de tela anunciar "Notificações, grupo" antes de cada controle.
//   - os TRÊS DEFAULTS do navegador. `min-inline-size`, `padding-inline` da
//     legenda e a borda própria do fieldset. Eles não aparecem em teste de
//     comportamento nenhum, então a prova é da classe — jsdom não faz layout.
//   - a COMPOSIÇÃO com o `Stack`: o ritmo interno é o do primitivo, com a
//     escala fechada que ele publica, e não um `gap` inventado aqui.
// =============================================================================

import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { FieldGroup } from '../FieldGroup';
import { CheckboxField } from '../../CheckboxField';
import { Stack } from '../../Stack';

function Grupo(props: Partial<React.ComponentProps<typeof FieldGroup>>) {
  return (
    <FieldGroup legend="Notificações" {...props}>
      <CheckboxField label="Avisar quando alguém se inscrever" />
      <CheckboxField label="Resumo semanal" />
    </FieldGroup>
  );
}

describe('FieldGroup · agrupamento acessível', () => {
  it('é um grupo nomeado pela legenda', () => {
    render(<Grupo />);
    expect(screen.getByRole('group', { name: 'Notificações' })).toBeInTheDocument();
  });

  it('a legenda é VISÍVEL — nada de sr-only com um span ao lado', () => {
    render(<Grupo />);
    const legenda = screen.getByText('Notificações');
    expect(legenda.tagName).toBe('LEGEND');
    expect(legenda.className).not.toContain('sr-only');
  });

  it('hospeda os controles dentro do próprio grupo', () => {
    render(<Grupo />);
    const grupo = screen.getByRole('group');
    expect(within(grupo).getAllByRole('checkbox')).toHaveLength(2);
  });

  it('a descrição do grupo entra por aria-describedby', () => {
    render(<Grupo description="Valem para este evento." />);
    const grupo = screen.getByRole('group');
    const id = grupo.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).toHaveTextContent('Valem para este evento.');
  });

  it('o erro é do GRUPO e é anunciado por role=alert', () => {
    render(<Grupo errorMessage="Escolha ao menos uma." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha ao menos uma.');
    const ids = screen.getByRole('group').getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(ids).toHaveLength(1);
  });

  it('dica e erro juntos entram os dois no describedby', () => {
    render(<Grupo description="Uma dica." errorMessage="Um erro." />);
    const ids = screen.getByRole('group').getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(ids).toHaveLength(2);
    for (const id of ids) expect(document.getElementById(id)).not.toBeNull();
  });

  it('sem dica e sem erro não sobra describedby vazio', () => {
    render(<Grupo />);
    expect(screen.getByRole('group')).not.toHaveAttribute('aria-describedby');
  });

  // `disabled` no fieldset é nativo e propaga: a peça não reimplementa, e o
  // teste existe para que ninguém "conserte" isso passando prop a prop.
  it('disabled no grupo desabilita todos os controles de dentro, nativamente', () => {
    render(<Grupo disabled />);
    for (const controle of screen.getAllByRole('checkbox')) {
      expect(controle).toBeDisabled();
    }
    expect(screen.getByText('Notificações').className).toContain('text-[var(--text-tertiary)]');
  });
});

describe('FieldGroup · os defaults do navegador', () => {
  it('mata o min-inline-size do fieldset — o grupo encolhe com a coluna', () => {
    render(<Grupo />);
    expect(screen.getByRole('group').className).toContain('min-w-0');
  });

  it('mata os 2px de padding da legenda', () => {
    render(<Grupo />);
    expect(screen.getByText('Notificações').className).toContain('p-0');
  });

  it('nasce sem borda e sem padding — superfície é Card, não fieldset', () => {
    render(<Grupo />);
    const grupo = screen.getByRole('group');
    expect(grupo.className).toContain('border-0');
    expect(grupo.className).toContain('p-0');
    expect(grupo.className).toContain('m-0');
  });

  it('não declara eixo de rolagem nenhum', () => {
    const { container } = render(<Grupo />);
    expect(container.innerHTML).not.toMatch(/overflow-[xy]-/);
  });
});

describe('FieldGroup · composição (zero motor próprio)', () => {
  // O ritmo interno é o do `Stack`, com a escala fechada que ele publica.
  it('o corpo é o Stack do DS, com a assinatura idêntica no gap default', () => {
    const { unmount, container: a } = render(<Stack gap="md" className="mt-[var(--spacing-2)]" />);
    const assinatura = a.firstElementChild?.className;
    unmount();

    const { container } = render(<Grupo />);
    const corpo = container.querySelector('fieldset > div');
    expect(corpo?.className).toBe(assinatura);
  });

  it('o gap sai da escala fechada do Stack, não de classe própria', () => {
    const { container } = render(<Grupo gap="xs" />);
    const corpo = container.querySelector('fieldset > div');
    expect(corpo?.className).toContain('gap-[var(--spacing-1)]');
  });

  it('aceita className e encaminha o ref ao fieldset', () => {
    const ref = React.createRef<HTMLFieldSetElement>();
    render(
      <FieldGroup legend="Notificações" className="teste-grupo" ref={ref}>
        <CheckboxField label="Avisar" />
      </FieldGroup>,
    );
    expect(screen.getByRole('group')).toHaveClass('teste-grupo');
    expect(ref.current?.tagName).toBe('FIELDSET');
  });
});
