/**
 * O comportamento completo (13 testes WAI-APG de foco/teclado) foi PORTADO
 * para DropdownMenu/__tests__/DropdownMenu.test.tsx (decisão bd31974). Aqui
 * fica só o contrato do alias: `Popover` continua exportado e é o MESMO
 * componente — consumidores do painel não quebram.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Popover } from '../index';
import { DropdownMenu } from '../../DropdownMenu';

describe('Popover (alias de DropdownMenu)', () => {
  it('Popover é o mesmo componente que DropdownMenu', () => {
    expect(Popover).toBe(DropdownMenu);
  });

  it('renderiza menu com a mesma API do E01 (actions/open/trigger)', () => {
    render(
      <Popover
        actions={[{ id: 'a', label: 'Ver', onClick: () => {} }]}
        open
        onOpenChange={() => {}}
        trigger={<button type="button">Abrir</button>}
      />,
    );
    expect(screen.getByRole('menu', { name: 'Ações' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Ver' })).toBeInTheDocument();
  });
});
