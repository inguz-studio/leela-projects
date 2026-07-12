/**
 * FilterMenu — filtro de faceta multi-seleção (checkbox em lista) num dropdown.
 *
 * PADRÃO (design-principles §a seleção de controle + §b filtros; direção Vitor
 * 2026-07-11): uma faceta com 4+ valores não cabe como fileira de Chips — o
 * limiar Polaris manda <4 → lista de escolha visível (chips), 4+ → dropdown.
 * Aqui a faceta vira uma lista de checkboxes multi-seleção dentro do dropdown.
 *
 * REUSO-first: compõe o DropdownMenu (motor WAI-APG de portal/teclado/foco/
 * click-fora) com itens `menuitemcheckbox` (não fecham ao marcar) — NÃO é um
 * dropdown novo. O indicador de marcado reusa a linguagem visual do Checkbox
 * do DS. Vazio = sem filtro ("Todos"); o gatilho resume a seleção
 * ("Status: 2" | "Status: Todos") e cada opção mostra a contagem à direita.
 *
 * Semântica: multi-seleção. Marcar uma opção não afeta as outras (checkbox, não
 * radio) — serve à varredura ("ver Ativos + Encerrados de uma vez"). Para
 * seleção ÚNICA exclusiva com 4+ valores, use Select; com <4, use Chips.
 */

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../Button';
import { DropdownMenu, type DropdownMenuAction } from '../DropdownMenu';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterMenuOption {
  id: string;
  label: string;
  /** Contagem exibida à direita da opção (ex.: quantos itens na categoria). */
  count?: number;
}

export interface FilterMenuProps {
  /** Rótulo da faceta (ex.: "Status"). Aparece no gatilho e nomeia o menu. */
  label: string;
  options: FilterMenuOption[];
  /** ids marcados. Vazio = sem filtro (mostra tudo). */
  selected: string[];
  onChange: (next: string[]) => void;
  /** Texto do estado sem seleção. Default: "Todos". */
  allLabel?: string;
  align?: 'left' | 'right';
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function FilterMenu({
  label,
  options,
  selected,
  onChange,
  allLabel = 'Todos',
  align = 'left',
  className,
}: FilterMenuProps): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  const toggle = React.useCallback(
    (id: string) => {
      onChange(
        selectedSet.has(id) ? selected.filter((s) => s !== id) : [...selected, id],
      );
    },
    [onChange, selected, selectedSet],
  );

  const actions: DropdownMenuAction[] = options.map((o) => ({
    id: o.id,
    label: o.label,
    checked: selectedSet.has(o.id),
    onClick: () => toggle(o.id),
    ...(o.count !== undefined ? { count: o.count } : {}),
  }));

  const summary = selected.length === 0 ? allLabel : String(selected.length);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}
      actions={actions}
      align={align}
      menuLabel={label}
      {...(className !== undefined ? { className } : {})}
      trigger={
        <Button variant="secondary" size="sm">
          <span>{`${label}: ${summary}`}</span>
          <ChevronDown
            aria-hidden
            className="h-[var(--icon-size)] w-[var(--icon-size)] [stroke-width:var(--icon-stroke)]"
          />
        </Button>
      }
    />
  );
}

FilterMenu.displayName = 'FilterMenu';

export { FilterMenu };
