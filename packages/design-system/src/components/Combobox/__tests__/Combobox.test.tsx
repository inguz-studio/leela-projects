/**
 * Combobox (S-R9-05) — seleção rica filtrável, single e multi. Cobre o contrato
 * do DS: abre um painel do DS (não a caixa do SO), filtra por digitação, navega
 * e seleciona por teclado (a11y — DoD do lote), e resume a seleção no trigger.
 */

import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox } from '../index';
import type { ComboboxOption } from '../index';

const OPCOES: ComboboxOption[] = [
  { value: 'corrida-inverno', label: 'Corrida de Inverno' },
  { value: 'desafio-mtb', label: 'Desafio MTB' },
  { value: 'meia-floripa', label: 'Meia de Floripa' },
];

function Single() {
  const [v, setV] = React.useState<string>('');
  return (
    <Combobox
      options={OPCOES}
      value={v}
      onValueChange={(next) => setV(next as string)}
      aria-label="Evento"
      placeholder="Todos os eventos"
    />
  );
}

function Multi() {
  const [v, setV] = React.useState<string[]>([]);
  return (
    <Combobox
      options={OPCOES}
      value={v}
      onValueChange={(next) => setV(next as string[])}
      multiple
      aria-label="Eventos"
      placeholder="Filtrar eventos"
    />
  );
}

describe('Combobox', () => {
  it('painel fechado por padrão; trigger mostra o placeholder', () => {
    render(<Single />);
    expect(screen.getByRole('button', { name: 'Evento' })).toHaveTextContent(
      'Todos os eventos',
    );
    expect(screen.queryByPlaceholderText('Buscar…')).not.toBeInTheDocument();
  });

  it('abre o painel do DS ao clicar (não a caixa do SO)', async () => {
    render(<Single />);
    await userEvent.click(screen.getByRole('button', { name: 'Evento' }));
    expect(await screen.findByPlaceholderText('Buscar…')).toBeInTheDocument();
    expect(screen.getByText('Desafio MTB')).toBeInTheDocument();
  });

  it('filtra por digitação', async () => {
    render(<Single />);
    await userEvent.click(screen.getByRole('button', { name: 'Evento' }));
    await userEvent.type(await screen.findByPlaceholderText('Buscar…'), 'mtb');
    expect(screen.getByText('Desafio MTB')).toBeInTheDocument();
    expect(screen.queryByText('Meia de Floripa')).not.toBeInTheDocument();
  });

  it('seleção single por teclado (↓ Enter) fecha e resume no trigger', async () => {
    render(<Single />);
    const trigger = screen.getByRole('button', { name: 'Evento' });
    await userEvent.click(trigger);
    await screen.findByPlaceholderText('Buscar…');
    // cmdk auto-realça o 1º item; ↓ move para o 2º (Desafio MTB) e Enter seleciona.
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(trigger).toHaveTextContent('Desafio MTB');
    expect(screen.queryByPlaceholderText('Buscar…')).not.toBeInTheDocument();
  });

  it('multi marca vários e mantém o painel aberto; resume a contagem', async () => {
    render(<Multi />);
    const trigger = screen.getByRole('button', { name: 'Eventos' });
    await userEvent.click(trigger);
    const list = await screen.findByPlaceholderText('Buscar…');
    expect(list).toBeInTheDocument();
    await userEvent.click(screen.getByText('Corrida de Inverno'));
    // painel segue aberto para marcar o próximo
    expect(screen.getByPlaceholderText('Buscar…')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Desafio MTB'));
    expect(trigger).toHaveTextContent('2 selecionados');
  });
});
