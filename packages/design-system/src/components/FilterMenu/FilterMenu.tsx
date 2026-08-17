/**
 * FilterMenu — filtro de faceta multi-seleção (checkbox em lista) num dropdown.
 *
 * PADRÃO (decisão do dono, 2026-08-17, leva 20): filtro de listagem é LISTA,
 * qualquer que seja o número de valores, e fica ao lado do campo de pesquisa,
 * numa fileira só. O limiar Polaris de quatro valores (<4 → fileira de chips)
 * governou esta peça até 16/08 e foi SUPERADO — ver o cabeçalho de
 * `FilterChips`, que registra a fala e o motivo medido (a fileira esconde o
 * NOME da faceta; o gatilho daqui o mostra: `Status: Todos`).
 *
 * REUSO-first: compõe o DropdownMenu (motor WAI-APG de portal/teclado/foco/
 * click-fora) com itens `menuitemcheckbox` (não fecham ao marcar) — NÃO é um
 * dropdown novo. O indicador de marcado reusa a linguagem visual do Checkbox
 * do DS. Vazio = sem filtro ("Todos"); o gatilho resume a seleção
 * ("Status: 2" | "Status: Todos") e cada opção mostra a contagem à direita.
 *
 * Semântica: multi-seleção. Marcar uma opção não afeta as outras (checkbox, não
 * radio) — serve à varredura ("ver Ativos + Encerrados de uma vez"). Para
 * seleção ÚNICA exclusiva, use Combobox (governança §8 — o Select nativo ficou
 * restrito a formulário simples de baixa cardinalidade). Quem escolhe entre os
 * dois é a `FilterChips`, pelo `multiple`; a tela não decide forma.
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
  /**
   * Faceta desligada em bloco (ADR-020: status desabilitado enquanto o recorte
   * por tenant está ativo). Desabilita o GATILHO — sem gatilho não há menu —, o
   * que mantém o estado num lugar só em vez de espalhar guarda por handler.
   */
  disabled?: boolean;
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
  disabled = false,
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
      open={disabled ? false : open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
      }}
      actions={actions}
      align={align}
      menuLabel={label}
      {...(className !== undefined ? { className } : {})}
      trigger={
        // GATE-DS-W1 (diretriz flat do Vitor, 2026-07-18): o gatilho de filtro é um
        // CAMPO flat (fill sunken, sem linha de borda — anatomia do Combobox/Input),
        // não um botão outline. ghost tira a borda do secondary; o fill sunken +
        // texto + chevron identificam o controle; foco segue pelo ring do Button.
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="bg-[var(--surface-sunken)] text-[var(--text-primary)]"
        >
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
