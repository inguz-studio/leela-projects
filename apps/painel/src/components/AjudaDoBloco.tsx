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
//
// ── FRONTEIRA TÉCNICA (painel-local) ─────────────────────────────────────────
// Revisado pelo maestro em 28/08 (REUSO-E-SHOWROOM). Por que NÃO sobe ao DS:
//
// 1. ADR-017 / server-safe: O SectionHeader foi desenhado explicitamente
//    "sem hook, sem Radix" para entrar na landing/server-side sem custo de
//    bundle. O slot `help` é livre por design — cada produto decide sua
//    implementação. Adicionar AjudaDoBloco ao DS associaria um componente
//    Radix-dependente ao namespace de SectionHeader, quebrando essa garantia.
//
// 2. Convenção de nomes: O DS usa nomes em inglês (Button, Popover, IconButton,
//    SectionHeader). AjudaDoBloco segue a convenção PT-BR do painel; uma
//    migração exigiria renomear para HelpPopover/SectionHelpPopover — outra
//    peça, não a mesma.
//
// 3. Porto de comportamento (não padrão novo): o Popover + HelpCircle +
//    IconButton já existia dentro de SecaoHead.tsx ANTES desta lane. Esta
//    extração é reorganização de código pré-existente, aprovado de fato pelo
//    uso em produção. Nenhum padrão de ajuda novo foi introduzido.
//
// 4. Precedente TerciarioNav: composições interativas de produto residem no
//    painel quando vinculam primitivos do DS com lógica ou convenções
//    específicas do produto.
//
// Cobertura: 4 testes em __tests__/AjudaDoBloco.test.tsx validam portal,
// aria-label, estado inicial fechado e family-name declarada.
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
