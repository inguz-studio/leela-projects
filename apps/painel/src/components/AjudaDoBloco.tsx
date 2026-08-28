// =============================================================================
// AjudaDoBloco — o ícone "?" com Popover para o slot `help` do SectionHeader.
//
// Nasceu da consolidação de SecaoHead → SectionHeader do DS (lane
// REUSO-E-SHOWROOM, 28/08). O padrão estava embutido no SecaoHead local;
// agora que o DS exporta SectionHeader com slot `help` livre, o padrão de
// ajuda fica aqui, testável de forma isolada e reutilizável em qualquer bloco
// do painel que precise de um "?" de contexto.
//
// Regra estrutural preservada (REFACTOR item 8): o conteúdo abre em PORTAL,
// fora da árvore do card. Ancestral com `transform` vira bloco de contenção
// — o hover que sobe o card um tiquinho, por exemplo — e qualquer `fixed`
// se ancora no card, com o popover indo parar atrás do vizinho. Em portal,
// isso não pode acontecer. A família tipográfica é declarada (não herdada)
// porque fora da árvore do painel não há de quem herdar.
// =============================================================================

import type { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@leela/design-system';

export interface AjudaDoBlocoProps {
  /** O nome do bloco — entra no `aria-label` do botão para diferenciar seis "?" na mesma tela. */
  titulo: string;
  /** O conteúdo da explicação. */
  texto: ReactNode;
}

export function AjudaDoBloco({ titulo, texto }: AjudaDoBlocoProps): JSX.Element {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton aria-label={`O que "${titulo}" mostra`}>
          <HelpCircle aria-hidden />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'max-w-xs px-[var(--spacing-3)] py-[var(--spacing-2)]',
          // Fonte DECLARADA, não herdada (REFACTOR item 8): fora da árvore do
          // painel, o conteúdo em portal deixa de herdar a família e cai na
          // fonte do sistema operacional.
          'font-[family-name:var(--font-family-ui)]',
          'text-[length:var(--font-size-sm)] text-[var(--text-secondary)]',
        )}
      >
        {texto}
      </PopoverContent>
    </Popover>
  );
}

AjudaDoBloco.displayName = 'AjudaDoBloco';
