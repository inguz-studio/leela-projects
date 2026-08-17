/**
 * RowActions — as ações de UMA linha de tabela, por ÍCONE.
 *
 * Decisão de padrão do dono (17/08), na íntegra: *"E nas ações, de tabelas,
 * quero que ao invés de escritos, utilzemos ícones de ação, que ao clicar,
 * abrimos modais, ou direcionamos para páginas. Como por exemplo 'detalhes'."*
 *
 * ## Por que existe
 *
 * O inventário da lane mediu **40 ações de linha escritas em texto, em 21
 * tabelas de 20 arquivos**, com **25 rótulos distintos para 17 verbos** — três
 * grafias só para "ver" (`Detalhe`, `Detalhes`, `Ver termos`) e duas para abrir
 * (`Abrir`, `Abrir ficha`). Cada tela escolhia o rótulo, a variante do `Button`
 * e a ordem. O `Table` do DS já previa o lugar certo (`renderActions`) e o
 * docblock dele já dizia "DropdownMenu de ações por linha" — o que faltava era
 * a PEÇA, e sem peça cada tabela inventou a sua.
 *
 * ## O vocabulário é FECHADO, e é esse o serviço
 *
 * `verbo` não aceita string livre e o consumidor **não escolhe o ícone**: ele
 * escolhe o VERBO, e o desenho sai daqui. É o que cumpre a regra do dono —
 * mesmo verbo, mesmo ícone, em toda tabela do produto — de um jeito que o
 * compilador cobra, não a revisão. Um `icon` livre na API teria devolvido, no
 * primeiro mês, dois lápis diferentes para "editar".
 *
 * Verbo novo entra como linha em `ICONES_DE_ACAO` + linha no cânone, no mesmo
 * commit — mesma disciplina do token novo (governança §5) e da escala fechada
 * do `Stack`.
 *
 * ## Acessibilidade é ACEITE, não enfeite
 *
 * - `aria-label` obrigatório por construção: vem do `label`, que é obrigatório
 *   na tipagem, e o `IconButton` já exige nome acessível na dele.
 * - **A dica NÃO é o único canal do nome.** O `Tooltip` é reforço visual; quem
 *   usa leitor de tela lê o `aria-label`, e quem navega por teclado alcança
 *   cada botão na ordem do DOM. Isso importa porque a dica só existe no hover e
 *   no foco.
 * - O `Tooltip` canônico só serve aqui porque ele passou a ser PORTALIZADO
 *   (T1 desta mesma lane). Sem portal a dica nasceria dentro do `<td>` e a
 *   `Table` densa, que rola no próprio card, a recortaria — exatamente o
 *   defeito que o rail recolhido tinha.
 *
 * ## Excedente vira menu, não fileira infinita
 *
 * Acima de `maximoVisivel` (3 por padrão) o excedente entra num `DropdownMenu`
 * canônico com o `MoreVertical` — o mesmo desenho que `MembrosList` já usava
 * como precedente. Uma linha com seis ícones lado a lado devolve a poluição que
 * a conversão veio resolver, e o alvo de clique fica pequeno demais.
 */

import * as React from 'react';
import {
  ArrowUpRight,
  Ban,
  Check,
  CheckCheck,
  Copy,
  Eye,
  IdCard,
  MoreVertical,
  PackageCheck,
  PackagePlus,
  Pencil,
  Receipt,
  ShieldOff,
  Trash2,
  Unlock,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '../../utils/cn';
import { IconButton } from '../IconButton';
import { DropdownMenu, type DropdownMenuAction } from '../DropdownMenu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../Tooltip';

// ---------------------------------------------------------------------------
// Vocabulário — a fonte única de "que desenho tem este verbo"
// ---------------------------------------------------------------------------

/**
 * Verbo → ícone. Os verbos saem do inventário de 2026-08-17; os sinônimos que a
 * medição achou estão citados em cada linha para que ninguém crie um verbo novo
 * para dizer o que já existe.
 *
 * Sinônimo de rótulo NÃO vira verbo novo: "Detalhe", "Detalhes", "Ver termos" e
 * "Ver comprovante" são todos `ver` — o que muda é o `label`, que segue livre e
 * é ele que a pessoa lê.
 */
export const ICONES_DE_ACAO = {
  /** Ver/inspecionar sem sair da tela — abre modal, drawer ou popover. */
  ver: Eye,
  /** Sair para outra página (navegação). "Abrir", "Abrir ficha". */
  abrir: ArrowUpRight,
  /** Editar o registro da linha. */
  editar: Pencil,
  /** Apagar de vez. "Remover", "Excluir". */
  remover: Trash2,
  /** Desligar sem apagar. "Desativar", "Encerrar". */
  desativar: Ban,
  /** Cassar acesso ou convite já concedido. "Revogar". */
  revogar: ShieldOff,
  /** Aprovar pedido em fila. */
  aprovar: Check,
  /** Recusar pedido em fila. */
  recusar: X,
  /** Copiar para a área de transferência. "Copiar", "Copiar link". */
  copiar: Copy,
  /** Registrar um lançamento. "Registrar pagamento", "Registrar repasse". */
  registrar: Receipt,
  /** Consulta de PII auditada. "Identificar". */
  identificar: IdCard,
  /** Conceder acesso. "Liberar acesso". */
  liberar: Unlock,
  /** Aplicar um plano/configuração a alguém. */
  aplicar: CheckCheck,
  /** Mexer em lotação/capacidade. */
  capacidade: Users,
  /** Pedir ao fornecedor. "Encomendar". */
  encomendar: PackagePlus,
  /** Dar baixa na entrada. "Receber". */
  receber: PackageCheck,
} as const satisfies Record<string, LucideIcon>;

export type VerboDeAcao = keyof typeof ICONES_DE_ACAO;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RowAction {
  id: string;
  /**
   * O que a ação faz, em português e específico da linha quando possível
   * ("Editar lote Pista", não "Editar"). Vira o `aria-label` do botão E o texto
   * da dica — é o nome acessível, não legenda.
   */
  label: string;
  /** O verbo manda no desenho. O consumidor não escolhe ícone. */
  verbo: VerboDeAcao;
  onClick: () => void;
  /** Tinta de perigo (apagar, recusar, revogar). */
  destructive?: boolean;
  disabled?: boolean;
}

export interface RowActionsProps {
  actions: RowAction[];
  /**
   * Quantos ícones ficam à vista antes de o excedente virar menu. Default 3 —
   * o inventário achou no máximo 4 ações numa linha (`LotesView`), então 3 + menu
   * cobre o produto inteiro sem fileira larga.
   */
  maximoVisivel?: number;
  /** Nome do menu de excedente (ex.: `Mais ações de ${nome}`). */
  menuLabel?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function RowActions({
  actions,
  maximoVisivel = 3,
  menuLabel = 'Mais ações',
  className,
}: RowActionsProps): React.JSX.Element {
  const [menuAberto, setMenuAberto] = React.useState(false);

  // Só vale a pena recolher quando o excedente tem MAIS de um item: com um
  // sobrando, o menu troca um clique por dois para esconder um ícone só.
  const recolhe = actions.length > maximoVisivel + 1;
  const visiveis = recolhe ? actions.slice(0, maximoVisivel) : actions;
  const excedente = recolhe ? actions.slice(maximoVisivel) : [];

  // Espalhamento condicional por causa do `exactOptionalPropertyTypes`: passar
  // `destructive: undefined` NÃO é o mesmo que omitir a prop para o TS.
  const acoesDoMenu: DropdownMenuAction[] = excedente.map((a) => ({
    id: a.id,
    label: a.label,
    onClick: a.onClick,
    ...(a.destructive === undefined ? {} : { destructive: a.destructive }),
    ...(a.disabled === undefined ? {} : { disabled: a.disabled }),
    icon: React.createElement(ICONES_DE_ACAO[a.verbo]),
  }));

  return (
    <TooltipProvider delayDuration={0}>
      <div
        data-row-actions=""
        className={cn('inline-flex items-center justify-end gap-[var(--spacing-1)]', className)}
      >
        {visiveis.map((acao) => {
          const Icone = ICONES_DE_ACAO[acao.verbo];
          return (
            <Tooltip key={acao.id}>
              <TooltipTrigger asChild>
                <IconButton
                  aria-label={acao.label}
                  disabled={acao.disabled}
                  onClick={acao.onClick}
                  className={cn(
                    acao.destructive &&
                      'text-[var(--text-danger)] hover:text-[var(--text-danger)]',
                  )}
                >
                  <Icone aria-hidden />
                </IconButton>
              </TooltipTrigger>
              {/* A dica repete o nome acessível de propósito: ela é o canal
                  VISUAL do rótulo que o ícone sozinho não carrega. */}
              <TooltipContent side="top">{acao.label}</TooltipContent>
            </Tooltip>
          );
        })}

        {excedente.length > 0 && (
          <DropdownMenu
            open={menuAberto}
            onOpenChange={setMenuAberto}
            actions={acoesDoMenu}
            menuLabel={menuLabel}
            align="right"
            trigger={
              <IconButton aria-label={menuLabel}>
                <MoreVertical aria-hidden />
              </IconButton>
            }
          />
        )}
      </div>
    </TooltipProvider>
  );
}

RowActions.displayName = 'RowActions';

export { RowActions };
