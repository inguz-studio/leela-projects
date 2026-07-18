/**
 * Popover — primitivo de âncora (S-R9-05). Cobre o contrato do wrapper: o
 * trigger controla a visibilidade do painel do DS; abre por click e fecha por
 * Esc (dismiss a11y do Radix). O posicionamento/portal é responsabilidade da
 * lib, não re-testado aqui.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '../index';

function renderPopover() {
  return render(
    <Popover>
      <PopoverTrigger>Abrir</PopoverTrigger>
      <PopoverContent>
        <span>Conteúdo do painel</span>
      </PopoverContent>
    </Popover>,
  );
}

describe('Popover (primitivo de âncora)', () => {
  it('painel fechado por padrão', () => {
    renderPopover();
    expect(screen.queryByText('Conteúdo do painel')).not.toBeInTheDocument();
  });

  it('abre ao clicar no trigger', async () => {
    renderPopover();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(await screen.findByText('Conteúdo do painel')).toBeInTheDocument();
  });

  it('trigger expõe aria-expanded', async () => {
    renderPopover();
    const trigger = screen.getByRole('button', { name: 'Abrir' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('fecha com Esc', async () => {
    renderPopover();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(await screen.findByText('Conteúdo do painel')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Conteúdo do painel')).not.toBeInTheDocument();
  });
});
