/**
 * Combobox — seleção rica filtrável, single ou multi (S-R9-05 · governança §8).
 *
 * Monta o painel DO DS: um trigger com a anatomia do Select flat (fill sunken +
 * borda --input-border-flat, h-input, chevron) que abre um `Popover` com um
 * `Command` (busca + listbox WAI-APG por teclado). É o substituto do `<select>`
 * nativo para FILTROS e seleções ricas — a "caixa do sistema operacional" que o
 * Vitor apontou deixa de aparecer. `<select>` simples de baixa cardinalidade
 * pode ficar (governança §8).
 *
 * - `multiple=false` (default): seleciona um valor e fecha; mostra o label.
 * - `multiple=true`: alterna valores e mantém aberto; o trigger resume "N
 *   selecionados" e cada item marca com check.
 *
 * A11y: trigger role=combobox + aria-expanded (Popover.Trigger); listbox/foco/
 * teclado do cmdk; focus ring de 2px pelo input e pelo trigger.
 */

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Popover, PopoverTrigger, PopoverContent } from '../Popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from '../Command';

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  /** Valor selecionado. `string` quando single; `string[]` quando multiple. */
  value?: string | string[];
  /** Callback de mudança. Recebe `string` (single) ou `string[]` (multiple). */
  onValueChange: (value: string | string[]) => void;
  multiple?: boolean;
  /** Texto do trigger quando nada está selecionado. */
  placeholder?: string;
  /** Placeholder do campo de busca. */
  searchPlaceholder?: string;
  /** Texto quando a busca não acha nada. */
  emptyText?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  /** Classe extra do trigger. */
  className?: string;
}

function normalize(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : value.length > 0 ? [value] : [];
}

export function Combobox({
  options,
  value,
  onValueChange,
  multiple = false,
  placeholder = 'Selecione…',
  searchPlaceholder = 'Buscar…',
  emptyText = 'Nada encontrado.',
  disabled = false,
  id,
  'aria-label': ariaLabel,
  className,
}: ComboboxProps): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const selected = normalize(value);

  const triggerLabel = React.useMemo(() => {
    if (selected.length === 0) return placeholder;
    if (multiple) {
      if (selected.length === 1) {
        return options.find((o) => o.value === selected[0])?.label ?? placeholder;
      }
      return `${selected.length} selecionados`;
    }
    return options.find((o) => o.value === selected[0])?.label ?? placeholder;
  }, [selected, options, multiple, placeholder]);

  function handleSelect(optionValue: string): void {
    if (multiple) {
      const next = selected.includes(optionValue)
        ? selected.filter((v) => v !== optionValue)
        : [...selected, optionValue];
      onValueChange(next);
      // multi mantém aberto para marcar vários
    } else {
      onValueChange(optionValue);
      setOpen(false);
    }
  }

  const hasSelection = selected.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          'flex w-full items-center justify-between gap-[var(--spacing-2)]',
          'h-[var(--input-height)] px-[var(--input-px)] rounded-[var(--input-radius)]',
          'text-[length:var(--input-font-size)] text-left',
          'bg-[var(--surface-sunken)]',
          'border-[length:var(--input-border-width)] border-[color:var(--input-border-flat)]',
          hasSelection ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'transition-[border-color,box-shadow] duration-[var(--motion-duration-fast)]',
          className,
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronsUpDown aria-hidden className="h-[var(--spacing-4)] w-[var(--spacing-4)] shrink-0 text-[var(--text-tertiary)]" />
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[var(--popover-min-width)]" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {options.map((option) => {
              const isChecked = selected.includes(option.value);
              return (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                  {...(option.disabled ? { disabled: true } : {})}
                >
                  <Check
                    aria-hidden
                    className={cn(
                      'h-[var(--spacing-4)] w-[var(--spacing-4)] shrink-0',
                      isChecked ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="flex-1 truncate">{option.label}</span>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

Combobox.displayName = 'Combobox';
