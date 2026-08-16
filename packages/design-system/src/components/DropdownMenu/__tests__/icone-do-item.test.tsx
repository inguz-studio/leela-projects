/**
 * Ícone do item de menu (Leva 16).
 *
 * O dono, na íntegra: *"neste caso, ao clicar no nome do usuário, na barra
 * demenu devo visualizar 'sair' como opção de logou e configurações. Ambos com
 * pequenos icones."*
 *
 * O que estes testes travam é a metade que é do DS — o item aceita um ícone, e
 * o DS manda no tamanho, no traço e na semântica dele. A metade que é do painel
 * (quais itens o menu do perfil lista) vive em
 * `apps/painel/src/shell/__tests__/RootShell.test.tsx`.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { DropdownMenu } from '../DropdownMenu';
import type { DropdownMenuAction } from '../DropdownMenu';

function IconeFalso(): React.JSX.Element {
  // Um `svg` de mentira, porque o contrato do DS é sobre o SVG FILHO — o
  // seletor `[&>svg]` não sabe (nem precisa saber) que o desenho veio do lucide.
  return <svg data-testid="icone" />;
}

function Menu({ actions }: { actions: DropdownMenuAction[] }): React.JSX.Element {
  const [open, setOpen] = React.useState(true);
  return (
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}
      menuLabel="Menu do perfil"
      trigger={<button type="button">Perfil</button>}
      actions={actions}
    />
  );
}

/**
 * O wrapper que o DS põe em volta do SVG do item.
 *
 * O acesso por índice existe porque a asserção é sobre o PRIMEIRO ícone, e o
 * `noUncheckedIndexedAccess` do `tsconfig.base.json` tipa `[0]` como
 * possivelmente ausente. `getAllByTestId` já lança quando não acha nenhum — a
 * guarda abaixo é para o compilador, não para o teste, e por isso ela falha
 * ruidosamente em vez de silenciar com `!`.
 */
function wrapperDoPrimeiroIcone(): HTMLElement {
  const [primeiro] = screen.getAllByTestId('icone');
  const wrapper = primeiro?.parentElement;
  if (!wrapper) throw new Error('o ícone renderizou sem o wrapper do DS');
  return wrapper;
}

const COM_ICONE: DropdownMenuAction[] = [
  { id: 'configuracoes', label: 'Configurações', icon: <IconeFalso />, onClick: vi.fn() },
  { id: 'sair', label: 'Sair', icon: <IconeFalso />, onClick: vi.fn() },
];

describe('DropdownMenu · ícone do item (Leva 16)', () => {
  it('renderiza o ícone de cada item que traz um', () => {
    render(<Menu actions={COM_ICONE} />);
    expect(screen.getAllByTestId('icone')).toHaveLength(2);
  });

  it('item sem `icon` continua sem nenhum — o campo é opcional e não inventa espaço', () => {
    render(<Menu actions={[{ id: 'a', label: 'Só texto', onClick: vi.fn() }]} />);
    expect(screen.queryByTestId('icone')).toBeNull();
  });

  it('o tamanho e o traço são do DS, por token, e não do consumidor', () => {
    render(<Menu actions={COM_ICONE} />);
    const wrapper = wrapperDoPrimeiroIcone();
    expect(wrapper.className).toContain('[&>svg]:h-[var(--popover-icon-size)]');
    expect(wrapper.className).toContain('[&>svg]:w-[var(--popover-icon-size)]');
    expect(wrapper.className).toContain('[&>svg]:[stroke-width:var(--icon-stroke)]');
    // Nenhum número cru: a régua do ícone é token, como manda a governança.
    expect(wrapper.className).not.toMatch(/h-\[\d+px\]|w-\[\d+px\]/);
  });

  it('o ícone é decorativo — quem nomeia a ação é o rótulo', () => {
    render(<Menu actions={COM_ICONE} />);
    const wrapper = wrapperDoPrimeiroIcone();
    expect(wrapper).toHaveAttribute('aria-hidden');
    // O nome acessível do item não ganhou ruído: continua sendo só o rótulo.
    expect(screen.getByRole('menuitem', { name: 'Configurações' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument();
  });

  it('o ícone não rouba o clique do item', async () => {
    const onClick = vi.fn();
    render(
      <Menu
        actions={[{ id: 'sair', label: 'Sair', icon: <IconeFalso />, onClick }]}
      />,
    );
    await userEvent.click(screen.getByTestId('icone'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
