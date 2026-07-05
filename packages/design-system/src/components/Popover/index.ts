/**
 * Popover → DropdownMenu (Lote A restante, decisão bd31974).
 *
 * O componente migrou para o vocabulário shadcn como DropdownMenu (visual
 * shadcn, comportamento WAI-APG do E01 intacto). Estes aliases mantêm a API
 * pública ESTÁVEL: todos os consumidores do painel seguem importando
 * `Popover` / `PopoverProps` / `PopoverAction` sem alteração.
 *
 * @deprecated Prefira `DropdownMenu` em código novo.
 */

export { DropdownMenu as Popover } from '../DropdownMenu';
export type {
  DropdownMenuProps as PopoverProps,
  DropdownMenuAction as PopoverAction,
} from '../DropdownMenu';
