// =============================================================================
// DefinitionItem — o par rótulo + valor em pé.
//
// Cada bloco existe por um fato medido na auditoria de ADMINVISAO-ONDAS-235
// (retomada de 11/08), lido linha a linha nas duas receitas que a peça
// substitui (`ResponsavelCard.tsx`, `FichaDoClienteDrawer.tsx`):
//
//   - A AUSÊNCIA tem TRÊS formas nos dois arquivos — `undefined` e string
//     vazia em `ResponsavelCard`, `null` em `FichaDoClienteDrawer` — e as três
//     precisam cair no mesmo lugar.
//   - O RÓTULO DA AUSÊNCIA é fixo num arquivo ("Não informado") e por campo no
//     outro ("Não coletado. O CPF vem de..."). A peça aceita as duas formas.
//   - DOIS TAMANHOS — resumo (`base`) e ficha densa (`sm`).
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DefinitionItem } from '../DefinitionItem';

describe('DefinitionItem · o par', () => {
  it('mostra o rótulo e o valor', () => {
    render(<DefinitionItem label="Nome" value="Marina Castelo" />);
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Marina Castelo')).toBeInTheDocument();
  });

  it('renderiza como dt/dd, para viver dentro de um dl', () => {
    render(<DefinitionItem label="Nome" value="Marina" data-testid="item" />);
    const item = screen.getByTestId('item');
    expect(item.querySelector('dt')).not.toBeNull();
    expect(item.querySelector('dd')).not.toBeNull();
  });
});

describe('DefinitionItem · a ausência, nas três formas que as telas já usavam', () => {
  it('undefined cai no emptyLabel default', () => {
    render(<DefinitionItem label="Telefone" value={undefined} />);
    expect(screen.getByText('Não informado')).toBeInTheDocument();
  });

  it('null cai no emptyLabel default', () => {
    render(<DefinitionItem label="CPF" value={null} />);
    expect(screen.getByText('Não informado')).toBeInTheDocument();
  });

  it('string vazia (ou só espaço) cai no emptyLabel — mesma régua do ResponsavelCard', () => {
    render(<DefinitionItem label="Organização" value="   " />);
    expect(screen.getByText('Não informado')).toBeInTheDocument();
  });

  it('emptyLabel é prop — cada campo nomeia a própria causa (caso FichaDoClienteDrawer)', () => {
    render(
      <DefinitionItem
        label="CPF"
        value={null}
        emptyLabel="Não coletado. O CPF vem dos dados pessoais da inscrição."
      />,
    );
    expect(
      screen.getByText('Não coletado. O CPF vem dos dados pessoais da inscrição.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Não informado')).toBeNull();
  });

  it('valor zero NÃO é ausência — 0 é dado, não vazio', () => {
    render(<DefinitionItem label="Eventos" value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByText('Não informado')).toBeNull();
  });
});

describe('DefinitionItem · tamanho', () => {
  it('default é base', () => {
    render(<DefinitionItem label="Nome" value="Marina" data-testid="item" />);
    const dd = screen.getByTestId('item').querySelector('dd');
    expect(dd?.className).toContain('text-[length:var(--font-size-base)]');
  });

  it('sm troca o tamanho do valor', () => {
    render(<DefinitionItem label="Nome" value="Marina" size="sm" data-testid="item" />);
    const dd = screen.getByTestId('item').querySelector('dd');
    expect(dd?.className).toContain('text-[length:var(--font-size-sm)]');
  });
});

describe('DefinitionItem · superfície', () => {
  it('aceita className e props nativas no bloco', () => {
    render(
      <DefinitionItem label="Nome" value="Marina" className="teste-item" data-testid="item" />,
    );
    expect(screen.getByTestId('item')).toHaveClass('teste-item');
  });

  it('a cor do valor muda entre preenchido e ausente', () => {
    const { rerender } = render(
      <DefinitionItem label="Nome" value="Marina" data-testid="item" />,
    );
    const dd1 = screen.getByTestId('item').querySelector('dd');
    expect(dd1?.className).toContain('text-[var(--text-primary)]');

    rerender(<DefinitionItem label="Nome" value={null} data-testid="item" />);
    const dd2 = screen.getByTestId('item').querySelector('dd');
    expect(dd2?.className).toContain('text-[var(--text-tertiary)]');
  });
});
