/**
 * Command — lista filtrável WAI-APG (S-R9-05 · governança §8).
 *
 * Primitivo de LISTA-COM-BUSCA sobre `cmdk` (padrão shadcn `command`): input de
 * filtro + listbox navegável por teclado (↑↓, Enter, digitação filtra), com
 * roles/aria corretos vindos da lib. É a peça que o `Combobox` monta dentro do
 * `Popover` para dar seleção rica com o VISUAL do DS — nunca a caixa do SO.
 *
 * Tokens shadcn→brasa: bg-popover/text-popover-foreground no container, accent
 * (= action-ghost-hover/-fg) no item selecionado/hover, border-border no divisor
 * do input, text-tertiary no placeholder/empty. Focus ring de 2px pelo input.
 */

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { cn } from '../../utils/cn';
import { SCROLL_Y_ONLY } from '../../utils/scroll';

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'flex h-full w-full flex-col overflow-hidden',
      'rounded-md bg-popover text-popover-foreground',
      className,
    )}
    {...props}
  />
));
Command.displayName = 'Command';

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div
    className="flex items-center gap-[var(--spacing-2)] border-b border-border px-[var(--spacing-3)]"
    cmdk-input-wrapper=""
  >
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'flex h-[var(--input-height)] w-full bg-transparent',
        'text-[length:var(--input-font-size)] text-[var(--text-primary)]',
        'placeholder:text-[var(--text-tertiary)]',
        'outline-none focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = 'CommandInput';

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    // A lista já declarava os dois eixos — era a única peça do DS que fazia certo
    // antes do padrão existir. Agora vem da constante, e DEPOIS do `className`:
    // `cn` é `twMerge` e resolve pelo último, então na ordem antiga um consumidor
    // apagava o eixo em silêncio. Regra em utils/scroll.ts.
    className={cn(
      'max-h-[var(--command-list-max-height)] p-[var(--spacing-1)]',
      className,
      SCROLL_Y_ONLY,
    )}
    {...props}
  />
));
CommandList.displayName = 'CommandList';

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className={cn(
      'py-[var(--spacing-6)] text-center text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]',
      className,
    )}
    {...props}
  />
));
CommandEmpty.displayName = 'CommandEmpty';

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      'overflow-hidden text-[var(--text-primary)]',
      '[&_[cmdk-group-heading]]:px-[var(--spacing-2)] [&_[cmdk-group-heading]]:py-[var(--spacing-1-5)]',
      '[&_[cmdk-group-heading]]:text-[length:var(--font-size-xs)] [&_[cmdk-group-heading]]:font-[var(--font-weight-semibold)]',
      '[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-[var(--text-tertiary)]',
      className,
    )}
    {...props}
  />
));
CommandGroup.displayName = 'CommandGroup';

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-[var(--spacing-2)]',
      'rounded-sm h-[var(--btn-height-sm)] px-[var(--spacing-3)]',
      'text-[length:var(--font-size-base)] text-[var(--text-primary)]',
      'outline-none',
      'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
      'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40',
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = 'CommandItem';

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
};
